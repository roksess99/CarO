import { PRODUCT_FAMILIES, usesVehicleCatalog } from "@/lib/catalog/families";
import { COMPANY } from "@/lib/company";
import { formatPriceCents } from "@/lib/format";
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
import { productLabel } from "./product-label";
import type { StoredOrder } from "./types";

/**
 * Het inkoopbriefje voor de beheerder, als HTML-tabel.
 *
 * De beheerder bestelt met de hand bij de groothandel (DECISIONS #10). Dit
 * bericht is dus geen kopie van de klantmail maar een werkbriefje: precies wat
 * hij naast het scherm van de leverancier nodig heeft.
 *
 * Waarom HTML en niet alleen de uitgevulde tekstversie uit notify.ts: die
 * kolommen staan alléén recht in een vaste-breedte lettertype. Gmail en
 * Outlook zetten platte tekst in een proportioneel lettertype zodra er ook een
 * HTML-deel is, en op een telefoon breken de regels van ~78 tekens middenin
 * een artikelnummer af. Dan is de tabel geen tabel meer. De tekstversie gaat
 * als alternatief mee, voor tekstclients en voor spamfilters.
 *
 * Dezelfde mailregels als bij de klantmail: tabellen in plaats van flex,
 * opmaak inline, en alles wat van buiten komt ge-escaped. Eén verschil: hier
 * gaat géén logo mee. Deze mail komt op ons eigen kantoor aan, en een
 * meegestuurde afbeelding zou alleen de bijlagelijst naast de PDF vervuilen.
 */

/** Eén regel van het briefje, samengesteld uit item + documentregel */
interface PurchaseRow {
  quantity: number;
  /** Artikel-id van de leverancier — hiermee is het artikel direct te vinden */
  supplierId: string;
  /** OE-nummer, om te controleren of het om hetzelfde onderdeel gaat */
  oeNumber: string;
  family: string;
  /** Welke API de familie bedient; zegt in welk scherm hij moet zijn */
  catalog: string;
  product: string;
}

/**
 * `order.items` en `order.document.lines` lopen gelijk op; zo wordt het in
 * components/checkout/actions.ts opgebouwd.
 */
/**
 * Welke catalogus, en een eerlijk "?" als we het niet weten.
 *
 * `usesVehicleCatalog()` slaat een familie op in `FAMILIES` en gooit dus op een
 * familie die daar niet meer in staat — en er zijn er al twee verdwenen
 * (gereedschap en gebruikte onderdelen, 2026-09-05). Deze mail wordt verstuurd
 * vanuit `settle.ts`, dat een fout hier **bewust niet afvangt**: dan blijft
 * `notifiedAt` leeg en probeert de betaaldienst het dagenlang opnieuw — met elke
 * keer een nieuwe bevestigingsmail naar de klant, want die gaat als eerste de
 * deur uit. Eén onbekende familie mag dat niet veroorzaken.
 */
function catalogOf(family: StoredOrder["items"][number]["family"]): string {
  if (!PRODUCT_FAMILIES.includes(family)) return "?";
  return usesVehicleCatalog(family) ? "Wearparts" : "Products";
}

function purchaseRows(order: StoredOrder): PurchaseRow[] {
  const rows = order.items.map((item, index) => {
    const line = order.document.lines[index];
    return {
      quantity: item.quantity,
      supplierId: item.partId,
      oeNumber: line?.oeNumber || "—",
      family: item.family,
      catalog: catalogOf(item.family),
      product: line ? productLabel(line) : "?",
    };
  });
  // Op catalogus gesorteerd: banden, velgen en toebehoren komen uit Products
  // v1.3 en onderdelen uit Wearparts v1.6 — aparte API's, aparte schermen. Een
  // wagen met allebei wordt twee inkooporders, en dan wil je niet tussen de
  // regels heen en weer springen (docs/api/WEARPARTS.md).
  return rows.sort((a, b) => a.catalog.localeCompare(b.catalog));
}

const CELL = `padding:10px 12px;font-family:${FONT};font-size:14px;line-height:1.45;color:${INK};vertical-align:top;`;
// Geen `white-space:nowrap` op de koppen: op een telefoon zijn het juist de
// vijf niet-afbrekende kopteksten die de tabel breder maken dan het scherm.
const HEAD = `padding:10px 12px;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1.2px;color:#9aa1aa;text-transform:uppercase;`;

function purchaseTable(order: StoredOrder): string {
  const rows = purchaseRows(order);

  const body = rows
    .map((row, index) => {
      // Om-en-om een grijze rug: bij vijf kolommen is dat wat het oog op één
      // regel houdt. Een lijn per kolom doet dat ook, maar maakt het onrustig.
      const back = index % 2 === 1 ? `background-color:${ZINC};` : "";
      return `<tr>
      <td style="${CELL}${back}font-size:15px;font-weight:700;white-space:nowrap;">${row.quantity}&times;</td>
      <td style="${CELL}${back}word-break:break-word;">${escapeHtml(row.product)}</td>
      <td style="${CELL}${back}font-family:${MONO};font-size:12px;word-break:break-all;">${escapeHtml(row.supplierId)}</td>
      <td style="${CELL}${back}font-family:${MONO};font-size:12px;color:${MUTED};word-break:break-all;">${escapeHtml(row.oeNumber)}</td>
      <td style="${CELL}${back}font-size:12px;color:${MUTED};">${escapeHtml(row.family)}<br><span style="font-size:11px;">${escapeHtml(row.catalog)}</span></td>
    </tr>`;
    })
    .join("");

  const pieces = rows.reduce((sum, row) => sum + row.quantity, 0);

  // Twee catalogussen betekent twee losse inkooporders. Dat staat er met
  // zoveel woorden bij, want de kolom alleen is over het hoofd te zien.
  const catalogs = new Set(rows.map((row) => row.catalog));
  const split =
    catalogs.size > 1
      ? `<tr><td colspan="5" style="padding:10px 12px;border-top:1px solid ${LINE};background-color:#FFF4EC;font-family:${FONT};font-size:13px;line-height:1.5;color:${INK};">
        <strong>Let op:</strong> deze bestelling loopt over twee catalogussen. Dat zijn twee aparte inkooporders bij de groothandel.
      </td></tr>`
      : "";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid ${LINE};border-radius:8px;overflow:hidden;">
    <!-- Vaste kolombreedtes: zonder deze krijgt de productnaam in een smal
         venster de ruimte die overblijft nadat de nummers zichzelf breed
         hebben gemaakt, en schuift de laatste kolom het scherm af. -->
    <tr style="background-color:${INK};">
      <th align="left" width="8%" style="${HEAD}">Aantal</th>
      <th align="left" width="34%" style="${HEAD}">Product</th>
      <th align="left" width="22%" style="${HEAD}">Artikelnr.</th>
      <th align="left" width="20%" style="${HEAD}">OEM-nummer</th>
      <th align="left" width="16%" style="${HEAD}">Catalogus</th>
    </tr>
    ${body}
    ${split}
    <tr>
      <td colspan="5" style="padding:10px 12px;border-top:2px solid ${INK};font-family:${FONT};font-size:12px;color:${MUTED};">
        ${rows.length} ${rows.length === 1 ? "regel" : "regels"} &middot; ${pieces} ${pieces === 1 ? "stuk" : "stuks"} in te kopen
      </td>
    </tr>
  </table>`;
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 8px 0;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1.4px;color:${MUTED};text-transform:uppercase;">${escapeHtml(text)}</h2>`;
}

function totalRow(label: string, value: string, strong = false): string {
  const weight = strong ? "700" : "400";
  return `<tr>
    <td style="padding:4px 0;font-family:${FONT};font-size:14px;font-weight:${weight};color:${strong ? INK : MUTED};">${escapeHtml(label)}</td>
    <td align="right" style="padding:4px 0;font-family:${FONT};font-size:${strong ? "16px" : "14px"};font-weight:${weight};color:${INK};white-space:nowrap;">${escapeHtml(value)}</td>
  </tr>`;
}

export function renderAdminMail(order: StoredOrder): string {
  const doc = order.document;
  const customer = doc.customer;
  const total = formatPriceCents(doc.totalGrossCents);

  const house = [customer.houseNumber, customer.houseNumberAddition]
    .filter(Boolean)
    .join(" ");
  const address = [
    `${customer.firstName} ${customer.lastName}`,
    `${customer.street} ${house}`,
    `${customer.postcode} ${customer.city}`,
    customer.country === "NL" ? "Nederland" : customer.country,
  ];

  // Een nummer met spaties of streepjes werkt niet in een tel:-link
  const phone = customer.phone?.trim();
  const contact = [
    `<a href="mailto:${escapeHtml(customer.email)}" style="color:${INK};">${escapeHtml(customer.email)}</a>`,
    phone
      ? `<a href="tel:${escapeHtml(phone.replace(/[^+\d]/g, ""))}" style="color:${INK};">${escapeHtml(phone)}</a>`
      : `<span style="color:${MUTED};">Telefoon niet opgegeven</span>`,
  ].join("<br>");

  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Inkoopbriefje ${escapeHtml(order.reference)}</title>
</head>
<body style="margin:0;padding:0;background-color:${ZINC};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${ZINC};">
<tr><td align="center" style="padding:24px 12px;">

<!-- Breder dan de klantmail (600px): dit briefje heeft vijf kolommen en wordt
     aan een bureau gelezen, niet onderweg. -->
<table role="presentation" width="720" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:720px;background-color:${WHITE};border-radius:12px;overflow:hidden;">

  <tr>
    <td style="background-color:${INK};padding:20px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1.4px;color:${ORANGE};text-transform:uppercase;">
            Inkoopbriefje
          </td>
          <td align="right" style="font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1.4px;color:#9aa1aa;text-transform:uppercase;">
            ${escapeHtml(COMPANY.name)}
          </td>
        </tr>
        <tr>
          <td style="padding-top:6px;font-family:${FONT};font-size:20px;font-weight:700;color:${WHITE};white-space:nowrap;">
            ${escapeHtml(order.reference)}
          </td>
          <td align="right" style="padding-top:6px;font-family:${FONT};font-size:20px;font-weight:700;color:${WHITE};white-space:nowrap;">
            ${escapeHtml(total)}
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:16px 24px 0 24px;">
      <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};">
        Betaling bevestigd &middot; ${escapeHtml(order.paymentMethod ?? "onbekend")} &middot;
        <span style="font-family:${MONO};font-size:12px;">${escapeHtml(order.paymentId)}</span>
      </p>
    </td>
  </tr>

  <tr>
    <td style="padding:20px 24px 0 24px;">
      ${heading("In te kopen bij de groothandel")}
      ${purchaseTable(order)}
    </td>
  </tr>

  <tr>
    <td style="padding:24px 24px 0 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="50%" valign="top" style="padding-right:12px;">
            ${heading("Bezorgadres")}
            <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${INK};">
              ${address.filter(Boolean).map(escapeHtml).join("<br>")}
            </p>
          </td>
          <td width="50%" valign="top" style="padding-left:12px;">
            ${heading("Contact")}
            <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${INK};">
              ${contact}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:24px 24px 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:320px;border-top:2px solid ${INK};">
        <tr><td colspan="2" style="height:8px;line-height:8px;">&nbsp;</td></tr>
        ${totalRow("Artikelen", formatPriceCents(doc.itemsGrossCents))}
        ${totalRow("Verzending", formatPriceCents(doc.shippingGrossCents))}
        ${totalRow("Totaal incl. btw", total, true)}
      </table>
    </td>
  </tr>

  <tr>
    <td style="padding:20px 24px 24px 24px;">
      <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};">
        De orderbevestiging zit als PDF bij deze mail. Antwoorden op dit bericht komt bij de klant uit.
      </p>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>`;
}
