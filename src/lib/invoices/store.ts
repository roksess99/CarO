import type { OrderDocument } from "@/lib/checkout/order-document";
import { query, queryOne, readJson, transaction } from "@/lib/db/client";
import type { StoredOrder } from "@/lib/orders/types";

/**
 * Facturen met een aaneengesloten nummer.
 *
 * **Het nummer wordt pas toegekend als er betaald is**, nooit bij het aanmaken
 * van de bestelling. Van de zes bestellingen die er bij de invoering stonden
 * waren er twee nooit betaald; die zouden anders twee nummers uit de reeks
 * hebben opgesnoept en gaten hebben achtergelaten.
 *
 * **Een verstuurde factuur verandert nooit meer.** Corrigeren gaat met een
 * creditfactuur die zijn eigen nummer krijgt. Daarom bewaart `snapshot_json`
 * het hele document zoals het op de dag van uitgifte was: opnieuw uitrekenen
 * uit de prijzen van vandaag zou een ander bedrag kunnen geven.
 *
 * **Zeven jaar bewaren** (fiscale bewaarplicht). Dat is meteen het antwoord op
 * hoe lang bestellingen moeten blijven staan.
 */

/** 2026-0001 — per jaar opnieuw, binnen het jaar aaneengesloten */
function formatNumber(year: number, sequence: number): string {
  return `${year}-${String(sequence).padStart(4, "0")}`;
}

export interface Invoice {
  number: string;
  kind: "invoice" | "credit";
  creditOf: string | null;
  orderReference: string;
  issuedAt: Date;
  totalNetCents: number;
  totalVatCents: number;
  totalGrossCents: number;
}

interface InvoiceRow {
  number: string;
  kind: "invoice" | "credit";
  credit_of: string | null;
  order_reference: string;
  issued_at: Date;
  total_net_cents: number;
  total_vat_cents: number;
  total_gross_cents: number;
}

function toInvoice(row: InvoiceRow): Invoice {
  return {
    number: row.number,
    kind: row.kind,
    creditOf: row.credit_of,
    orderReference: row.order_reference,
    issuedAt: row.issued_at,
    totalNetCents: row.total_net_cents,
    totalVatCents: row.total_vat_cents,
    totalGrossCents: row.total_gross_cents,
  };
}

export async function invoiceForOrder(
  reference: string,
): Promise<Invoice | null> {
  const row = await queryOne<InvoiceRow>(
    `SELECT * FROM invoices WHERE order_reference = ? AND kind = 'invoice'`,
    [reference],
  );
  return row ? toInvoice(row) : null;
}

export async function findInvoice(number: string): Promise<
  (Invoice & { document: OrderDocument }) | null
> {
  const row = await queryOne<InvoiceRow & { snapshot_json: string | OrderDocument }>(
    `SELECT * FROM invoices WHERE number = ?`,
    [number],
  );
  if (!row) return null;
  const document = readJson<OrderDocument>(row.snapshot_json);
  return { ...toInvoice(row), document };
}

/**
 * De factuur voor een betaalde bestelling. Bestaat hij al, dan komt die terug —
 * de webhook van Mollie meldt zich vaker dan één keer.
 */
export async function issueInvoice(order: StoredOrder): Promise<Invoice> {
  const existing = await invoiceForOrder(order.reference);
  if (existing) return existing;

  const issuedAt = order.paidAt ? new Date(order.paidAt) : new Date();
  const year = issuedAt.getUTCFullYear();
  const counter = `invoice_${year}`;

  try {
    return await transaction(async (tx) => {
      // Eerst zorgen dát de tellerrij bestaat. `SELECT … FOR UPDATE` kan geen
      // rij op slot zetten die er niet is, en twee bestellingen in januari
      // zouden hem anders allebei aanmaken.
      await tx.execute(
        `INSERT INTO counters (name, value) VALUES (?, 0)
         ON DUPLICATE KEY UPDATE value = value`,
        [counter],
      );

      // Dit slot is de hele reden dat counters een eigen tabel is. Buiten een
      // transactie geeft MySQL het meteen weer vrij en kunnen twee betalingen
      // hetzelfde nummer krijgen.
      const [rows] = await tx.execute(
        `SELECT value FROM counters WHERE name = ? FOR UPDATE`,
        [counter],
      );
      const current = Number((rows as Array<{ value: number }>)[0]?.value ?? 0);
      const next = current + 1;

      await tx.execute(`UPDATE counters SET value = ? WHERE name = ?`, [
        next,
        counter,
      ]);

      const number = formatNumber(year, next);
      const { document } = order;

      await tx.execute(
        `INSERT INTO invoices (
           number, kind, order_reference, issued_at,
           total_net_cents, total_vat_cents, total_gross_cents, snapshot_json
         ) VALUES (?, 'invoice', ?, ?, ?, ?, ?, ?)`,
        [
          number,
          order.reference,
          issuedAt,
          document.totalNetCents,
          document.totalVatCents,
          document.totalGrossCents,
          JSON.stringify(document),
        ],
      );

      return {
        number,
        kind: "invoice" as const,
        creditOf: null,
        orderReference: order.reference,
        issuedAt,
        totalNetCents: document.totalNetCents,
        totalVatCents: document.totalVatCents,
        totalGrossCents: document.totalGrossCents,
      };
    });
  } catch (error) {
    // Twee webhooks tegelijk: de één won, de ander ketste af op
    // uq_invoices_order_kind. Dan is de factuur er gewoon (0002_…sql).
    const raced = await invoiceForOrder(order.reference);
    if (raced) return raced;
    throw error;
  }
}

export interface InvoiceListItem extends Invoice {
  customerName: string;
}

export async function listInvoices(limit = 50): Promise<InvoiceListItem[]> {
  const rows = await query<InvoiceRow & { first_name: string; last_name: string }>(
    `SELECT i.*, o.first_name, o.last_name
       FROM invoices i
       JOIN orders o ON o.reference = i.order_reference
      ORDER BY i.number DESC
      LIMIT ${Math.min(Math.max(Math.trunc(limit), 1), 200)}`,
  );

  return rows.map((row) => ({
    ...toInvoice(row),
    customerName: `${row.first_name} ${row.last_name}`.trim(),
  }));
}

/** Omzet per maand, uit de facturen — dat is wat de boekhouding telt */
export interface MonthTotal {
  month: string;
  count: number;
  netCents: number;
  vatCents: number;
  grossCents: number;
}

export async function invoiceTotalsByMonth(year: number): Promise<MonthTotal[]> {
  const rows = await query<{
    month: string;
    n: number;
    net: string | number;
    vat: string | number;
    gross: string | number;
  }>(
    `SELECT DATE_FORMAT(issued_at, '%Y-%m') AS month,
            COUNT(*) AS n,
            SUM(total_net_cents) AS net,
            SUM(total_vat_cents) AS vat,
            SUM(total_gross_cents) AS gross
       FROM invoices
      WHERE YEAR(issued_at) = ?
      GROUP BY month
      ORDER BY month DESC`,
    [year],
  );

  return rows.map((row) => ({
    month: row.month,
    count: Number(row.n),
    netCents: Number(row.net),
    vatCents: Number(row.vat),
    grossCents: Number(row.gross),
  }));
}
