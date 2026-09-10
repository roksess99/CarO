import nodemailer, { type Transporter } from "nodemailer";
import { COMPANY } from "@/lib/company";

/**
 * Uitgaande mail via de eigen mailbox (SMTP bij de hostingpartij).
 *
 * Vier variabelen in `.env`, geen ervan met `NEXT_PUBLIC_`:
 *
 * | Variabele | Voorbeeld |
 * |---|---|
 * | `SMTP_HOST` | `smtp.hostinger.com` |
 * | `SMTP_PORT` | `465` (SSL) of `587` (STARTTLS) |
 * | `SMTP_USER` | `info@caroparts.nl` |
 * | `SMTP_PASSWORD` | het wachtwoord van díe mailbox |
 *
 * Ontbreekt er één, dan weigert `sendMail` — er is geen stille modus die doet
 * alsof het gelukt is. Een contactformulier dat "verzonden!" zegt terwijl er
 * niets aankomt is erger dan een formulier dat eerlijk zegt dat het niet lukt.
 */

const REQUIRED = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"] as const;

export function mailIsConfigured(): boolean {
  return REQUIRED.every((key) => (process.env[key] ?? "").length > 0);
}

// Eén transporter voor het hele proces. Nodemailer houdt de verbinding aan;
// er per verzoek een nieuwe maken kost bij elke mail een TLS-handshake.
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;
  const port = Number(process.env.SMTP_PORT);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // Poort 465 spreekt meteen TLS; 587 begint zonder en schakelt over met
    // STARTTLS. Dat verkeerd zetten geeft een verbinding die blijft hangen.
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    // Zonder deze drie wacht nodemailer minutenlang op een server die niet
    // antwoordt — GEMETEN met een half kapotte testserver — en blijft het
    // formulier al die tijd op "Bezig met versturen…" staan. Tien seconden
    // is ruim voor een SMTP-handshake; wat langer duurt gaat toch mis.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

export interface MailAttachment {
  filename: string;
  content: Uint8Array;
  contentType: string;
}

export interface MailMessage {
  subject: string;
  text: string;
  /** Adres waar een antwoord heen moet; niet de afzender */
  replyTo?: string;
  /** Ontvanger; standaard onze eigen mailbox */
  to?: string;
  attachments?: MailAttachment[];
}

/**
 * Stuurt een bericht. Zonder `to` gaat het naar de eigen mailbox.
 *
 * **De afzender is altijd onze eigen mailbox, nooit de bezoeker.** Zou daar
 * het adres van de invuller staan, dan verstuurt onze server mail namens een
 * domein waar hij niets mee te maken heeft: SPF en DKIM kloppen dan niet en
 * het bericht belandt in spam of wordt geweigerd. Het adres van de bezoeker
 * gaat mee als `Reply-To`, zodat "beantwoorden" gewoon bij hem uitkomt.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  if (!mailIsConfigured()) {
    throw new Error(
      `SMTP is niet ingesteld: ${REQUIRED.filter((key) => !process.env[key]).join(", ")} ontbreekt`,
    );
  }

  await getTransporter().sendMail({
    from: { name: COMPANY.name, address: process.env.SMTP_USER as string },
    to: message.to ?? COMPANY.email,
    replyTo: message.replyTo,
    subject: message.subject,
    text: message.text,
    // Nodemailer wil een Buffer of een stream; de PDF komt als Uint8Array
    // uit pdf-lib, dus hier één keer omzetten in plaats van bij elke aanroep.
    attachments: message.attachments?.map((file) => ({
      filename: file.filename,
      content: Buffer.from(file.content),
      contentType: file.contentType,
    })),
  });
}
