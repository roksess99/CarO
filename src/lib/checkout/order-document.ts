import { COMPANY, type CompanyDetails } from "../company";
import { vatPortionCents } from "../pricing";
import { calculateShipping } from "../shipping";
import type { CheckoutDetails } from "./schema";

// Het datacontract van de orderbevestiging: alles wat op het document komt,
// uitgerekend en klaar om te tekenen. Framework-onafhankelijk en zonder
// pdf-lib erin, zodat de bedragen los te testen zijn van de opmaak.
//
// Alle bedragen zijn integers in eurocenten (CLAUDE.md). `gross` is inclusief
// 21% btw — dat is wat de klant in de shop ziet — en `net` is exclusief.

export interface OrderDocumentLine {
  name: string;
  brand: string;
  oeNumber: string;
  quantity: number;
  /** Stuksprijs inclusief btw */
  unitGrossCents: number;
  /** Stuksprijs exclusief btw */
  unitNetCents: number;
  lineGrossCents: number;
  lineNetCents: number;
}

export interface OrderDocument {
  /** Voorlopig kenmerk — géén factuurnummer, zie orderNumber() hieronder */
  reference: string;
  /** ISO-datum van opmaak */
  issuedAt: string;
  company: CompanyDetails;
  customer: CheckoutDetails;
  lines: OrderDocumentLine[];
  vatPercent: number;
  itemsNetCents: number;
  itemsGrossCents: number;
  shippingNetCents: number;
  shippingGrossCents: number;
  shippingIsFree: boolean;
  totalNetCents: number;
  totalVatCents: number;
  totalGrossCents: number;
}

export interface OrderDocumentInput {
  details: CheckoutDetails;
  entries: ReadonlyArray<{
    name: string;
    brand: string;
    oeNumber: string;
    priceCents: number;
    quantity: number;
  }>;
  /** Meegeven in tests; anders "nu" */
  now?: Date;
  reference?: string;
}

const VAT_PERCENT = 21;

/**
 * Voorlopig ordernummer: datum + vier tekens. Bewust géén doorlopende reeks,
 * want die hoort in de database te ontstaan (fase 4). Een factuurnummer moet
 * aaneengesloten en oplopend zijn; dit kenmerk is dat niet en mag dus nooit
 * als factuurnummer gebruikt worden.
 */
export function provisionalReference(now: Date = new Date()): string {
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");
  return `CARO-${date}-${suffix}`;
}

export function buildOrderDocument({
  details,
  entries,
  now = new Date(),
  reference,
}: OrderDocumentInput): OrderDocument {
  const lines: OrderDocumentLine[] = entries.map((entry) => {
    const lineGrossCents = entry.priceCents * entry.quantity;
    return {
      name: entry.name,
      brand: entry.brand,
      oeNumber: entry.oeNumber,
      quantity: entry.quantity,
      unitGrossCents: entry.priceCents,
      unitNetCents: entry.priceCents - vatPortionCents(entry.priceCents),
      lineGrossCents,
      lineNetCents: lineGrossCents - vatPortionCents(lineGrossCents),
    };
  });

  const itemsGrossCents = lines.reduce((sum, l) => sum + l.lineGrossCents, 0);
  const itemsNetCents = lines.reduce((sum, l) => sum + l.lineNetCents, 0);

  const shipping = calculateShipping(itemsGrossCents);
  const shippingNetCents =
    shipping.costCents - vatPortionCents(shipping.costCents);

  const totalGrossCents = itemsGrossCents + shipping.costCents;
  // Het nettototaal is de som van de regels, niet een herberekening over het
  // eindbedrag: anders wijkt de kolom "excl. btw" een cent af van wat eronder
  // staat opgeteld. De btw is dan het sluitstuk, zodat het document klopt.
  const totalNetCents = itemsNetCents + shippingNetCents;

  return {
    reference: reference ?? provisionalReference(now),
    issuedAt: now.toISOString(),
    company: COMPANY,
    customer: details,
    lines,
    vatPercent: VAT_PERCENT,
    itemsNetCents,
    itemsGrossCents,
    shippingNetCents,
    shippingGrossCents: shipping.costCents,
    shippingIsFree: shipping.isFree,
    totalNetCents,
    totalVatCents: totalGrossCents - totalNetCents,
    totalGrossCents,
  };
}
