import { readFile } from "node:fs/promises";
import path from "node:path";
import { COMPANY } from "@/lib/company";
import { type MailAttachment } from "@/lib/mail";
import { SITE_URL } from "@/lib/site";

/**
 * De uitnodiging om een beoordeling achter te laten.
 *
 * Dezelfde vijf regels als bij de bevestigingsmail (`orders/customer-mail.ts`):
 * tabellen in plaats van flex, opmaak inline, het logo als bijlage via `cid:`,
 * altijd een tekstversie ernaast, en alles wat van buiten komt ge-escaped.
 *
 * **Wat deze mail juridisch is.** Geen reclame maar een vraag over een
 * bestelling die de klant net heeft ontvangen; dat valt onder de
 * klantrelatie. Twee dingen zijn daarbij niet vrijblijvend en staan daarom
 * allebei onderin: er gaat er maar één per bestelling uit, en wie er geen wil
 * mailt terug. Er is geen lijst om je voor uit te schrijven — die bestaat
 * niet (docs/DECISIONS.md #15).
 */

/** Verwijzing waarmee de HTML het meegestuurde logo aanhaalt */
export const LOGO_CID = "caro-lockup";

// Kleuren uit docs/BRAND.md. Geen CSS-variabelen: die kent geen mailclient.
const INK = "#0E1013";
const ORANGE = "#FF6A13";
const ZINC = "#F5F6F7";
const MUTED = "#646b75";
const LINE = "#e5e7e9";
const WHITE = "#ffffff";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Het logo als meegestuurde bijlage, één keer per proces ingelezen.
 *
 * Lukt het lezen niet, dan gaat de mail zonder logo de deur uit in plaats van
 * helemaal niet — zelfde afweging als bij de bevestigingsmail.
 */
let logoCache: MailAttachment | null | undefined;

export async function reviewLogoAttachment(): Promise<MailAttachment | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    const file = path.join(
      process.cwd(),
      "public",
      "brand",
      "caro-lockup-email.png",
    );
    logoCache = {
      filename: "caro.png",
      content: await readFile(file),
      contentType: "image/png",
      cid: LOGO_CID,
    };
  } catch {
    logoCache = null;
  }
  return logoCache;
}

export interface InviteMailInput {
  firstName: string;
  reference: string;
  /** `/nl/beoordelingen/<token>` of de Engelse variant */
  path: string;
  withLogo: boolean;
}

export function reviewInviteUrl(locale: string, token: string): string {
  const segment = locale === "nl" ? "beoordelingen" : "reviews";
  return `${SITE_URL}/${locale}/${segment}/${token}`;
}

export function renderInviteMail(input: InviteMailInput): string {
  const name = escapeHtml(input.firstName);
  const reference = escapeHtml(input.reference);
  const link = escapeHtml(input.path);

  const logo = input.withLogo
    ? `<img src="cid:${LOGO_CID}" alt="CarO" width="120" style="display:block;border:0;">`
    : `<span style="font:700 24px ${FONT};color:${INK};letter-spacing:-0.02em;">CarO</span>`;

  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><title>Hoe ging het?</title></head>
<body style="margin:0;padding:0;background:${ZINC};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${ZINC};padding:24px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${WHITE};border:1px solid ${LINE};border-radius:12px;">
    <tr><td style="padding:24px 24px 0;">${logo}</td></tr>
    <tr><td style="padding:20px 24px 0;">
      <h1 style="margin:0;font:700 22px ${FONT};color:${INK};letter-spacing:-0.02em;">Hoe ging het, ${name}?</h1>
      <p style="margin:12px 0 0;font:400 15px/1.6 ${FONT};color:${INK};">
        Je bestelling <strong>${reference}</strong> is inmiddels bij je. We zijn
        benieuwd hoe het ging — zowel het bestellen op de site als het pakket
        zelf. Het kost je een halve minuut en het helpt de volgende klant.
      </p>
    </td></tr>
    <tr><td style="padding:20px 24px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="background:${ORANGE};border-radius:8px;">
          <a href="${link}" style="display:inline-block;padding:14px 28px;font:700 16px ${FONT};color:${INK};text-decoration:none;">Beoordeling geven</a>
        </td>
      </tr></table>
      <p style="margin:12px 0 0;font:400 13px/1.6 ${FONT};color:${MUTED};">
        Werkt de knop niet? Plak deze link in je browser:<br>
        <span style="word-break:break-all;">${link}</span>
      </p>
    </td></tr>
    <tr><td style="padding:20px 24px 24px;">
      <hr style="border:0;border-top:1px solid ${LINE};margin:0 0 16px;">
      <p style="margin:0;font:400 13px/1.6 ${FONT};color:${MUTED};">
        Je beoordeling komt met je voornaam op de site te staan; je kunt zelf
        kiezen wat eronder komt. Dit is de enige mail die we je hierover
        sturen. Liever geen? Antwoord dan even op dit bericht.
      </p>
      <p style="margin:12px 0 0;font:400 13px/1.6 ${FONT};color:${MUTED};">
        ${escapeHtml(COMPANY.legalName)} · ${escapeHtml(COMPANY.email)}
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

export function renderInviteText(input: InviteMailInput): string {
  return [
    `Hoe ging het, ${input.firstName}?`,
    "",
    `Je bestelling ${input.reference} is inmiddels bij je. We zijn benieuwd hoe`,
    "het ging — zowel het bestellen op de site als het pakket zelf. Het kost je",
    "een halve minuut en het helpt de volgende klant.",
    "",
    input.path,
    "",
    "Je beoordeling komt met je voornaam op de site te staan; je kunt zelf",
    "kiezen wat eronder komt. Dit is de enige mail die we je hierover sturen.",
    "Liever geen? Antwoord dan even op dit bericht.",
    "",
    `${COMPANY.legalName} · ${COMPANY.email}`,
  ].join("\n");
}
