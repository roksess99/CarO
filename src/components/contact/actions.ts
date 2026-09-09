"use server";

import { headers } from "next/headers";
import {
  type ContactField,
  HONEYPOT_FIELD,
  validateContact,
} from "@/lib/contact/schema";
import { sendMail } from "@/lib/mail";

export interface ContactState {
  status: "idle" | "sent" | "error";
  /** Veld → vertaalsleutel onder `contact.errors` */
  fieldErrors?: Partial<Record<ContactField, string>>;
  /** Vertaalsleutel onder `contact.errors` voor een fout buiten de velden */
  error?: "rateLimit" | "send";
}

/**
 * Eenvoudige rem: hoeveel berichten één afzender per uur mag sturen.
 *
 * Bewust in het geheugen en niet in een database — die is er nog niet, en
 * een contactformulier is het niet waard er een op te tuigen. De gevolgen
 * daarvan, expliciet: de teller begint opnieuw bij elke herstart, en op meer
 * dan één instantie telt elke instantie apart. Het is een drempel tegen een
 * losgeslagen script, geen sluitende beveiliging. Het honeypot-veld vangt de
 * domme bots; dit vangt het herhalen.
 */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function withinLimit(key: string): boolean {
  const now = Date.now();
  const times = (recent.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (times.length >= MAX_PER_WINDOW) {
    recent.set(key, times);
    return false;
  }
  times.push(now);
  recent.set(key, times);
  // De map mag niet oneindig groeien als er dagenlang verkeer op staat
  if (recent.size > 5000) {
    for (const [otherKey, otherTimes] of recent) {
      if (otherTimes.every((at) => now - at >= WINDOW_MS)) recent.delete(otherKey);
    }
  }
  return true;
}

/** Het adres van de bezoeker, alleen om te tellen — het wordt niet bewaard */
async function callerKey(): Promise<string> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || list.get("x-real-ip") || "onbekend";
}

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

  if (!withinLimit(await callerKey())) {
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
