"use server";

import { COMPANY } from "@/lib/company";
import { formatPriceCents } from "@/lib/format";
import { sendMail } from "@/lib/mail";
import type { StoredOrder } from "@/lib/orders/types";
import { callerKey, withinLimit } from "@/lib/rate-limit";
import {
  refundFor,
  returnableLines,
  withdrawalDeadline,
  type RefundBreakdown,
} from "@/lib/returns/eligibility";
import {
  describeOrder,
  verifyOrder,
  type LookupResult,
} from "@/lib/returns/lookup";
import { createReturn, hasOpenReturn, returnedQuantities } from "@/lib/returns/store";
import {
  RETURN_REASONS,
  returnIsOurFault,
  type ReturnReason,
} from "@/lib/returns/types";

/**
 * Het retourformulier: opzoeken en aanmelden.
 *
 * Wie er mag opzoeken en waarom dat twee gegevens vraagt, staat in
 * `lib/returns/lookup.ts`. Hier staat wat de browser mag insturen — en dat is
 * alleen een keuze: welk artikel, hoeveel, waarom. **De bedragen worden
 * opnieuw uitgerekend uit de database**, uit wat de klant destijds betaalde.
 * Zelfde regel als bij het afrekenen: een bedrag dat geld beweegt komt nooit
 * uit de browser (CLAUDE.md).
 */

/** Zoeken mag vaker dan versturen: wie zijn adres verkeerd typt is geen
 * aanvaller, en twintig pogingen per uur raadt geen ordernummer. */
const LOOKUP_LIMIT = { bucket: "retour-zoeken", max: 20 } as const;
const SUBMIT_LIMIT = { bucket: "retour-melden", max: 5 } as const;

export async function lookupOrderAction(
  _previous: LookupResult,
  formData: FormData,
): Promise<LookupResult> {
  if (!withinLimit(await callerKey(), LOOKUP_LIMIT)) {
    return { status: "rateLimit" };
  }

  try {
    const order = await verifyOrder({
      reference: String(formData.get("reference") ?? ""),
      email: String(formData.get("email") ?? ""),
      token: String(formData.get("token") ?? "") || undefined,
    });
    if (!order) return { status: "unknown" };
    return await describeOrder(order);
  } catch (error) {
    console.error("Retour opzoeken mislukt:", error);
    return { status: "error" };
  }
}

export interface SubmitResult {
  status:
    | "idle"
    | "done"
    | "unknown"
    /** Er liep al een retour op deze bestelling */
    | "openReturn"
    | "empty"
    | "rateLimit"
    | "error";
  /** Het retournummer dat bij het pakket moet */
  reference?: string;
  /** Wat er terugkomt, om meteen te tonen */
  amountCents?: number;
}

function reasonOf(value: unknown): ReturnReason | null {
  return RETURN_REASONS.includes(value as ReturnReason)
    ? (value as ReturnReason)
    : null;
}

export async function submitReturnAction(
  _previous: SubmitResult,
  formData: FormData,
): Promise<SubmitResult> {
  if (!withinLimit(await callerKey(), SUBMIT_LIMIT)) {
    return { status: "rateLimit" };
  }

  const reason = reasonOf(formData.get("reason"));
  if (!reason) return { status: "error" };

  try {
    const order = await verifyOrder({
      reference: String(formData.get("reference") ?? ""),
      email: String(formData.get("email") ?? ""),
      token: String(formData.get("token") ?? "") || undefined,
    });
    if (!order || order.status !== "paid") return { status: "unknown" };
    // Vroege uitstap zodat we geen werk doen voor een aanvraag die tóch
    // afketst. Het echte slot zit in `createReturn` zelf: tussen deze lezing
    // en het wegschrijven past een tweede verzoek.
    if (await hasOpenReturn(order.reference)) return { status: "openReturn" };

    const done = await returnedQuantities(order.reference);
    const lines = returnableLines(order, done);

    const selection = new Map<string, number>();
    for (const line of lines) {
      const raw = Number(formData.get(`qty-${line.partId}`) ?? 0);
      if (Number.isFinite(raw) && raw > 0) {
        selection.set(line.partId, Math.min(Math.trunc(raw), line.returnable));
      }
    }

    const refund = refundFor(order, lines, selection);
    if (refund.lines.length === 0) return { status: "empty" };

    const note = String(formData.get("note") ?? "")
      .trim()
      .slice(0, 1000);
    const created = await createReturn({
      orderReference: order.reference,
      emailKey: order.document.customer.email,
      reason,
      note: note || null,
      itemsCents: refund.itemsCents,
      shippingCents: refund.shippingCents,
      lines: refund.lines,
    });
    // Twee verzoeken tegelijk: het tweede heeft op de orderrij staan wachten
    // en ziet nu het retour van het eerste. Er is niets weggeschreven, dus ook
    // geen mail versturen.
    if (!created.ok) return { status: "openReturn" };

    await notify({ order, reference: created.reference, reason, refund, note });

    return {
      status: "done",
      reference: created.reference,
      amountCents: refund.totalCents,
    };
  } catch (error) {
    console.error("Retour aanmelden mislukt:", error);
    return { status: "error" };
  }
}

const REASON_LABEL: Record<ReturnReason, string> = {
  withdrawal: "bedenktijd (herroeping)",
  wrong: "verkeerd artikel geleverd",
  damaged: "beschadigd aangekomen",
  defect: "defect / garantie",
};

/**
 * Twee mails: een bevestiging met het retournummer naar de klant, en de
 * melding aan de beheerder.
 *
 * **Mislukt de mail, dan blijft het retour staan.** De aanvraag is al
 * weggeschreven en dat is wat telt — de wettelijke termijn van veertien dagen
 * begint bij de melding, niet bij de bevestiging. De klant ziet zijn
 * retournummer op het scherm, dus hij kan verder ook zonder mail.
 */
async function notify(input: {
  order: StoredOrder;
  reference: string;
  reason: ReturnReason;
  refund: RefundBreakdown;
  note: string;
}): Promise<void> {
  const { order, reference, reason, refund, note } = input;
  const customer = order.document.customer;
  const deadline = withdrawalDeadline(order);

  try {
    await sendMail({
      to: customer.email,
      subject: `Retouraanvraag ${reference} ontvangen`,
      text: [
        `Hoi ${customer.firstName},`,
        "",
        `We hebben je retouraanvraag voor bestelling ${order.reference} ontvangen.`,
        "",
        `Retournummer:       ${reference}`,
        `Terug te ontvangen: ${formatPriceCents(refund.totalCents)}`,
        "",
        ...refund.lines.map((line) => `${line.quantity}x ${line.name}`),
        "",
        "Schrijf het retournummer bij het pakket of leg deze mail erbij, en",
        "gebruik het retourlabel dat bij je bestelling zat.",
        "",
        "Zodra het pakket binnen is boeken we het bedrag terug op de rekening",
        "waarmee je betaald hebt, binnen veertien dagen.",
        "",
        `Vragen? Mail ons op ${COMPANY.email}.`,
        "",
        COMPANY.name,
      ].join("\n"),
    });
  } catch (error) {
    console.error("Retourbevestiging kon niet verzonden worden:", error);
  }

  try {
    await sendMail({
      to: process.env.ORDER_ADMIN_EMAIL || COMPANY.email,
      replyTo: customer.email,
      subject: `Retouraanvraag ${reference} — ${formatPriceCents(refund.totalCents)}`,
      text: [
        `Bestelling:  ${order.reference}`,
        `Reden:       ${REASON_LABEL[reason]}`,
        `Artikelen:   ${formatPriceCents(refund.itemsCents)}`,
        `Verzending:  ${
          refund.shippingCents > 0
            ? `${formatPriceCents(refund.shippingCents)} (hele bestelling terug)`
            : "gaat niet mee terug (deel van de bestelling)"
        }`,
        `Retourzending betaalt: ${returnIsOurFault(reason) ? "wij" : "de klant"}`,
        deadline
          ? `Bedenktijd tot: ${deadline.toLocaleDateString("nl-NL")} (gerekend vanaf de betaling, niet vanaf ontvangst)`
          : "Bedenktijd: onbekend, geen betaaldatum",
        "",
        ...refund.lines.map(
          (line) =>
            `${line.quantity}x ${line.name} — ${formatPriceCents(line.lineGrossCents)}`,
        ),
        "",
        note ? `Toelichting van de klant:\n${note}` : "Geen toelichting.",
        "",
        "Afhandelen in het paneel: /beheer/retouren",
      ].join("\n"),
    });
  } catch (error) {
    console.error("Retourmelding aan de beheerder mislukte:", error);
  }
}
