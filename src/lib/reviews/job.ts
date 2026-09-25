import { claimJob, finishJob } from "@/lib/prices/history";
import { mailIsConfigured, sendMail } from "@/lib/mail";
import {
  renderInviteMail,
  renderInviteText,
  reviewInviteUrl,
  reviewLogoAttachment,
} from "./invite-mail";
import {
  createInvite,
  findOrderAwaitingInvite,
  invitableOrders,
  type PendingInvite,
} from "./store";

/**
 * De dagelijkse taak die beoordelingsuitnodigingen verstuurt.
 *
 * Dezelfde opzet als de prijsmeting: de dag wordt geclaimd in `job_runs`, dus
 * de cron-taak, de klok in de server en een handmatige aanroep kunnen alle
 * drie binnenkomen en er draait er precies één (docs/DECISIONS.md #14).
 *
 * **Eén mail per bestelling, afgedwongen door de database.** De rij in
 * `reviews` wordt aangemaakt vóórdat de mail de deur uit gaat, met een unieke
 * sleutel op het ordernummer. Mislukt het versturen daarna, dan krijgt die
 * klant geen tweede kans — en dat is de goede kant om op te falen. Twee keer
 * om een beoordeling vragen is vervelender dan één keer niet vragen.
 */

export const REVIEW_JOB = "beoordelingen";

export interface InviteResult {
  skipped: boolean;
  invited: number;
  errors: string[];
  ms: number;
}

/**
 * Hoeveel uitnodigingen er per keer uit mogen.
 *
 * Een mailbox bij een gedeeld hostingpakket heeft een uurlimiet, en de
 * bevestigingsmails van bestellingen gaan over dezelfde mailbox. Die mogen
 * nooit blijven liggen omdat er een stapel beoordelingsverzoeken voor stond.
 */
const MAX_PER_RUN = 25;

export async function runReviewInvites({
  force = false,
  now = new Date(),
}: { force?: boolean; now?: Date } = {}): Promise<InviteResult> {
  const started = Date.now();
  const errors: string[] = [];

  if (!force && !(await claimJob(REVIEW_JOB, now))) {
    return { skipped: true, invited: 0, errors, ms: 0 };
  }

  if (!mailIsConfigured()) {
    // Geen SMTP betekent: niet uitnodigen. Wél een rij aanmaken zou de klant
    // zijn enige uitnodiging kosten zonder dat er ooit een mail kwam.
    const detail = { invited: 0, reason: "smtp-ontbreekt" };
    if (!force) await finishJob(REVIEW_JOB, detail, now);
    return {
      skipped: false,
      invited: 0,
      errors: ["SMTP is niet ingesteld; geen uitnodigingen verstuurd."],
      ms: Date.now() - started,
    };
  }

  const orders = (await invitableOrders(now)).slice(0, MAX_PER_RUN);
  let invited = 0;

  for (const order of orders) {
    try {
      if (await sendInvite(order)) invited++;
    } catch (error) {
      errors.push(
        `${order.reference}: ${error instanceof Error ? error.message : "onbekende fout"}`,
      );
    }
  }

  const result: InviteResult = {
    skipped: false,
    invited,
    errors,
    ms: Date.now() - started,
  };
  if (!force) await finishJob(REVIEW_JOB, { invited, errors }, now);
  return result;
}

/**
 * Eén uitnodiging versturen. `false` betekent: er stond er al een.
 *
 * De rij in `reviews` wordt aangemaakt vóór de mail, met een unieke sleutel
 * op het ordernummer — zie `createInvite`. Mislukt het versturen daarna, dan
 * krijgt die klant geen tweede kans, en dat is met opzet de goede kant om op
 * te falen.
 */
async function sendInvite(order: PendingInvite): Promise<boolean> {
  const token = await createInvite(order.reference, order.email);
  // `null` betekent dat een andere aanroep hem net voor was
  if (!token) return false;

  const logo = await reviewLogoAttachment();
  const locale = order.locale === "en" ? "en" : "nl";
  const input = {
    firstName: order.firstName,
    reference: order.reference,
    path: reviewInviteUrl(locale, token),
    withLogo: logo !== null,
  };

  await sendMail({
    to: order.email,
    subject: `Hoe beviel je bestelling ${order.reference}?`,
    text: renderInviteText(input),
    html: renderInviteMail(input),
    attachments: logo ? [logo] : undefined,
  });
  return true;
}

/**
 * Nu uitnodigen voor één bestelling, buiten de wachttermijn om.
 *
 * Dit is de knop van "ik weet dat het bezorgd is". Alles wat de dagelijkse
 * taak bewaakt blijft staan — betaald, nog geen uitnodiging, en de unieke
 * sleutel die een tweede mail tegenhoudt — alleen het wachten vervalt.
 */
export async function inviteOrderNow(
  reference: string,
): Promise<"ok" | "onbekend" | "al-uitgenodigd" | "geen-smtp"> {
  if (!mailIsConfigured()) return "geen-smtp";
  const order = await findOrderAwaitingInvite(reference);
  if (!order) return "onbekend";
  return (await sendInvite(order)) ? "ok" : "al-uitgenodigd";
}
