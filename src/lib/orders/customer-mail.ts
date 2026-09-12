import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { COMPANY, companyValue } from "@/lib/company";
import { formatPriceCents } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import type { StoredOrder } from "./types";

/**
 * De bevestigingsmail naar de klant in huisstijl.
 *
 * Vijf regels die anders zijn dan bij een webpagina, en die alle vijf de vorm
 * van dit bestand bepalen:
 *
 * 1. **Tabellen, geen flex of grid.** Outlook op Windows rendert met de
 *    engine van Word en kent alleen tabellen. Dit is geen achterstand die
 *    inhaalt: het is al twintig jaar zo.
 * 2. **Alle opmaak inline.** Gmail gooit een `<style>`-blok weg bij het
 *    doorsturen van een bericht, en sommige clients al bij het tonen.
 * 3. **Eén afbeelding, meegestuurd.** Het logo gaat als bijlage mee en wordt
 *    aangehaald met `cid:` (zie LOGO_CID). Een `<img>` naar caroparts.nl zou
 *    in de meeste clients een grijs vlak zijn tot de lezer op "afbeeldingen
 *    tonen" klikt — precies bij een bevestiging die vertrouwen moet wekken.
 * 4. **Een platte-tekstversie gaat altijd mee** (lib/orders/notify.ts). Een
 *    bericht met alleen HTML scoort slechter bij spamfilters en is onleesbaar
 *    in tekstclients.
 * 5. **Alles wat van buiten komt wordt ge-escaped.** Productnamen komen van de
 *    groothandel en de naam en het adres van de klant zelf.
 */

/** Verwijzing waarmee de HTML het meegestuurde logo aanhaalt */
export const LOGO_CID = "caro-lockup";

// Kleuren uit docs/BRAND.md. Geen CSS-variabelen: die kent geen enkele
// mailclient. De oranje knop krijgt inkt-zwarte tekst, nooit witte — wit op
// oranje haalt 2,87:1 en zakt door elke contrasteis heen.
const INK = "#0E1013";
const ORANGE = "#FF6A13";
const ZINC = "#F5F6F7";
const MUTED = "#646b75";
const LINE = "#e5e7e9";
const WHITE = "#ffffff";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Eén artikelregel zoals de mail hem toont; het label is al samengesteld */
export interface CustomerMailLine {
  label: string;
  quantity: number;
  lineGrossCents: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function url(locale: Locale, href: Parameters<typeof getPathname>[0]["href"]) {
  return `${SITE_URL}${getPathname({ locale, href })}`;
}

function resolveLocale(value: string): Locale {
  return routing.locales.includes(value as Locale)
    ? (value as Locale)
    : routing.defaultLocale;
}

/** Rij in het totalenblok: label links, bedrag rechts */
function totalRow(label: string, value: string, strong = false): string {
  const weight = strong ? "700" : "400";
  const size = strong ? "16px" : "14px";
  const color = strong ? INK : MUTED;
  return `<tr>
    <td style="padding:4px 0;font-family:${FONT};font-size:${size};font-weight:${weight};color:${color};">${label}</td>
    <td align="right" style="padding:4px 0;font-family:${FONT};font-size:${size};font-weight:${weight};color:${INK};white-space:nowrap;">${value}</td>
  </tr>`;
}

export async function renderCustomerMail(
  order: StoredOrder,
  lines: CustomerMailLine[],
): Promise<string> {
  const locale = resolveLocale(order.locale);
  const t = await getTranslations({ locale, namespace: "orderMail.html" });
  const doc = order.document;
  const customer = doc.customer;

  const statusUrl = `${url(locale, "/checkout/status")}?ref=${encodeURIComponent(
    order.reference,
  )}&t=${encodeURIComponent(order.accessToken)}`;

  const addressLines = [
    `${customer.firstName} ${customer.lastName}`,
    [customer.street, customer.houseNumber, customer.houseNumberAddition]
      .filter(Boolean)
      .join(" "),
    `${customer.postcode} ${customer.city}`,
    customer.country === "NL" ? "Nederland" : customer.country,
  ];

  const itemRows = lines
    .map(
      (line) => `<tr>
      <td style="padding:12px 12px 12px 0;border-top:1px solid ${LINE};font-family:${FONT};font-size:14px;line-height:1.5;color:${INK};">
        ${escapeHtml(line.label)}<br>
        <span style="color:${MUTED};font-size:13px;">${escapeHtml(t("quantity"))}: ${line.quantity}</span>
      </td>
      <td align="right" valign="top" style="padding:12px 0;border-top:1px solid ${LINE};font-family:${FONT};font-size:14px;font-weight:700;color:${INK};white-space:nowrap;">
        ${escapeHtml(formatPriceCents(line.lineGrossCents))}
      </td>
    </tr>`,
    )
    .join("");

  const totals = [
    totalRow(
      escapeHtml(t("subtotal")),
      escapeHtml(formatPriceCents(doc.itemsGrossCents)),
    ),
    totalRow(
      escapeHtml(t("shipping")),
      doc.shippingIsFree
        ? escapeHtml(t("free"))
        : escapeHtml(formatPriceCents(doc.shippingGrossCents)),
    ),
    totalRow(
      escapeHtml(t("vat", { percent: doc.vatPercent })),
      escapeHtml(formatPriceCents(doc.totalVatCents)),
    ),
  ].join("");

  // Bedrijfsgegevens die nog een plaatshouder zijn vallen weg in plaats van
  // dat er "PLACEHOLDER" in een klantmail belandt (lib/company.ts).
  const legal = [
    companyValue(COMPANY.cocNumber) ? t("coc", { value: COMPANY.cocNumber }) : "",
    companyValue(COMPANY.vatNumber) ? t("vatNumber", { value: COMPANY.vatNumber }) : "",
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" &middot; ");

  const footerLink = (href: string, label: string) =>
    `<a href="${href}" style="color:${WHITE};text-decoration:underline;">${escapeHtml(label)}</a>`;

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(t("eyebrow"))} ${escapeHtml(order.reference)}</title>
</head>
<body style="margin:0;padding:0;background-color:${ZINC};">
<!-- Voorvertoningstekst: dit is wat de klant in zijn inbox naast het
     onderwerp ziet. Zonder dit pakt de client de eerste tekst uit de mail,
     en dat is hier het woordmerk. -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(
    t("preheader", { reference: order.reference }),
  )}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${ZINC};">
<tr><td align="center" style="padding:24px 12px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${WHITE};border-radius:12px;overflow:hidden;">

  <tr>
    <td style="background-color:${INK};padding:24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <img src="cid:${LOGO_CID}" width="150" alt="${escapeHtml(COMPANY.name)}" style="display:block;width:150px;height:auto;border:0;">
          </td>
          <td align="right" style="font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1.4px;color:#9aa1aa;text-transform:uppercase;">
            ${escapeHtml(t("eyebrow"))}
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:32px 24px 8px 24px;">
      <h1 style="margin:0 0 12px 0;font-family:${FONT};font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-0.02em;color:${INK};">
        ${escapeHtml(t("greeting", { name: customer.firstName }))}
      </h1>
      <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.6;color:${MUTED};">
        ${escapeHtml(t("intro"))}
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:20px 24px 4px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background-color:${ORANGE};border-radius:8px;">
            <a href="${statusUrl}" style="display:inline-block;padding:14px 24px;font-family:${FONT};font-size:15px;font-weight:700;color:${INK};text-decoration:none;">
              ${escapeHtml(t("viewOrder"))}
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:20px 24px 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${ZINC};border-radius:8px;">
        <!-- white-space:nowrap op beide cellen: op 375px brak het ordernummer
             anders middenin af en viel "Totaal betaald" over twee regels. -->
        <tr>
          <td style="padding:14px 16px;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};white-space:nowrap;">
            ${escapeHtml(t("orderNumber"))}<br>
            <span style="font-size:15px;font-weight:700;color:${INK};">${escapeHtml(order.reference)}</span>
          </td>
          <td align="right" style="padding:14px 16px;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};white-space:nowrap;">
            ${escapeHtml(t("total"))}<br>
            <span style="font-size:15px;font-weight:700;color:${INK};">${escapeHtml(formatPriceCents(doc.totalGrossCents))}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:28px 24px 0 24px;">
      <h2 style="margin:0 0 4px 0;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1.4px;color:${MUTED};text-transform:uppercase;">
        ${escapeHtml(t("itemsHeading"))}
      </h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${itemRows}
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:16px 24px 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid ${INK};">
        <tr><td colspan="2" style="height:8px;line-height:8px;">&nbsp;</td></tr>
        ${totals}
        ${totalRow(escapeHtml(t("total")), escapeHtml(formatPriceCents(doc.totalGrossCents)), true)}
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:28px 24px 0 24px;">
      <h2 style="margin:0 0 8px 0;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1.4px;color:${MUTED};text-transform:uppercase;">
        ${escapeHtml(t("addressHeading"))}
      </h2>
      <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${INK};">
        ${addressLines.filter(Boolean).map(escapeHtml).join("<br>")}
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:24px 24px 28px 24px;">
      <p style="margin:0 0 6px 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};">
        ${escapeHtml(t("pdfNote"))}
      </p>
      <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};">
        ${escapeHtml(t("returnsNote"))}
      </p>
    </td>
  </tr>

  <tr>
    <td style="background-color:${INK};padding:24px;">
      <p style="margin:0 0 4px 0;font-family:${FONT};font-size:14px;font-weight:700;color:${WHITE};">
        ${escapeHtml(t("helpHeading"))}
      </p>
      <p style="margin:0 0 18px 0;font-family:${FONT};font-size:13px;line-height:1.6;color:#9aa1aa;">
        ${escapeHtml(t("helpBody"))}
        <a href="mailto:${COMPANY.email}" style="color:${WHITE};text-decoration:underline;">${escapeHtml(COMPANY.email)}</a>
      </p>
      <p style="margin:0 0 14px 0;font-family:${FONT};font-size:13px;line-height:2;color:${WHITE};">
        ${footerLink(url(locale, "/"), t("linkShop"))}
        <span style="color:#5a6068;">&nbsp;&middot;&nbsp;</span>
        ${footerLink(url(locale, "/faq"), t("linkFaq"))}
        <span style="color:#5a6068;">&nbsp;&middot;&nbsp;</span>
        ${footerLink(url(locale, "/contact"), t("linkContact"))}
      </p>
      <p style="margin:0;font-family:${FONT};font-size:11px;line-height:1.6;color:#767C85;">
        ${escapeHtml(COMPANY.legalName)}${legal ? ` &middot; ${legal}` : ""}
      </p>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>`;
}
