import { readFile } from "node:fs/promises";
import path from "node:path";
import { getTranslations } from "next-intl/server";
import { renderOrderPdf } from "@/lib/checkout/order-pdf";
import { COMPANY } from "@/lib/company";
import { formatPriceCents } from "@/lib/format";
import { sendMail, type MailAttachment } from "@/lib/mail";
import { LOGO_CID, renderCustomerMail } from "./customer-mail";
import { productLabel } from "./product-label";
import type { StoredOrder } from "./types";

// De twee mails die na een bevestigde betaling de deur uit gaan: één naar de
// klant en één naar de beheerder. Allebei met dezelfde PDF eraan.
//
// De beheerder bestelt de artikelen met de hand bij de groothandel; zijn mail
// is daarom géén kopie van de klantmail, maar een werkbriefje met precies wat
// hij nodig heeft om in te kopen (docs/DECISIONS.md #10).

/** Adres van de beheerder; standaard de eigen mailbox */
function adminAddress(): string {
  return process.env.ORDER_ADMIN_EMAIL || COMPANY.email;
}

function pdfName(order: StoredOrder): string {
  return `orderbevestiging-${order.reference}.pdf`;
}

function customerName(order: StoredOrder): string {
  const { firstName, lastName } = order.document.customer;
  return `${firstName} ${lastName}`;
}

function addressBlock(order: StoredOrder): string {
  const c = order.document.customer;
  const house = [c.houseNumber, c.houseNumberAddition].filter(Boolean).join(" ");
  return [
    customerName(order),
    `${c.street} ${house}`,
    `${c.postcode} ${c.city}`,
    c.country === "NL" ? "Nederland" : c.country,
  ].join("\n");
}

/** Artikelregels voor de klantmail, één regel per artikel */
function lineBlock(order: StoredOrder): string {
  return order.document.lines
    .map(
      (line) =>
        `${line.quantity}x ${productLabel(line)} — ${formatPriceCents(line.lineGrossCents)}`,
    )
    .join("\n");
}

/**
 * Tabel met uitgevulde kolommen voor een tekstmail.
 *
 * Geen HTML-tabel: deze mails zijn `text/plain` en dat zetten mailprogramma's
 * in een vaste-breedte lettertype, waardoor uitvullen met spaties precies
 * goed uitkomt. De laatste kolom wordt niet opgevuld, anders eindigt elke
 * regel in een sliert spaties.
 */
function textTable(rows: readonly (readonly string[])[]): string {
  const widths = rows[0].map((_, column) =>
    Math.max(...rows.map((row) => row[column].length)),
  );
  return rows
    .map((row) =>
      row
        .map((cell, column) =>
          column === row.length - 1 ? cell : cell.padEnd(widths[column]),
        )
        .join("  ")
        .trimEnd(),
    )
    .join("\n");
}

/**
 * De inkooptabel voor de beheerder: alles wat hij nodig heeft om de artikelen
 * bij de groothandel te bestellen, zonder ze op naam te moeten terugzoeken.
 *
 * ARTIKELNR is het id van de leverancier — daarmee is het artikel direct te
 * vinden. OEM-NUMMER staat ernaast om te controleren of het om hetzelfde
 * onderdeel gaat, of om elders te bestellen. CATALOGUS zegt wáár hij moet
 * zijn: banden, velgen en toebehoren komen uit Products v1.3 en onderdelen
 * uit Wearparts v1.6 — aparte API's, aparte schermen, en een wagen met
 * allebei wordt dus twee inkooporders (docs/api/WEARPARTS.md).
 *
 * De productnaam staat achteraan. Vooraan zou de breedste naam alle nummers
 * voorbij de ~78 tekens duwen waar veel mailprogramma's afbreken, en dan valt
 * de tabel uit elkaar.
 *
 * `order.items` en `order.document.lines` lopen gelijk op; zo wordt het in
 * components/checkout/actions.ts opgebouwd.
 */
function purchaseBlock(order: StoredOrder): string {
  const rows: string[][] = [
    ["AANTAL", "ARTIKELNR", "OEM-NUMMER", "CATALOGUS", "PRODUCT"],
  ];
  for (const [index, item] of order.items.entries()) {
    const line = order.document.lines[index];
    rows.push([
      `${item.quantity}x`,
      item.partId,
      line?.oeNumber || "-",
      item.family,
      line ? productLabel(line) : "?",
    ]);
  }
  return textTable(rows);
}

async function renderAttachment(order: StoredOrder): Promise<MailAttachment> {
  return {
    filename: pdfName(order),
    content: await renderOrderPdf(order.document),
    contentType: "application/pdf",
  };
}

/**
 * Het logo dat in de HTML-mail staat, als meegestuurde bijlage.
 *
 * Eén keer inlezen per proces: het bestand verandert niet tussen twee
 * bestellingen door, en een bevestigingsmail hoort niet op schijf-IO te
 * wachten. Lukt het lezen niet — bestand weg na een half gelukte deploy —
 * dan gaat de mail zonder logo de deur uit in plaats van helemaal niet.
 */
let logoCache: MailAttachment | null | undefined;

async function logoAttachment(): Promise<MailAttachment | null> {
  if (logoCache !== undefined) return logoCache;
  try {
    const file = path.join(process.cwd(), "public", "brand", "caro-lockup-email.png");
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

/**
 * Verstuurt beide mails. Gooit als er één misgaat — de aanroeper mag de
 * bestelling dan **niet** als "gemeld" wegschrijven, zodat een volgende poging
 * het opnieuw probeert.
 *
 * De klantmail gaat als eerste: die is het belangrijkst voor het vertrouwen
 * van de klant, en de beheerder ziet de betaling anders ook in Mollie.
 */
export async function sendOrderNotifications(order: StoredOrder): Promise<void> {
  const attachment = await renderAttachment(order);
  const total = formatPriceCents(order.document.totalGrossCents);

  const t = await getTranslations({
    locale: order.locale,
    namespace: "orderMail",
  });

  const logo = await logoAttachment();
  const html = await renderCustomerMail(
    order,
    order.document.lines.map((line) => ({
      label: productLabel(line),
      quantity: line.quantity,
      lineGrossCents: line.lineGrossCents,
    })),
  );

  await sendMail({
    to: order.document.customer.email,
    subject: t("customerSubject", { reference: order.reference }),
    // De platte tekst blijft de volwaardige versie van het bericht, niet een
    // "bekijk deze mail in je browser"-regel: hij gaat als alternatief mee en
    // is wat een tekstclient en een spamfilter te zien krijgen.
    text: t("customerBody", {
      name: order.document.customer.firstName,
      reference: order.reference,
      total,
      lines: lineBlock(order),
      address: addressBlock(order),
      email: COMPANY.email,
      company: COMPANY.name,
    }),
    html,
    attachments: logo ? [attachment, logo] : [attachment],
  });

  // De beheerdersmail staat vast in het Nederlands: die gaat naar ons eigen
  // kantoor, niet naar de klant, en hoeft de taal van de klant niet te volgen.
  await sendMail({
    to: adminAddress(),
    // Antwoorden komt zo meteen bij de klant uit, niet bij onszelf
    replyTo: order.document.customer.email,
    subject: `Nieuwe bestelling ${order.reference} — ${total}`,
    text: [
      `Betaling bevestigd (${order.paymentMethod ?? "onbekend"}, Mollie ${order.paymentId}).`,
      "",
      "IN TE KOPEN BIJ DE GROOTHANDEL",
      purchaseBlock(order),
      "",
      "BEZORGADRES",
      addressBlock(order),
      "",
      `E-mail: ${order.document.customer.email}`,
      order.document.customer.phone
        ? `Telefoon: ${order.document.customer.phone}`
        : "Telefoon: niet opgegeven",
      "",
      `Artikelen: ${formatPriceCents(order.document.itemsGrossCents)}`,
      `Verzending: ${formatPriceCents(order.document.shippingGrossCents)}`,
      `Totaal incl. btw: ${total}`,
      "",
      "De orderbevestiging zit als PDF bij deze mail.",
    ].join("\n"),
    attachments: [attachment],
  });
}
