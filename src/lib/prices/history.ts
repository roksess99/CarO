import { execute, query, queryOne, readJson } from "@/lib/db/client";

/**
 * Prijsgeschiedenis: wat een artikel de afgelopen dagen kostte.
 *
 * Waarvoor dit bestaat: bij een aangekondigde prijsverlaging moet de
 * doorgestreepte "van"-prijs **de laagste prijs van de afgelopen dertig dagen**
 * zijn — niet de prijs van gisteren en niet de adviesprijs van de leverancier
 * (Besluit prijsaanduiding producten, de ACM handhaaft erop). Onze prijzen
 * volgen een leveranciersfeed die beweegt, dus die laagste prijs weten we
 * alleen als we hem bijhouden.
 *
 * **We bewaren de prijs die de klant die dag écht kon betalen**, dus inclusief
 * een lopende actie. Dat is precies wat de wet bedoelt: loopt een korting al
 * een maand, dan zakt de referentieprijs mee en wordt de "van"-prijs kleiner.
 * Wie een actie een maand vooruit plant, heeft dertig dagen volle prijs staan
 * en mag het volle verschil tonen.
 *
 * **Nooit de hele catalogus.** De leverancier heeft er miljoenen; wij bewaren
 * alleen artikelen die in een actie zitten of er kort geleden in zaten.
 */

/** Zoveel dagen kijkt de wet terug */
export const REFERENCE_DAYS = 30;

/**
 * Zoveel dagen bewaren we. Iets meer dan de dertig die we nodig hebben, zodat
 * een actie die net afgelopen is nog een dag of tien navraagbaar blijft.
 */
const KEEP_DAYS = 40;

/**
 * Hoeveel dagen er minimaal gemeten moeten zijn voor we een "van"-prijs tonen.
 * Niet dertig: een nacht dat de server eruit lag mag geen maand kosten, en de
 * wet vraagt de laagste prijs van de periode — niet dertig metingen.
 */
const MIN_DAYS_MEASURED = 25;

/** De dag in UTC, als YYYY-MM-DD. De database rekent overal in UTC. */
export function dayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export interface PriceEntry {
  partId: string;
  priceCents: number;
}

/**
 * De prijzen van vandaag wegschrijven.
 *
 * `ON DUPLICATE KEY UPDATE` en niet overslaan: draait de meting een tweede keer
 * op dezelfde dag (met de hand vanuit het paneel), dan telt de laatste meting.
 * Eén rij per artikel per dag, afgedwongen door de primaire sleutel.
 */
export async function recordPrices(
  entries: ReadonlyArray<PriceEntry>,
  on: Date = new Date(),
): Promise<number> {
  if (entries.length === 0) return 0;
  const seenOn = dayKey(on);

  // In blokken, want één INSERT met duizenden rijen loopt tegen max_allowed_packet
  let written = 0;
  const CHUNK = 500;
  for (let start = 0; start < entries.length; start += CHUNK) {
    const chunk = entries.slice(start, start + CHUNK);
    const placeholders = chunk.map(() => "(?, ?, ?)").join(", ");
    const values = chunk.flatMap((entry) => [
      entry.partId,
      seenOn,
      entry.priceCents,
    ]);
    const result = await execute(
      `INSERT INTO price_history (part_id, seen_on, price_cents)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE price_cents = VALUES(price_cents)`,
      values,
    );
    // affectedRows telt een bijgewerkte rij als 2; het gaat ons om de artikelen
    written += chunk.length;
    void result;
  }
  return written;
}

/** Rijen die niemand meer nodig heeft */
export async function prunePrices(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - KEEP_DAYS * 86_400_000);
  const result = await execute(
    `DELETE FROM price_history WHERE seen_on < ?`,
    [dayKey(cutoff)],
  );
  return result.affectedRows;
}

// ---------------------------------------------------------------------------
// Wat de winkel ervan gebruikt
// ---------------------------------------------------------------------------

interface LowRow {
  part_id: string;
  laagste: number;
  dagen: number;
}

/**
 * De laagste prijs per artikel tussen twee dagen, `from` inclusief en `to`
 * exclusief.
 *
 * **Het venster ligt vóór de actie, niet vóór vandaag.** De wet vraagt de
 * laagste prijs van de dertig dagen die aan de verlaging voorafgaan; zou je tot
 * vandaag tellen, dan zit de actieprijs zelf in het venster en is de laagste
 * prijs altijd gelijk aan wat het nu kost. Er zou dan nooit een "van"-prijs
 * verschijnen — precies wat er bij de eerste opzet gebeurde.
 *
 * Artikelen waarvan er in dat venster te weinig dagen gemeten zijn vallen af:
 * een referentieprijs uit drie metingen is er geen.
 */
export async function lowestPricesBetween(
  from: Date,
  to: Date,
  minDays: number = MIN_DAYS_MEASURED,
): Promise<Map<string, number>> {
  const rows = await query<LowRow>(
    `SELECT part_id, MIN(price_cents) AS laagste, COUNT(*) AS dagen
       FROM price_history
      WHERE seen_on >= ? AND seen_on < ?
      GROUP BY part_id
     HAVING dagen >= ?`,
    [dayKey(from), dayKey(to), minDays],
  );
  return new Map(rows.map((row) => [row.part_id, Number(row.laagste)]));
}

// ---------------------------------------------------------------------------
// Het slot op de dagelijkse taak
// ---------------------------------------------------------------------------

export interface JobRun {
  ranOn: string;
  startedAt: Date;
  finishedAt: Date | null;
  detail: unknown;
}

interface JobRow {
  ran_on: Date | string;
  started_at: Date;
  finished_at: Date | null;
  detail_json: string | object | null;
}

/**
 * De dag claimen. `true` betekent: jij mag draaien.
 *
 * Eén INSERT, dus atomair. De cron-taak, de klok in de server en de knop in het
 * paneel kunnen alle drie tegelijk binnenkomen; er wint er precies één.
 */
export async function claimJob(
  name: string,
  on: Date = new Date(),
): Promise<boolean> {
  const result = await execute(
    `INSERT IGNORE INTO job_runs (name, ran_on, started_at) VALUES (?, ?, ?)`,
    [name, dayKey(on), new Date()],
  );
  return result.affectedRows === 1;
}

export async function finishJob(
  name: string,
  detail: unknown,
  on: Date = new Date(),
): Promise<void> {
  await execute(
    `UPDATE job_runs SET finished_at = ?, detail_json = ?
      WHERE name = ? AND ran_on = ?`,
    [new Date(), JSON.stringify(detail), name, dayKey(on)],
  );
}

/** Voor het paneel: wanneer draaide deze taak voor het laatst, en lukte het? */
export async function lastJobRun(name: string): Promise<JobRun | null> {
  const row = await queryOne<JobRow>(
    `SELECT * FROM job_runs WHERE name = ? ORDER BY started_at DESC LIMIT 1`,
    [name],
  );
  if (!row) return null;
  return {
    ranOn: typeof row.ran_on === "string" ? row.ran_on : dayKey(row.ran_on),
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    detail: row.detail_json ? readJson<unknown>(row.detail_json) : null,
  };
}

/**
 * Is de meting te lang geleden? Anderhalve dag, zodat één gemiste nacht meteen
 * opvalt maar een meting die om 23:50 in plaats van 00:10 liep dat niet doet.
 */
export function jobIsLate(run: JobRun | null, now: number = Date.now()): boolean {
  if (!run) return true;
  return now - run.startedAt.getTime() > 36 * 60 * 60 * 1000;
}

/**
 * Hoeveel artikelen en dagen er nu bewaard zijn — voor het paneel.
 *
 * De tweede kolom heet in SQL bewust `total` en niet `rows`: **`ROWS` is een
 * gereserveerd woord in MariaDB** (sinds 10.6, voor de `ROWS`-clausule) en
 * gaf een syntaxfout. Aanhalingstekens eromheen zou ook werken, maar een
 * gereserveerd woord helemaal vermijden scheelt de volgende lezer een
 * zoektocht.
 */
export async function historySize(): Promise<{ parts: number; rows: number }> {
  const row = await queryOne<{ parts: number; total: number }>(
    `SELECT COUNT(DISTINCT part_id) AS parts, COUNT(*) AS total FROM price_history`,
  );
  return { parts: Number(row?.parts ?? 0), rows: Number(row?.total ?? 0) };
}
