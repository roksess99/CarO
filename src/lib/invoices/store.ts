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
 * een webhook meldt zich vaker dan één keer.
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

/**
 * Een bedrag uit een zoekterm halen, in centen.
 *
 * De beheerder typt wat hij op het scherm ziet: `37,71`, `37.71`, `€ 37,71`
 * of gewoon `37`. Allemaal euro's — niemand typt centen én niemand zoekt op
 * "3771" als hij € 37,71 bedoelt. Een getal zonder scheiding is dus hele
 * euro's: `37` wordt 3700.
 *
 * **Een punt is een duizendtalscheiding zodra er ook een komma staat.** Dat
 * moest erbij: `1.234,56` is hoe een Nederlander een bedrag boven de duizend
 * opschrijft, en de eerste opzet gaf daar `null` op — dus "niet gevonden" voor
 * een factuur die er gewoon was. Zonder komma blijft de punt de decimaal
 * (`37.71`), want zo kopieert hij hem uit een export.
 *
 * Geeft `null` als er geen bedrag in zit; dan zoekt de query alleen op tekst.
 */
function centsFromSearch(term: string): number | null {
  let cleaned = term.replace(/[\s\u20ac]/g, "");
  if (cleaned.includes(",")) cleaned = cleaned.replace(/\./g, "");
  cleaned = cleaned.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

/**
 * `%` en `_` zijn jokertekens in een `LIKE`. Zonder dit geeft een zoekterm van
 * één procentteken álle facturen terug — geen lek, want de waarde gaat als
 * parameter mee, maar wel een antwoord dat nergens op slaat.
 */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (teken) => `\\${teken}`);
}

export interface InvoiceSearch {
  /** Naam, mailadres, factuurnummer, ordernummer of bedrag */
  term?: string;
  /** Alleen facturen uit dit jaar */
  year?: number;
  /** 1–12, alleen samen met `year` */
  month?: number;
  limit?: number;
}

/**
 * Facturen zoeken en filteren — één query, niet filteren in geheugen.
 *
 * **Waarom het zoeken over `orders` loopt en niet over de momentopname.** Naam
 * en mailadres staan in `invoices.snapshot_json` ook, maar JSON doorzoeken kan
 * geen index gebruiken en levert bij een typefout in het document stil niets
 * op. De orderrij is de bron waar die gegevens vandaan komen en staat er met
 * een `JOIN` toch al naast.
 *
 * Het mailadres is daarmee doorzoekbaar terwijl het niet in de lijst staat;
 * dat is met opzet (@docs/DECISIONS.md #19). Wie deze pagina mag openen mag de
 * factuur zelf ook openen, en daar staat het adres op.
 */
export async function searchInvoices(
  search: InvoiceSearch = {},
): Promise<InvoiceListItem[]> {
  const where: string[] = [];
  const params: Array<string | number> = [];

  if (search.year !== undefined) {
    where.push("YEAR(i.issued_at) = ?");
    params.push(search.year);
    if (search.month !== undefined) {
      where.push("MONTH(i.issued_at) = ?");
      params.push(search.month);
    }
  }

  const term = (search.term ?? "").trim();
  if (term.length > 0) {
    const like = `%${escapeLike(term)}%`;
    const parts = [
      "i.number LIKE ?",
      "i.order_reference LIKE ?",
      "CONCAT(o.first_name, ' ', o.last_name) LIKE ?",
      "o.email LIKE ?",
    ];
    params.push(like, like, like, like);

    // Een bedrag zoekt op het totaal inclusief btw — dat is wat er op de
    // factuur staat en wat de beheerder op zijn bankafschrift terugziet.
    const cents = centsFromSearch(term);
    if (cents !== null) {
      parts.push("i.total_gross_cents = ?");
      params.push(cents);
    }
    where.push(`(${parts.join(" OR ")})`);
  }

  const limit = Math.min(Math.max(Math.trunc(search.limit ?? 50), 1), 200);
  const rows = await query<InvoiceRow & { first_name: string; last_name: string }>(
    `SELECT i.*, o.first_name, o.last_name
       FROM invoices i
       JOIN orders o ON o.reference = i.order_reference
      ${where.length > 0 ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY i.number DESC
      LIMIT ${limit}`,
    params,
  );

  return rows.map((row) => ({
    ...toInvoice(row),
    customerName: `${row.first_name} ${row.last_name}`.trim(),
  }));
}

/**
 * De omzet per maand, uit de facturen — dat is wat de boekhouding telt.
 *
 * **Eén query voor alle jaren en maanden samen.** Het waren er twee (jaren
 * apart, maanden van één jaar apart) en dat is een heenreis naar de database
 * te veel voor een uitkomst die hooguit twaalf rijen per jaar telt. Groeperen
 * doet de aanroeper; dat kost niets en scheelt een `GROUP BY` extra.
 *
 * Nieuwste eerst, zodat het jaar waar de beheerder in werkt bovenaan staat.
 */
export interface MonthTotal {
  /** `2026-10` */
  month: string;
  year: number;
  /** 1–12 */
  index: number;
  count: number;
  netCents: number;
  vatCents: number;
  grossCents: number;
}

export async function invoiceBreakdown(): Promise<MonthTotal[]> {
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
      GROUP BY month
      ORDER BY month DESC`,
  );

  return rows.map((row) => {
    const [year, index] = row.month.split("-").map(Number);
    return {
      month: row.month,
      year: year as number,
      index: index as number,
      count: Number(row.n),
      netCents: Number(row.net),
      vatCents: Number(row.vat),
      grossCents: Number(row.gross),
    };
  });
}

/** Eén regel per jaar waarin er gefactureerd is, nieuwste eerst */
export interface YearTotal {
  year: number;
  count: number;
  netCents: number;
  vatCents: number;
  grossCents: number;
}

/** Telt de maanden op per jaar — geen tweede query, zie `invoiceBreakdown` */
export function totalsByYear(months: MonthTotal[]): YearTotal[] {
  const perYear = new Map<number, YearTotal>();
  for (const month of months) {
    const row = perYear.get(month.year) ?? {
      year: month.year,
      count: 0,
      netCents: 0,
      vatCents: 0,
      grossCents: 0,
    };
    row.count += month.count;
    row.netCents += month.netCents;
    row.vatCents += month.vatCents;
    row.grossCents += month.grossCents;
    perYear.set(month.year, row);
  }
  return [...perYear.values()].sort((a, b) => b.year - a.year);
}
