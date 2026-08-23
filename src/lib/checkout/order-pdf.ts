import {
  PDFDocument,
  type PDFFont,
  type PDFPage,
  rgb,
  StandardFonts,
} from "pdf-lib";
import { companyValue, hasPlaceholderCompanyData } from "../company";
import { formatPriceCents } from "../format";
import type { OrderDocument, OrderDocumentLine } from "./order-document";

// Orderbevestiging als PDF. Alle bedragen komen kant-en-klaar uit
// order-document.ts; hier wordt alleen getekend.
//
// Waarom geen logo-afbeelding: pdf-lib kan alleen raster (PNG/JPG) embedden
// en in public/brand/ staan uitsluitend SVG's. De huisstijl verbiedt het
// natekenen van de moer, dus staat er een typografisch woordmerk met de
// oranje balk als accent. TODO: echte lockup zodra er een PNG-export is.
//
// Beperking: de ingebouwde Helvetica kan alleen WinAnsi. Een klantnaam in
// Arabisch of Cyrillisch wordt daardoor "?". Dat vraagt een ingesloten
// Unicode-TTF (@pdf-lib/fontkit) — apart besluit, zie het antwoord bij deze
// wijziging.

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const CONTENT_WIDTH = A4[0] - MARGIN * 2;

const INK = rgb(0.0549, 0.0627, 0.0745);
const GREY = rgb(0.4627, 0.4863, 0.5216);
const ORANGE = rgb(1, 0.4157, 0.0745);
const ZINC = rgb(0.9608, 0.9647, 0.9686);
const LINE = rgb(0.85, 0.86, 0.87);

/** Kolommen van de artikeltabel: x-offset en breedte binnen de contentbreedte */
const COLUMNS = {
  description: { x: 0, width: 189 },
  quantity: { x: 189, width: 40 },
  unitNet: { x: 229, width: 66 },
  unitGross: { x: 295, width: 66 },
  lineNet: { x: 361, width: 66 },
  lineGross: { x: 427, width: 72 },
};

const dateFormatter = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// WinAnsi kent naast ASCII en Latin-1 nog een handvol tekens in 0x80–0x9F.
const WINANSI_EXTRAS = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

/** Alles wat Helvetica niet kan zetten wordt "?" — nooit een harde crash. */
function sanitize(text: string): string {
  let out = "";
  for (const char of text.replace(/ /g, " ")) {
    const code = char.codePointAt(0) ?? 0;
    const encodable =
      (code >= 0x20 && code <= 0x7e) ||
      (code >= 0xa0 && code <= 0xff) ||
      WINANSI_EXTRAS.includes(char);
    out += encodable ? char : "?";
  }
  return out;
}

/** Kort af op de beschikbare breedte, met een beletselteken */
function truncate(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string {
  const clean = sanitize(text);
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;
  let cut = clean;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}...`, size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}...`;
}

interface Ctx {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
}

function text(
  ctx: Ctx,
  value: string,
  options: {
    x?: number;
    y?: number;
    size?: number;
    bold?: boolean;
    color?: ReturnType<typeof rgb>;
    /** Rechts uitlijnen op deze x (rechterrand) */
    alignRight?: number;
  } = {},
): void {
  const size = options.size ?? 9;
  const font = options.bold ? ctx.bold : ctx.regular;
  const clean = sanitize(value);
  const x =
    options.alignRight !== undefined
      ? options.alignRight - font.widthOfTextAtSize(clean, size)
      : (options.x ?? MARGIN);
  ctx.page.drawText(clean, {
    x,
    y: options.y ?? ctx.y,
    size,
    font,
    color: options.color ?? INK,
  });
}

function newPage(ctx: Ctx): void {
  ctx.page = ctx.doc.addPage(A4);
  ctx.y = A4[1] - MARGIN;
}

function drawHeader(ctx: Ctx, order: OrderDocument): void {
  // Woordmerk links. Oranje mag als vlak, niet als tekst (docs/BRAND.md).
  text(ctx, "CarO", { size: 26, bold: true, y: ctx.y - 20 });
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - 30,
    width: 62,
    height: 4,
    color: ORANGE,
  });

  const right = MARGIN + CONTENT_WIDTH;
  text(ctx, "ORDERBEVESTIGING", {
    size: 9,
    bold: true,
    color: GREY,
    alignRight: right,
    y: ctx.y - 6,
  });
  text(ctx, order.reference, {
    size: 12,
    bold: true,
    alignRight: right,
    y: ctx.y - 21,
  });
  text(ctx, dateFormatter.format(new Date(order.issuedAt)), {
    size: 9,
    color: GREY,
    alignRight: right,
    y: ctx.y - 34,
  });

  ctx.y -= 58;
}

/** Blok met een kop en regels; geeft de laagste y terug */
function drawBlock(
  ctx: Ctx,
  x: number,
  top: number,
  title: string,
  lines: string[],
): number {
  text(ctx, title.toUpperCase(), {
    x,
    y: top,
    size: 8,
    bold: true,
    color: GREY,
  });
  let y = top - 14;
  for (const line of lines) {
    if (!line) continue;
    text(ctx, line, { x, y, size: 9 });
    y -= 12;
  }
  return y;
}

function drawParties(ctx: Ctx, order: OrderDocument): void {
  const { company, customer } = order;
  const top = ctx.y;

  // Een veld dat nog niet is ingevuld laten we wég: "PLACEHOLDER - IBAN"
  // op een bevestiging naar een klant is erger dan een ontbrekende regel.
  const line = (value: string, prefix = "") => {
    const known = companyValue(value);
    return known ? `${prefix}${known}` : "";
  };
  const sellerBottom = drawBlock(ctx, MARGIN, top, "Verkoper", [
    line(company.legalName),
    line(company.street),
    companyValue(company.city) ? `${company.postcode} ${company.city}` : "",
    company.country,
    line(company.email),
    line(company.phone),
    line(company.cocNumber, "KvK: "),
    line(company.vatNumber, "Btw: "),
    line(company.iban, "IBAN: "),
  ]);

  const addressLine = [
    customer.street,
    customer.houseNumber,
    customer.houseNumberAddition,
  ]
    .filter(Boolean)
    .join(" ");

  const buyerBottom = drawBlock(
    ctx,
    MARGIN + CONTENT_WIDTH / 2,
    top,
    "Bezorgadres",
    [
      `${customer.firstName} ${customer.lastName}`,
      addressLine,
      `${customer.postcode} ${customer.city}`,
      customer.country === "NL" ? "Nederland" : customer.country,
      customer.email,
      customer.phone || "",
    ],
  );

  ctx.y = Math.min(sellerBottom, buyerBottom) - 16;
}

function drawTableHead(ctx: Ctx): void {
  const rowHeight = 20;
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - rowHeight + 6,
    width: CONTENT_WIDTH,
    height: rowHeight,
    color: ZINC,
  });
  const baseline = ctx.y - rowHeight + 12;
  const head = { size: 8, bold: true, color: GREY, y: baseline } as const;
  text(ctx, "OMSCHRIJVING", { ...head, x: MARGIN + 6 });
  text(ctx, "AANTAL", {
    ...head,
    alignRight: MARGIN + COLUMNS.quantity.x + COLUMNS.quantity.width,
  });
  text(ctx, "STUK EXCL.", {
    ...head,
    alignRight: MARGIN + COLUMNS.unitNet.x + COLUMNS.unitNet.width,
  });
  text(ctx, "STUK INCL.", {
    ...head,
    alignRight: MARGIN + COLUMNS.unitGross.x + COLUMNS.unitGross.width,
  });
  text(ctx, "TOTAAL EXCL.", {
    ...head,
    alignRight: MARGIN + COLUMNS.lineNet.x + COLUMNS.lineNet.width,
  });
  text(ctx, "TOTAAL INCL.", {
    ...head,
    alignRight: MARGIN + COLUMNS.lineGross.x + COLUMNS.lineGross.width,
  });
  ctx.y -= rowHeight + 8;
}

function drawLine(ctx: Ctx, line: OrderDocumentLine): void {
  const nameWidth = COLUMNS.description.width - 6;
  text(ctx, truncate(line.name, ctx.bold, 9, nameWidth), {
    x: MARGIN + 6,
    size: 9,
    bold: true,
  });
  text(ctx, String(line.quantity), {
    alignRight: MARGIN + COLUMNS.quantity.x + COLUMNS.quantity.width,
  });
  text(ctx, formatPriceCents(line.unitNetCents), {
    alignRight: MARGIN + COLUMNS.unitNet.x + COLUMNS.unitNet.width,
  });
  text(ctx, formatPriceCents(line.unitGrossCents), {
    alignRight: MARGIN + COLUMNS.unitGross.x + COLUMNS.unitGross.width,
  });
  text(ctx, formatPriceCents(line.lineNetCents), {
    alignRight: MARGIN + COLUMNS.lineNet.x + COLUMNS.lineNet.width,
  });
  text(ctx, formatPriceCents(line.lineGrossCents), {
    alignRight: MARGIN + COLUMNS.lineGross.x + COLUMNS.lineGross.width,
    bold: true,
  });

  // Merk en OE-nummer als tweede regel: data, dus klein en grijs
  const meta = [line.brand, line.oeNumber].filter(Boolean).join("  ·  ");
  if (meta) {
    ctx.y -= 11;
    text(ctx, truncate(meta, ctx.regular, 8, nameWidth), {
      x: MARGIN + 6,
      size: 8,
      color: GREY,
    });
  }

  ctx.y -= 9;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: MARGIN + CONTENT_WIDTH, y: ctx.y },
    thickness: 0.5,
    color: LINE,
  });
  ctx.y -= 14;
}

function drawTotalRow(
  ctx: Ctx,
  label: string,
  net: string,
  gross: string,
  options: { bold?: boolean } = {},
): void {
  text(ctx, label, {
    x: MARGIN + COLUMNS.lineNet.x - 150,
    bold: options.bold,
    size: options.bold ? 10 : 9,
  });
  text(ctx, net, {
    alignRight: MARGIN + COLUMNS.lineNet.x + COLUMNS.lineNet.width,
    bold: options.bold,
    size: options.bold ? 10 : 9,
    color: options.bold ? INK : GREY,
  });
  text(ctx, gross, {
    alignRight: MARGIN + COLUMNS.lineGross.x + COLUMNS.lineGross.width,
    bold: options.bold,
    size: options.bold ? 10 : 9,
  });
  ctx.y -= options.bold ? 18 : 14;
}

function drawTotals(ctx: Ctx, order: OrderDocument): void {
  ctx.y -= 4;
  drawTotalRow(
    ctx,
    "Subtotaal artikelen",
    formatPriceCents(order.itemsNetCents),
    formatPriceCents(order.itemsGrossCents),
  );
  drawTotalRow(
    ctx,
    "Verzendkosten",
    order.shippingIsFree ? "Gratis" : formatPriceCents(order.shippingNetCents),
    order.shippingIsFree ? "Gratis" : formatPriceCents(order.shippingGrossCents),
  );
  drawTotalRow(
    ctx,
    `Btw ${order.vatPercent}%`,
    "",
    formatPriceCents(order.totalVatCents),
  );

  ctx.y += 4;
  ctx.page.drawLine({
    start: { x: MARGIN + COLUMNS.lineNet.x - 150, y: ctx.y },
    end: { x: MARGIN + CONTENT_WIDTH, y: ctx.y },
    thickness: 1,
    color: INK,
  });
  ctx.y -= 16;

  drawTotalRow(
    ctx,
    "Totaal",
    formatPriceCents(order.totalNetCents),
    formatPriceCents(order.totalGrossCents),
    { bold: true },
  );
}

function drawFooter(ctx: Ctx): void {
  const notes = [
    "Alle bedragen in euro. Prijzen inclusief 21% btw, tenzij anders vermeld.",
    "14 dagen bedenktijd op elke bestelling (herroepingsrecht).",
    "Dit is een orderbevestiging, geen factuur: de bestelling is nog niet betaald.",
  ];
  if (hasPlaceholderCompanyData()) {
    notes.push(
      "LET OP - testdocument: de bedrijfsgegevens zijn nog niet ingevuld.",
    );
  }

  let y = MARGIN + 12 * notes.length;
  ctx.page.drawLine({
    start: { x: MARGIN, y: y + 10 },
    end: { x: MARGIN + CONTENT_WIDTH, y: y + 10 },
    thickness: 0.5,
    color: LINE,
  });
  for (const note of notes) {
    y -= 12;
    text(ctx, note, { y, size: 8, color: GREY });
  }
}

/** Orderbevestiging → PDF-bytes */
export async function renderOrderPdf(order: OrderDocument): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const ctx: Ctx = {
    doc,
    page: doc.addPage(A4),
    y: A4[1] - MARGIN,
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  doc.setTitle(`Orderbevestiging ${order.reference}`);
  doc.setAuthor(order.company.name);
  doc.setSubject("Orderbevestiging");
  doc.setCreator(order.company.name);
  doc.setProducer(order.company.name);
  doc.setCreationDate(new Date(order.issuedAt));

  drawHeader(ctx, order);
  drawParties(ctx, order);
  drawTableHead(ctx);

  // Ruimte onderaan vrijhouden voor de voettekst; de totalen mogen niet
  // half over de pagina-onderkant vallen.
  const bottomLimit = MARGIN + 90;
  for (const line of order.lines) {
    if (ctx.y < bottomLimit) {
      newPage(ctx);
      drawTableHead(ctx);
    }
    drawLine(ctx, line);
  }

  if (ctx.y < bottomLimit + 40) {
    newPage(ctx);
  }
  drawTotals(ctx, order);
  drawFooter(ctx);

  return doc.save();
}
