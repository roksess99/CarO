import { execute, query } from "@/lib/db/client";
import type { StatMetric } from "./types";

/**
 * Tellen en uitlezen.
 *
 * **Ophogen mag nooit een verzoek laten mislukken.** Een bezoeker die een
 * pagina opent heeft niets te maken met onze boekhouding; ligt de database
 * eruit, dan verliezen we een telling en verder niets. Daarom vangt `bump()`
 * zijn eigen fout af — de enige plek in deze winkel waar dat zo is, en met
 * reden.
 */
export async function bump(
  metric: StatMetric,
  label = "",
  day: Date = new Date(),
): Promise<void> {
  try {
    await execute(
      `INSERT INTO stats_daily (stat_date, metric, label, total)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE total = total + 1`,
      [isoDay(day), metric, label],
    );
  } catch (error) {
    console.error("Teller kon niet bijgewerkt worden", error);
  }
}

/** YYYY-MM-DD in de tijdzone van de server */
function isoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));
  return isoDay(date);
}

export interface StatPeriod {
  /** Over hoeveel dagen dit gaat, de dag van vandaag meegerekend */
  days: number;
  visits: number;
  pageviews: number;
  cartAdds: number;
  checkoutStarts: number;
  paymentStarts: number;
  /** Betaalde bestellingen in dezelfde periode, uit `orders` */
  paid: number;
}

export interface StatOverview {
  week: StatPeriod;
  month: StatPeriod;
  /** Soorten pagina's, meest bekeken eerst */
  pages: ReadonlyArray<{ label: string; total: number }>;
  /** Herkomst van de bezoeken */
  sources: ReadonlyArray<{ label: string; total: number }>;
}

interface MetricRow {
  metric: string;
  n: string | number | null;
}

interface LabelRow {
  label: string;
  n: string | number | null;
}

interface CountRow {
  n: string | number | null;
}

async function periodOf(days: number): Promise<StatPeriod> {
  const from = daysAgo(days);

  const [rows, paidRows] = await Promise.all([
    query<MetricRow>(
      `SELECT metric, SUM(total) AS n
         FROM stats_daily
        WHERE stat_date >= ?
        GROUP BY metric`,
      [from],
    ),
    query<CountRow>(
      `SELECT COUNT(*) AS n
         FROM orders
        WHERE status = 'paid' AND created_at >= ?`,
      [`${from} 00:00:00`],
    ),
  ]);

  const byMetric = new Map(rows.map((row) => [row.metric, Number(row.n ?? 0)]));
  return {
    days,
    visits: byMetric.get("visit") ?? 0,
    pageviews: byMetric.get("pageview") ?? 0,
    cartAdds: byMetric.get("cart_add") ?? 0,
    checkoutStarts: byMetric.get("checkout_start") ?? 0,
    paymentStarts: byMetric.get("payment_start") ?? 0,
    paid: Number(paidRows[0]?.n ?? 0),
  };
}

async function labelsOf(
  metric: StatMetric,
  days: number,
  limit: number,
): Promise<ReadonlyArray<{ label: string; total: number }>> {
  const rows = await query<LabelRow>(
    `SELECT label, SUM(total) AS n
       FROM stats_daily
      WHERE metric = ? AND stat_date >= ? AND label <> ''
      GROUP BY label
      ORDER BY n DESC
      LIMIT ${Math.trunc(limit)}`,
    [metric, daysAgo(days)],
  );
  return rows.map((row) => ({ label: row.label, total: Number(row.n ?? 0) }));
}

/**
 * Alles wat het dashboard toont, in vier vragen aan de database.
 *
 * Ligt die eruit, dan geeft dit `null` en laat het dashboard het blok weg. De
 * bestellingen eronder moeten gewoon blijven staan: bezoekcijfers zijn
 * prettig om te weten, bestellingen zijn werk.
 */
export async function statsOverview(): Promise<StatOverview | null> {
  try {
    const [week, month, pages, sources] = await Promise.all([
      periodOf(7),
      periodOf(28),
      labelsOf("pageview", 28, 8),
      labelsOf("source", 28, 5),
    ]);
    return { week, month, pages, sources };
  } catch (error) {
    console.error("Bezoekcijfers konden niet geladen worden", error);
    return null;
  }
}
