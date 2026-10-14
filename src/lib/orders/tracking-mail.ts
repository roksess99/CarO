import { getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { COMPANY, companyValue } from "@/lib/company";
import { SITE_URL } from "@/lib/site";
import {
  escapeHtml,
  FONT,
  INK,
  LINE,
  MONO,
  MUTED,
  ORANGE,
  WHITE,
  ZINC,
} from "./mail-style";
import { LOGO_CID } from "./customer-mail";
import type { StoredOrder } from "./types";

/**
 * Het verzendbericht: "je pakket is onderweg", met de track & trace erin.
 *
 * De vijf regels uit `customer-mail.ts` gelden hier net zo — tabellen, opmaak
 * inline, één meegestuurde afbeelding, altijd een tekstversie ernaast, en
 * alles wat van buiten komt ge-escaped. **Dit is bewust een eigen mail en geen
 * variant van de bevestiging**: die gaat over geld en artikelen, deze over één
 * ding, en één ding met één knop is wat een klant hier wil zien.
 *
 * De kop en de voet staan daardoor twee keer in deze map. Dat is gezien en
 * geaccepteerd: ze samenvoegen vraagt dat de vertaalsleutels van de
 * bevestigingsmail verhuizen, en dat is een verbouwing aan een mail die werkt
 * voor een mail die nieuw is. Verandert er iets aan de huisstijl van de kop,
 * dan dus op beide plekken.
 *
 * **Er staat geen bedrag en geen artikelregel in.** Die staan in de
 * bevestiging en op de factuur; hier zouden ze alleen de vraag oproepen of er
 * nog iets betaald moet worden.
 */

export interface TrackingMailInput {
  /** De link waar de klant zijn pakket kan volgen, of `null` */
  url: string | null;
  /** De barcode om voor te lezen aan de vervoerder, of `null` bij een link */
  code: string | null;
  /** Naam van de vervoerder, of `null` als die niet gekozen is */
  carrier: string | null;
}

function url(locale: Locale, href: Parameters<typeof getPathname>[0]["href"]) {
  return `${SITE_URL}${getPathname({ locale, href })}`;
}

function resolveLocale(value: string): Locale {
  return routing.locales.includes(value as Locale)
    ? (value as Locale)
    : routing.defaultLocale;
}

/**
 * De landnaam in de taal van de klant.
 *
 * De bevestigingsmail doet dit nog met `country === "NL" ? "Nederland" : …`
 * en zet daarmee "Nederland" in een Engelse mail. Hier niet: `Intl` kent de
 * namen al, dus het kost geen vertaalsleutel en het klopt ook voor een land
 * dat er later bijkomt. Valt de code niet thuis te brengen, dan blijft de
 * code zelf staan — beter dan een leeg laatste adresregel.
 */
function countryName(code: string, locale: Locale): string {
  try {
    return (
      new Intl.DisplayNames([locale], { type: "region" }).of(
        code.toUpperCase(),
      ) ?? code
    );
  } catch {
    return code;
  }
}

export async function buildTrackingMail(
  order: StoredOrder,
  tracking: TrackingMailInput,
): Promise<{ subject: string; text: string; html: string }> {
  const locale = resolveLocale(order.locale);
  const t = await getTranslations({ locale, namespace: "trackingMail" });
  const h = await getTranslations({ locale, namespace: "trackingMail.html" });
  const customer = order.document.customer;

  const key = `?ref=${encodeURIComponent(order.reference)}&t=${encodeURIComponent(
    order.accessToken,
  )}`;
  const statusUrl = `${url(locale, "/checkout/status")}${key}`;

  const addressLines = [
    `${customer.firstName} ${customer.lastName}`,
    [customer.street, customer.houseNumber, customer.houseNumberAddition]
      .filter(Boolean)
      .join(" "),
    `${customer.postcode} ${customer.city}`,
    countryName(customer.country, locale),
  ].filter(Boolean);

  const subject = t("subject", { reference: order.reference });

  const text = [
    t("greeting", { name: customer.firstName }),
    "",
    t("intro", { reference: order.reference }),
    "",
    tracking.carrier ? t("carrierLine", { carrier: tracking.carrier }) : "",
    tracking.code ? t("codeLine", { code: tracking.code }) : "",
    tracking.url ? t("urlLine", { url: tracking.url }) : t("noLink"),
    "",
    t("addressHeading"),
    addressLines.join("\n"),
    "",
    t("orderLine", { url: statusUrl }),
    "",
    t("help", { email: COMPANY.email }),
    "",
    COMPANY.name,
  ]
    .filter((line) => line !== "")
    .join("\n");

  // Bedrijfsgegevens die nog een plaatshouder zijn vallen weg in plaats van
  // dat er "PLACEHOLDER" in een klantmail belandt (lib/company.ts).
  const legal = [
    companyValue(COMPANY.cocNumber) ? h("coc", { value: COMPANY.cocNumber }) : "",
    companyValue(COMPANY.vatNumber)
      ? h("vatNumber", { value: COMPANY.vatNumber })
      : "",
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" &middot; ");

  const footerLink = (href: string, label: string) =>
    `<a href="${href}" style="color:${WHITE};text-decoration:underline;">${escapeHtml(label)}</a>`;

  // De knop staat er alleen als er werkelijk een link is. Een knop die naar
  // een gok van ons leidt levert de klant een "zending niet gevonden" op bij
  // zijn vervoerder, en dan is onze mail de schuldige (zie tracking.ts).
  const button = tracking.url
    ? `<tr>
    <td style="padding:20px 24px 4px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background-color:${ORANGE};border-radius:8px;">
            <a href="${escapeHtml(tracking.url)}" style="display:inline-block;padding:14px 24px;font-family:${FONT};font-size:15px;font-weight:700;color:${INK};text-decoration:none;">
              ${escapeHtml(h("follow"))}
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
    : `<tr>
    <td style="padding:20px 24px 0 24px;">
      <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${MUTED};">
        ${escapeHtml(h("noLink"))}
      </p>
    </td>
  </tr>`;

  const detailRow = (label: string, value: string, mono = false) =>
    `<tr>
      <td style="padding:10px 0;border-top:1px solid ${LINE};font-family:${FONT};font-size:13px;color:${MUTED};white-space:nowrap;">
        ${escapeHtml(label)}
      </td>
      <td align="right" style="padding:10px 0;border-top:1px solid ${LINE};font-family:${mono ? MONO : FONT};font-size:14px;font-weight:700;color:${INK};">
        ${escapeHtml(value)}
      </td>
    </tr>`;

  const details = [
    detailRow(h("orderNumber"), order.reference, true),
    tracking.carrier ? detailRow(h("carrier"), tracking.carrier) : "",
    tracking.code ? detailRow(h("code"), tracking.code, true) : "",
  ]
    .filter(Boolean)
    .join("");

  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(h("eyebrow"))} ${escapeHtml(order.reference)}</title>
</head>
<body style="margin:0;padding:0;background-color:${ZINC};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(
    h("preheader", { reference: order.reference }),
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
            ${escapeHtml(h("eyebrow"))}
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:32px 24px 8px 24px;">
      <h1 style="margin:0 0 12px 0;font-family:${FONT};font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-0.02em;color:${INK};">
        ${escapeHtml(h("heading", { name: customer.firstName }))}
      </h1>
      <p style="margin:0;font-family:${FONT};font-size:15px;line-height:1.6;color:${MUTED};">
        ${escapeHtml(h("intro"))}
      </p>
    </td>
  </tr>

  ${button}

  <tr>
    <td style="padding:24px 24px 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${details}
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:24px 24px 0 24px;">
      <h2 style="margin:0 0 8px 0;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1.4px;color:${MUTED};text-transform:uppercase;">
        ${escapeHtml(h("addressHeading"))}
      </h2>
      <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${INK};">
        ${addressLines.map(escapeHtml).join("<br>")}
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:20px 24px 28px 24px;">
      <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};">
        ${escapeHtml(h("orderNote"))}
        <a href="${statusUrl}" style="color:${INK};text-decoration:underline;">${escapeHtml(h("orderLink"))}</a>
      </p>
    </td>
  </tr>

  <tr>
    <td style="background-color:${INK};padding:24px;">
      <p style="margin:0 0 4px 0;font-family:${FONT};font-size:14px;font-weight:700;color:${WHITE};">
        ${escapeHtml(h("helpHeading"))}
      </p>
      <p style="margin:0 0 18px 0;font-family:${FONT};font-size:13px;line-height:1.6;color:#9aa1aa;">
        ${escapeHtml(h("helpBody"))}
        <a href="mailto:${COMPANY.email}" style="color:${WHITE};text-decoration:underline;">${escapeHtml(COMPANY.email)}</a>
      </p>
      <p style="margin:0 0 14px 0;font-family:${FONT};font-size:13px;line-height:2;color:${WHITE};">
        ${footerLink(url(locale, "/"), h("linkShop"))}
        <span style="color:#5a6068;">&nbsp;&middot;&nbsp;</span>
        ${footerLink(url(locale, "/faq"), h("linkFaq"))}
        <span style="color:#5a6068;">&nbsp;&middot;&nbsp;</span>
        ${footerLink(url(locale, "/contact"), h("linkContact"))}
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

  return { subject, text, html };
}
