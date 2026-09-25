"use server";

import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/admin/audit";
import { requirePermission } from "@/lib/admin/session";
import { inviteOrderNow, runReviewInvites } from "@/lib/reviews/job";
import {
  findReview,
  hideReview,
  replyToReview,
  unhideReview,
} from "@/lib/reviews/store";

export type ReviewAdminResult = { error: string } | { ok: string } | undefined;

export async function postReply(
  _previous: ReviewAdminResult,
  formData: FormData,
): Promise<ReviewAdminResult> {
  const admin = await requirePermission("beoordelingen");
  const id = Number(formData.get("id"));
  const reply = String(formData.get("reply") ?? "").trim().slice(0, 2000);

  if (!Number.isInteger(id)) return { error: "Onbekende beoordeling." };
  if (!reply) return { error: "Schrijf eerst een antwoord." };
  if (!(await replyToReview(id, reply))) {
    return { error: "Die beoordeling bestaat niet of is nog niet ingevuld." };
  }

  await logAction({
    adminId: admin.id,
    action: "beoordeling.beantwoord",
    detail: { id },
  });
  revalidatePath("/beheer/beoordelingen");
  revalidatePath("/[locale]/reviews", "page");
  return { ok: "Je antwoord staat erbij." };
}

/**
 * Verbergen mag alleen bij misbruik, en nooit omdat het cijfer laag is.
 *
 * Daarom is de reden verplicht: hij komt in de database én in het logboek, en
 * dat is precies het bewijs dat je nodig hebt als iemand ooit vraagt of je
 * beoordelingen filtert. Negatieve beoordelingen wegfilteren is een
 * oneerlijke handelspraktijk (Omnibus-richtlijn, de ACM handhaaft erop).
 */
export async function hide(
  _previous: ReviewAdminResult,
  formData: FormData,
): Promise<ReviewAdminResult> {
  const admin = await requirePermission("beoordelingen");
  const id = Number(formData.get("id"));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 190);

  if (!Number.isInteger(id)) return { error: "Onbekende beoordeling." };
  if (reason.length < 5) {
    return { error: "Geef een reden op; die wordt vastgelegd." };
  }

  const review = await findReview(id);
  if (!review) return { error: "Die beoordeling bestaat niet meer." };
  if (!(await hideReview(id, reason))) {
    return { error: "Die beoordeling stond al verborgen." };
  }

  await logAction({
    adminId: admin.id,
    action: "beoordeling.verborgen",
    subject: review.orderReference,
    detail: { id, reason, shopRating: review.shopRating, orderRating: review.orderRating },
  });
  revalidatePath("/beheer/beoordelingen");
  revalidatePath("/[locale]/reviews", "page");
  return { ok: "Verborgen, met de reden erbij." };
}

export async function unhide(
  _previous: ReviewAdminResult,
  formData: FormData,
): Promise<ReviewAdminResult> {
  const admin = await requirePermission("beoordelingen");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Onbekende beoordeling." };
  if (!(await unhideReview(id))) return { error: "Die stond al zichtbaar." };

  await logAction({
    adminId: admin.id,
    action: "beoordeling.getoond",
    detail: { id },
  });
  revalidatePath("/beheer/beoordelingen");
  revalidatePath("/[locale]/reviews", "page");
  return { ok: "Weer zichtbaar." };
}

/**
 * De uitnodigingen nu versturen in plaats van wachten op de dagelijkse taak.
 *
 * Beide parameters komen van `useActionState` en worden hier niet gebruikt:
 * deze knop heeft geen invoer, alleen een bevestiging terug.
 */
export async function inviteNow(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- vaste handtekening van useActionState
  _previous: ReviewAdminResult,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- deze knop heeft geen invoer
  _formData: FormData,
): Promise<ReviewAdminResult> {
  const admin = await requirePermission("beoordelingen");
  const result = await runReviewInvites({ force: true });

  await logAction({
    adminId: admin.id,
    action: "beoordeling.uitgenodigd",
    detail: { invited: result.invited, errors: result.errors.length },
  });
  revalidatePath("/beheer/beoordelingen");

  if (result.errors.length > 0) {
    return { error: result.errors.join(" · ") };
  }
  return {
    ok:
      result.invited === 0
        ? "Geen bestellingen die aan een uitnodiging toe zijn."
        : `${result.invited} uitnodiging${result.invited === 1 ? "" : "en"} verstuurd.`,
  };
}

/**
 * Eén bestelling nu uitnodigen, zonder de wachttermijn af te wachten.
 *
 * **Waarom deze knop er is.** "Nu uitnodigen" hiernaast slaat alleen de
 * dagclaim over, niet het wachten: hij verstuurt wat tóch al aan de beurt
 * was. GEVONDEN 2026-09-25 doordat de eigenaar erop drukte en er niets
 * gebeurde — zijn twee betaalde bestellingen zijn pas op 4 en 8 oktober aan
 * de beurt, dus de knop meldde terecht "geen bestellingen". Alleen deed hij
 * daarmee niet wat docs/DECISIONS.md #18 belooft: *"een knop Nu uitnodigen
 * voor als hij weet dat het bezorgd is."*
 *
 * Per bestelling en niet in bulk, want dat is precies wat die belofte zegt:
 * de beheerder weet van déze zending dat hij er is.
 */
export async function inviteOrder(
  _previous: ReviewAdminResult,
  formData: FormData,
): Promise<ReviewAdminResult> {
  const admin = await requirePermission("beoordelingen");
  const reference = String(formData.get("reference") ?? "").trim();
  if (!reference) return { error: "Onbekende bestelling." };

  let outcome: Awaited<ReturnType<typeof inviteOrderNow>>;
  try {
    outcome = await inviteOrderNow(reference);
  } catch (error) {
    console.error("Uitnodiging versturen mislukt:", error);
    return { error: "De mail is niet verstuurd. Kijk in de serverlog." };
  }

  if (outcome === "geen-smtp") {
    return { error: "SMTP staat niet ingesteld; er is niets verstuurd." };
  }
  if (outcome === "onbekend") {
    return { error: "Die bestelling is niet betaald of staat er niet meer." };
  }
  if (outcome === "al-uitgenodigd") {
    return { error: "Voor die bestelling is al een uitnodiging verstuurd." };
  }

  await logAction({
    adminId: admin.id,
    action: "beoordeling.uitgenodigd",
    subject: reference,
    detail: { invited: 1, handmatig: true },
  });
  revalidatePath("/beheer/beoordelingen");
  return { ok: `Uitnodiging verstuurd voor ${reference}.` };
}
