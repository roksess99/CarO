"use server";

import {
  type ContactField,
  HONEYPOT_FIELD,
  validateContact,
} from "@/lib/contact/schema";
import { sendMail } from "@/lib/mail";
import { callerKey, withinLimit } from "@/lib/rate-limit";

export interface ContactState {
  status: "idle" | "sent" | "error";
  /** Veld → vertaalsleutel onder `contact.errors` */
  fieldErrors?: Partial<Record<ContactField, string>>;
  /** Vertaalsleutel onder `contact.errors` voor een fout buiten de velden */
  error?: "rateLimit" | "send";
}

/** Vijf berichten per uur per afzender; de rem zelf staat in lib/rate-limit */
const LIMIT = { bucket: "contact", max: 5 } as const;

export async function sendContactMessageAction(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  // Honeypot: gevuld = bot. "Verzonden" antwoorden en niets doen, zodat hij
  // niet doorheeft dat hij gefilterd is.
  if ((formData.get(HONEYPOT_FIELD) as string | null)?.trim()) {
    return { status: "sent" };
  }

  const result = validateContact({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!result.success) {
    return { status: "error", fieldErrors: result.fieldErrors };
  }

  if (!withinLimit(await callerKey(), LIMIT)) {
    return { status: "error", error: "rateLimit" };
  }

  const { name, email, subject, message } = result.data;

  try {
    await sendMail({
      // Het onderwerp van de bezoeker staat in de titel, met een vast
      // voorvoegsel zodat een mailfilter deze berichten kan herkennen.
      subject: `[Contactformulier] ${subject}`,
      replyTo: email,
      text: [
        `Naam:    ${name}`,
        `E-mail:  ${email}`,
        `Onderwerp: ${subject}`,
        "",
        message,
      ].join("\n"),
    });
  } catch (error) {
    // De inhoud van het bericht komt nooit in een logregel: dat is wat een
    // bezoeker ons vertrouwelijk stuurt, en logs worden breder gelezen dan
    // de mailbox.
    console.error(
      "Contactformulier kon niet verzonden worden:",
      error instanceof Error ? error.message : error,
    );
    return { status: "error", error: "send" };
  }

  return { status: "sent" };
}
