"use server";

import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/admin/audit";
import { requirePermission } from "@/lib/admin/session";
import { formatPriceCents } from "@/lib/format";
import { sendMail } from "@/lib/mail";
import { COMPANY } from "@/lib/company";
import { createRefund, MollieError, mollieIsConfigured } from "@/lib/mollie/client";
import { readOrder } from "@/lib/orders/store";
import {
  markReturnReceived,
  markReturnRefunded,
  readReturn,
  rejectReturn,
} from "@/lib/returns/store";
import { returnAmountCents } from "@/lib/returns/types";

export type ReturnAdminResult = { error: string } | { ok: string } | undefined;

/** Pakket binnen. Daarna mag de knop "terugbetalen". */
export async function receiveReturn(
  _previous: ReturnAdminResult,
  formData: FormData,
): Promise<ReturnAdminResult> {
  const admin = await requirePermission("retouren");
  const reference = String(formData.get("reference") ?? "");

  if (!(await markReturnReceived(reference, admin.id))) {
    return { error: "Dit retour stond al verder in de behandeling." };
  }

  await logAction({
    adminId: admin.id,
    action: "retour.ontvangen",
    subject: reference,
  });
  revalidatePath("/beheer/retouren");
  return { ok: "Genoteerd als ontvangen." };
}

/**
 * Terugbetalen. **Dit is de enige knop in het paneel die geld verplaatst.**
 *
 * Vier dingen staan hier met opzet in deze volgorde:
 *
 * 1. Het bedrag komt uit de database, niet uit het formulier. Wat de browser
 *    mag meesturen is hoogstens een lágere waarde (bijvoorbeeld als een
 *    artikel beschadigd terugkomt), nooit een hogere.
 * 2. Mollie eerst, de database daarna. Andersom zou een mislukte terugboeking
 *    als "terugbetaald" in de administratie staan — en dan wacht de klant op
 *    geld dat nooit komt.
 * 3. Het retournummer gaat als idempotentiesleutel mee, zodat twee tabbladen
 *    samen één terugboeking opleveren.
 * 4. Lukt Mollie wél maar de database niet, dan is dat een fout die je moet
 *    kunnen zien: het `re_…`-kenmerk komt in het logboek, ook als de rij niet
 *    bijgewerkt kon worden.
 */
export async function refundReturn(
  _previous: ReturnAdminResult,
  formData: FormData,
): Promise<ReturnAdminResult> {
  const admin = await requirePermission("retouren");
  const reference = String(formData.get("reference") ?? "");

  if (!mollieIsConfigured()) {
    return { error: "Er is geen Mollie-sleutel ingesteld, dus terugbetalen kan niet." };
  }

  const entry = await readReturn(reference);
  if (!entry) return { error: "Dit retour bestaat niet." };
  if (entry.status === "refunded") {
    return { error: "Dit retour is al terugbetaald." };
  }
  if (entry.status === "rejected") {
    return { error: "Dit retour is afgewezen." };
  }

  const full = returnAmountCents(entry);
  // Een lager bedrag mag: een artikel dat beschadigd terugkomt is minder waard
  // (art. 6:230s lid 3 BW laat waardevermindering in mindering brengen). Hoger
  // mag nooit — dan zou het paneel meer terugbetalen dan er besteld is.
  const asked = Number(formData.get("amount") ?? full);
  const cents = Number.isFinite(asked)
    ? Math.min(Math.max(1, Math.round(asked)), full)
    : full;

  const order = await readOrder(entry.orderReference);
  if (!order?.paymentId) {
    return { error: "Bij deze bestelling staat geen betaling; terugboeken kan niet." };
  }

  let refundId: string;
  try {
    const refund = await createRefund({
      paymentId: order.paymentId,
      amountCents: cents,
      description: `Retour ${entry.reference} bij bestelling ${entry.orderReference}`,
      reference: entry.reference,
    });
    refundId = refund.id;
  } catch (error) {
    const detail =
      error instanceof MollieError ? error.message : "onbekende fout";
    console.error("Terugbetaling mislukt:", detail);
    await logAction({
      adminId: admin.id,
      action: "retour.terugbetaling-mislukt",
      subject: reference,
      detail: { cents },
    });
    return { error: `Mollie weigerde de terugbetaling (${detail}).` };
  }

  const written = await markReturnRefunded(reference, admin.id, refundId, cents);
  await logAction({
    adminId: admin.id,
    action: "retour.terugbetaald",
    subject: reference,
    detail: { cents, refundId, written },
  });

  if (!written) {
    // Het geld is weg, de rij niet bijgewerkt. Dat moet luid zijn.
    return {
      error: `Let op: Mollie heeft ${formatPriceCents(cents)} teruggeboekt (${refundId}), maar de status kon niet worden bijgewerkt. Werk hem met de hand bij.`,
    };
  }

  await tellCustomer(entry.emailKey, entry.reference, cents);
  revalidatePath("/beheer/retouren");
  revalidatePath("/beheer");
  return { ok: `${formatPriceCents(cents)} teruggeboekt.` };
}

/** Afwijzen, met een reden die in de database én in het logboek komt. */
export async function declineReturn(
  _previous: ReturnAdminResult,
  formData: FormData,
): Promise<ReturnAdminResult> {
  const admin = await requirePermission("retouren");
  const reference = String(formData.get("reference") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (reason.length < 5) {
    return { error: "Geef een reden op; die wordt vastgelegd." };
  }
  if (!(await rejectReturn(reference, admin.id, reason))) {
    return { error: "Dit retour is al afgehandeld." };
  }

  await logAction({
    adminId: admin.id,
    action: "retour.afgewezen",
    subject: reference,
    detail: { reason },
  });
  revalidatePath("/beheer/retouren");
  revalidatePath("/beheer");
  return { ok: "Afgewezen. Laat de klant even weten waarom." };
}

/**
 * De klant vertellen dat het geld onderweg is.
 *
 * Mislukt die mail, dan is dat geen fout in de terugbetaling: het geld is al
 * weg en de klant ziet het op zijn rekening. Alleen loggen dus.
 */
async function tellCustomer(
  email: string,
  reference: string,
  cents: number,
): Promise<void> {
  try {
    await sendMail({
      to: email,
      subject: `Retour ${reference} terugbetaald`,
      text: [
        "Hoi,",
        "",
        `We hebben ${formatPriceCents(cents)} teruggeboekt voor retour ${reference}.`,
        "Het bedrag gaat terug naar de rekening waarmee je betaald hebt.",
        "Afhankelijk van je bank staat het er binnen een paar werkdagen op.",
        "",
        `Vragen? Mail ons op ${COMPANY.email}.`,
        "",
        COMPANY.name,
      ].join("\n"),
    });
  } catch (error) {
    console.error("Mail over de terugbetaling kon niet verzonden worden:", error);
  }
}
