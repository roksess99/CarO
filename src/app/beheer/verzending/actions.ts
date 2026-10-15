"use server";

import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/admin/audit";
import { requirePermission } from "@/lib/admin/session";
import { mailIsConfigured, sendMail } from "@/lib/mail";
import { logoAttachment } from "@/lib/orders/notify";
import {
  markTrackingSent,
  readOrder,
  readTracking,
  saveTracking,
} from "@/lib/orders/store";
import {
  customerCarrierName,
  isCarrierId,
  parseTracking,
  trackingLabel,
  trackingUrl,
} from "@/lib/orders/tracking";
import { buildTrackingMail } from "@/lib/orders/tracking-mail";

export type TrackingResult = { error: string } | { ok: string } | undefined;

/**
 * Track & trace opslaan en de klant mailen.
 *
 * De volgorde is dezelfde als bij een terugbetaling (@docs/DECISIONS.md #20):
 * eerst alles keuren, dan de code opslaan, dan het bericht naar buiten, en
 * **pas daarna** aftekenen dat het verstuurd is. Zo kan er nooit "bericht
 * verstuurd" in het scherm staan terwijl de klant niets heeft gehad — en
 * mislukt de mail, dan staat de code er al en is één klik genoeg voor een
 * tweede poging.
 *
 * Een bericht aan een klant is niet terug te draaien. Daarom twee sloten:
 * de bestelling moet betaald zijn, en een tweede bericht over dezelfde
 * bestelling vraagt een bevestiging.
 */
export async function sendTracking(
  _previous: TrackingResult,
  formData: FormData,
): Promise<TrackingResult> {
  const admin = await requirePermission("bestellingen");
  const reference = String(formData.get("reference") ?? "");
  const carrier = String(formData.get("carrier") ?? "");
  const again = formData.get("confirm") === "opnieuw";

  if (!isCarrierId(carrier)) {
    return { error: "Kies een vervoerder." };
  }

  const parsed = parseTracking(String(formData.get("code") ?? ""));
  if ("error" in parsed) return { error: parsed.error };
  const code = parsed.ok.value;

  // Vóór het opslaan vragen, niet erna: SMTP ontbreekt op een machine zonder
  // `.env`, en dan is een opgeslagen code zonder bericht alleen verwarrend.
  if (!mailIsConfigured()) {
    return {
      error: "SMTP is niet ingesteld, dus de klant kan geen bericht krijgen.",
    };
  }

  const current = await readTracking(reference);
  if (!current) return { error: "Deze bestelling bestaat niet." };
  if (current.status !== "paid") {
    return {
      error:
        "Deze bestelling is niet betaald. Een verzendbericht hoort pas als er betaald is.",
    };
  }
  if (current.trackingSentAt && !again) {
    return {
      error:
        "Er is al een verzendbericht verstuurd. Wil je de klant een tweede bericht sturen, bevestig dat dan.",
    };
  }

  const order = await readOrder(reference);
  if (!order) return { error: "Deze bestelling bestaat niet." };

  await saveTracking(reference, code, carrier);

  const url = trackingUrl({
    code,
    carrier,
    address: {
      postcode: order.document.customer.postcode,
      country: order.document.customer.country,
    },
  });

  const mail = await buildTrackingMail(order, {
    url,
    code: trackingLabel(code),
    carrier: customerCarrierName(carrier),
  });

  const logo = await logoAttachment();
  try {
    await sendMail({
      to: order.document.customer.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      attachments: logo ? [logo] : undefined,
    });
  } catch (error) {
    console.error("Verzendbericht kon niet verstuurd worden:", error);
    revalidatePath("/beheer/verzending");
    return {
      error:
        "De code is opgeslagen, maar het bericht kon niet verstuurd worden. Probeer het nog eens.",
    };
  }

  const written = await markTrackingSent(reference);
  await logAction({
    adminId: admin.id,
    action: "verzending.verstuurd",
    subject: reference,
    detail: { carrier, code, link: Boolean(url), opnieuw: again },
  });

  revalidatePath("/beheer/verzending");

  if (!written) {
    // De klant heeft zijn bericht; alleen onze administratie weet het niet.
    // Dat moet luid, want anders stuurt de volgende klik een tweede mail.
    return {
      error:
        "Het bericht is verstuurd, maar de bestelling kon niet als verzonden worden afgetekend. Kijk dat met de hand na voordat je het nog eens probeert.",
    };
  }

  return {
    ok: url
      ? "Verstuurd, met een volglink erin."
      : "Verstuurd. Er zat geen volglink bij, alleen de code.",
  };
}
