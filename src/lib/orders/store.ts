import type { OrderDocument } from "@/lib/checkout/order-document";
import { query, queryOne, readJson, transaction } from "@/lib/db/client";
import type { ProductFamily } from "@/lib/catalog/families";
import type { OrderStatus, StoredOrder } from "./types";

/**
 * Opslag van bestellingen in MySQL (docs/DECISIONS.md #13).
 *
 * Tot 2026-09-16 was dit één JSON-bestand per bestelling. Dat was genoeg voor
 * wat de opslag toen moest kunnen — een bestelling terugvinden als Mollie zich
 * meldt, en onthouden dat de mails eruit zijn. Het beheerpaneel vraagt meer:
 * een aaneengesloten factuurreeks en een teller op kortingscodes, en die
 * hebben een transactie nodig die een bestand niet kan geven.
 *
 * **De rest van de winkel merkt hier niets van.** Dezelfde functies, dezelfde
 * `StoredOrder`. Moest het later toch iets anders worden, dan raakt dat weer
 * alleen dit bestand.
 *
 * Twee dingen die je moet weten als je hier iets aan verandert:
 *
 * - **Regels worden alleen bij het aanmaken weggeschreven.** Wat de klant
 *   besteld heeft verandert daarna niet meer; alleen status, betaaldatum en
 *   het mailvinkje bewegen nog. Daarom is `saveOrder` een upsert die de
 *   regels overslaat zodra de bestelling al bestaat.
 * - **`DATETIME` bewaart hele seconden.** De milliseconden uit een ISO-tekst
 *   gaan verloren bij het opslaan. Nergens hangt daar iets van af, maar
 *   vergelijk een tijd uit de database dus niet letterlijk met de tekst die
 *   je erin stopte.
 */

/** Zoals de rij in `orders` terugkomt uit MariaDB */
interface OrderRow {
  reference: string;
  status: OrderStatus;
  access_token: string;
  locale: string;
  payment_id: string | null;
  payment_method: string | null;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  postcode: string;
  house_number: string;
  house_number_addition: string | null;
  street: string;
  city: string;
  country: string;
  discount_code_id: number | null;
  document_json: string | OrderDocument;
  created_at: Date;
  paid_at: Date | null;
  notified_at: Date | null;
}

interface LineRow {
  part_id: string;
  family: string;
  quantity: number;
}

/** Een lege optionele waarde hoort als NULL in de database, niet als "" */
function orNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toStoredOrder(row: OrderRow, lines: LineRow[]): StoredOrder {
  const document = readJson<OrderDocument>(row.document_json);
  return {
    reference: row.reference,
    accessToken: row.access_token,
    createdAt: row.created_at.toISOString(),
    status: row.status,
    locale: row.locale,
    paymentId: row.payment_id ?? "",
    paymentMethod: row.payment_method,
    paidAt: isoOrNull(row.paid_at),
    notifiedAt: isoOrNull(row.notified_at),
    document,
    ...(row.discount_code_id === null
      ? {}
      : { discountCodeId: row.discount_code_id }),
    items: lines.map((line) => ({
      partId: line.part_id,
      family: line.family as ProductFamily,
      quantity: line.quantity,
    })),
  };
}

/**
 * De artikelen van één bestelling, met hun naam zoals die bij het bestellen
 * gold.
 *
 * `StoredOrder.items` draagt alleen het artikelnummer en de familie — genoeg
 * om in te kopen, te weinig om aan de klant te tonen. Het beoordelingsformulier
 * vraagt een cijfer per artikel en moet dus de naam kunnen laten zien; die
 * staat bevroren in `order_lines`, want de catalogus van de leverancier
 * verandert en een beoordeling hoort bij wat er tóen stond.
 */
export async function orderProducts(reference: string): Promise<
  Array<{ partId: string; family: string; name: string; quantity: number }>
> {
  const rows = await query<{
    part_id: string;
    family: string;
    name: string;
    quantity: number;
  }>(
    `SELECT part_id, family, name, quantity FROM order_lines
      WHERE order_reference = ? ORDER BY id`,
    [reference],
  );
  return rows.map((row) => ({
    partId: row.part_id,
    family: row.family,
    name: row.name,
    quantity: Number(row.quantity),
  }));
}

export async function saveOrder(order: StoredOrder): Promise<void> {
  const { document } = order;
  const customer = document.customer;

  await transaction(async (tx) => {
    // ON DUPLICATE KEY UPDATE raakt alleen de velden die ná het aanmaken nog
    // veranderen. Bedrag, adres en artikelen staan er dan al en horen niet
    // meer te bewegen — een betaalde bestelling die van bedrag verandert is
    // een fout, geen wijziging.
    const [result] = await tx.execute(
      `INSERT INTO orders (
         reference, status, access_token, locale,
         payment_id, payment_method,
         email, first_name, last_name, phone,
         postcode, house_number, house_number_addition, street, city, country,
         items_gross_cents, shipping_gross_cents, discount_cents,
         discount_code_id,
         total_gross_cents, total_vat_cents,
         document_json, created_at, paid_at, notified_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         payment_id = VALUES(payment_id),
         payment_method = VALUES(payment_method),
         paid_at = VALUES(paid_at),
         notified_at = VALUES(notified_at)`,
      [
        order.reference,
        order.status,
        order.accessToken,
        order.locale,
        order.paymentId || null,
        order.paymentMethod,
        customer.email,
        customer.firstName,
        customer.lastName,
        orNull(customer.phone),
        customer.postcode,
        customer.houseNumber,
        orNull(customer.houseNumberAddition),
        customer.street,
        customer.city,
        customer.country,
        document.itemsGrossCents,
        document.shippingGrossCents,
        document.discount?.grossCents ?? 0,
        order.discountCodeId ?? null,
        document.totalGrossCents,
        document.totalVatCents,
        JSON.stringify(document),
        new Date(order.createdAt),
        order.paidAt ? new Date(order.paidAt) : null,
        order.notifiedAt ? new Date(order.notifiedAt) : null,
      ],
    );

    // MySQL en MariaDB geven 1 bij een nieuwe rij en 2 bij een gewijzigde.
    // Alleen bij een nieuwe horen de regels erbij; bestond hij al, dan staan
    // ze er en zou opnieuw invoegen ze verdubbelen.
    const inserted = (result as { affectedRows: number }).affectedRows === 1;
    if (!inserted) return;

    for (const [index, item] of order.items.entries()) {
      // Regel n hoort bij artikel n — zo zet `startPayment` ze weg, en de
      // beheerdersmail rekent daarop.
      const line = document.lines[index];
      await tx.execute(
        `INSERT INTO order_lines (
           order_reference, part_id, family, name, brand, oe_number,
           quantity, unit_gross_cents, line_gross_cents
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.reference,
          item.partId,
          item.family,
          line?.name ?? "",
          orNull(line?.brand),
          orNull(line?.oeNumber),
          item.quantity,
          line?.unitGrossCents ?? 0,
          line?.lineGrossCents ?? 0,
        ],
      );
    }
  });
}

export async function readOrder(reference: string): Promise<StoredOrder | null> {
  const row = await queryOne<OrderRow>(
    `SELECT * FROM orders WHERE reference = ?`,
    [reference],
  );
  if (!row) return null;

  const lines = await query<LineRow>(
    `SELECT part_id, family, quantity FROM order_lines
      WHERE order_reference = ? ORDER BY id`,
    [reference],
  );
  return toStoredOrder(row, lines);
}

/**
 * Leest, past aan en schrijft terug. Geeft `null` als de bestelling niet
 * bestaat.
 *
 * Let op: dit is geen slot. Twee webhooks tegelijk kunnen elkaars wijziging
 * overschrijven. Daarom hangt het versturen van de mails niet aan dit veld
 * alleen, maar wordt het één keer per proces afgeschermd (zie settle.ts).
 */
export async function updateOrder(
  reference: string,
  change: (order: StoredOrder) => StoredOrder,
): Promise<StoredOrder | null> {
  const current = await readOrder(reference);
  if (!current) return null;
  const next = change(current);
  await saveOrder(next);
  return next;
}

/** Eén regel per bestelling voor het overzicht in het beheerpaneel */
export interface OrderSummary {
  reference: string;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
  customerName: string;
  email: string;
  totalGrossCents: number;
  lineCount: number;
  purchasedAt: string | null;
}

interface SummaryRow {
  reference: string;
  status: OrderStatus;
  created_at: Date;
  paid_at: Date | null;
  first_name: string;
  last_name: string;
  email: string;
  total_gross_cents: number;
  line_count: number;
  purchased_at: Date | null;
}

export async function listOrders(options: {
  limit: number;
  offset?: number;
  status?: OrderStatus;
}): Promise<OrderSummary[]> {
  // LIMIT en OFFSET gaan niet als parameter mee bij MariaDB's prepared
  // statements, dus ze worden hier eerst tot een geheel getal gedwongen.
  const limit = Math.min(Math.max(Math.trunc(options.limit), 1), 200);
  const offset = Math.max(Math.trunc(options.offset ?? 0), 0);

  const rows = await query<SummaryRow>(
    `SELECT o.reference, o.status, o.created_at, o.paid_at,
            o.first_name, o.last_name, o.email,
            o.total_gross_cents, o.purchased_at,
            COUNT(l.id) AS line_count
       FROM orders o
       LEFT JOIN order_lines l ON l.order_reference = o.reference
      ${options.status ? "WHERE o.status = ?" : ""}
      GROUP BY o.reference
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
    options.status ? [options.status] : [],
  );

  return rows.map((row) => ({
    reference: row.reference,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    paidAt: isoOrNull(row.paid_at),
    customerName: `${row.first_name} ${row.last_name}`.trim(),
    email: row.email,
    totalGrossCents: row.total_gross_cents,
    lineCount: Number(row.line_count),
    purchasedAt: isoOrNull(row.purchased_at),
  }));
}

/** Aantallen en omzet voor het beheerpaneel, in één vraag aan de database */
export async function orderTotals(): Promise<{
  paidCount: number;
  paidGrossCents: number;
  paidVatCents: number;
  openCount: number;
}> {
  const row = await queryOne<{
    paid_count: number;
    paid_gross: string | number | null;
    paid_vat: string | number | null;
    open_count: number;
  }>(
    `SELECT
       SUM(status = 'paid') AS paid_count,
       SUM(CASE WHEN status = 'paid' THEN total_gross_cents ELSE 0 END) AS paid_gross,
       SUM(CASE WHEN status = 'paid' THEN total_vat_cents ELSE 0 END) AS paid_vat,
       SUM(status = 'awaiting_payment') AS open_count
     FROM orders`,
  );

  return {
    paidCount: Number(row?.paid_count ?? 0),
    // SUM() komt bij MariaDB als tekst terug zodra het om grote getallen kan
    // gaan; Number() eromheen houdt centen gehele getallen.
    paidGrossCents: Number(row?.paid_gross ?? 0),
    paidVatCents: Number(row?.paid_vat ?? 0),
    openCount: Number(row?.open_count ?? 0),
  };
}

/** Alleen voor het verhuisscript: bestaat deze bestelling al? */
export async function orderExists(reference: string): Promise<boolean> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM orders WHERE reference = ?`,
    [reference],
  );
  return Number(row?.n ?? 0) > 0;
}

/** Zodat het verhuisscript niet zijn eigen SQL hoeft te schrijven */
export async function countOrders(): Promise<number> {
  const row = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM orders`);
  return Number(row?.n ?? 0);
}
