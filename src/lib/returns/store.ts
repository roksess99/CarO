import { randomInt } from "node:crypto";
import { execute, query, queryOne, transaction } from "@/lib/db/client";
import type {
  ReturnLine,
  ReturnReason,
  ReturnStatus,
  StoredReturn,
} from "./types";

/**
 * Retouren: opslag en de vragen die de winkel en het paneel erover stellen.
 *
 * Alles wat de database aanraakt staat hier, zodat de rest van de winkel
 * alleen met deze functies praat — dezelfde opzet als `lib/orders/store.ts`.
 *
 * **De bedragen komen uit `order_lines`, niet uit de catalogus.** Een retour
 * gaat over wat de klant destijds betaalde; de prijs van vandaag is een ander
 * getal en mag hier nooit binnenkomen.
 */

interface ReturnRow {
  reference: string;
  order_reference: string;
  status: ReturnStatus;
  reason: ReturnReason;
  note: string | null;
  email_key: string;
  items_cents: number;
  shipping_cents: number;
  requested_at: Date;
  received_at: Date | null;
  refunded_at: Date | null;
  refund_id: string | null;
  refunded_cents: number | null;
  rejected_at: Date | null;
  rejected_reason: string | null;
  handled_by: number | null;
}

interface LineRow {
  return_reference: string;
  part_id: string;
  name: string;
  quantity: number;
  unit_gross_cents: number;
  line_gross_cents: number;
}

function toStoredReturn(row: ReturnRow, lines: LineRow[]): StoredReturn {
  return {
    reference: row.reference,
    orderReference: row.order_reference,
    status: row.status,
    reason: row.reason,
    note: row.note,
    emailKey: row.email_key,
    itemsCents: Number(row.items_cents),
    shippingCents: Number(row.shipping_cents),
    requestedAt: row.requested_at,
    receivedAt: row.received_at,
    refundedAt: row.refunded_at,
    refundId: row.refund_id,
    refundedCents:
      row.refunded_cents === null ? null : Number(row.refunded_cents),
    rejectedAt: row.rejected_at,
    rejectedReason: row.rejected_reason,
    handledBy: row.handled_by === null ? null : Number(row.handled_by),
    lines: lines.map((line) => ({
      partId: line.part_id,
      name: line.name,
      quantity: Number(line.quantity),
      unitGrossCents: Number(line.unit_gross_cents),
      lineGrossCents: Number(line.line_gross_cents),
    })),
  };
}

// ---------------------------------------------------------------------------
// Aanmelden
// ---------------------------------------------------------------------------

/**
 * Retournummer: dezelfde vorm als een ordernummer, zodat de klant en de
 * beheerder ze naast elkaar kunnen leggen.
 *
 * Dit hoeft geen aaneengesloten reeks te zijn — het is een kenmerk en geen
 * boekstuk. Een creditfactuur is dat wél, en die krijgt zijn nummer uit de
 * tellertabel (docs/DECISIONS.md #12).
 *
 * **Het nummer is een label, geen sleutel.** Er is geen enkele ingang waar een
 * retournummer iets opent: de drie acties die er één aannemen zitten allemaal
 * achter `requirePermission("retouren")`. Het staat hier toch met `randomInt`
 * uit `node:crypto` en niet met `Math.random()`, om twee redenen: een
 * kwaliteitsscan blijft anders terecht vragen of dit een geheim is, en mocht
 * er ooit wél een klantpagina op dit nummer komen, dan is die vraag al
 * beantwoord. Het kost niets — dit draait één keer per retour.
 */
function newReference(now: Date = new Date()): string {
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = randomInt(36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");
  return `RET-${date}-${suffix}`;
}

export interface NewReturn {
  orderReference: string;
  emailKey: string;
  reason: ReturnReason;
  note: string | null;
  itemsCents: number;
  shippingCents: number;
  lines: ReturnLine[];
}

export type CreateReturnResult =
  | { ok: true; reference: string }
  /** Er liep al een retour op deze bestelling; er is niets weggeschreven */
  | { ok: false; reason: "open" };

/**
 * Een aanvraag vastleggen.
 *
 * De regels gaan in dezelfde transactie mee: een retour zonder regels is een
 * lege claim waar niemand iets mee kan, en die mag dus niet half ontstaan.
 *
 * **De transactie begint met een slot op de bestelling, en dat is geen detail.**
 * Een controle vooraf ("loopt er al een retour?") en daarna een INSERT is een
 * lees-dan-schrijf die twee gelijktijdige verzoeken allebei doorlaten: beide
 * lezen "nog geen retour", beide schrijven er één, en de beheerder betaalt
 * hetzelfde pakket twee keer terug. Precies de fout die bij de kortingscodes
 * met een unieke sleutel is dichtgezet (docs/DECISIONS.md #14).
 *
 * Een unieke sleutel kan hier niet: die zou op "open_order" moeten staan, een
 * gegenereerde kolom, en **MariaDB 11.8 weigert élke uitdrukking in een
 * GENERATED ALWAYS AS-clausule op dit account** (errno 1901, gemeten
 * 2026-09-29 — ook `CONCAT(kolom)` gaat eraf). Daarom een `SELECT … FOR UPDATE`
 * op de orderrij: het tweede verzoek wacht tot het eerste klaar is, ziet dán
 * het lopende retour en krijgt `{ ok: false }`. Dat is geen controle in code
 * maar een serialisatiepunt van de database — hetzelfde effect, andere deur.
 *
 * Botst het retournummer met een bestaand nummer, dan proberen we het opnieuw.
 * Dat is met 36^4 mogelijkheden per dag zeldzaam, maar "zeldzaam" is geen
 * reden om een aanvraag te laten mislukken.
 */
export async function createReturn(
  input: NewReturn,
): Promise<CreateReturnResult> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = newReference();
    try {
      const taken = await transaction(async (tx) => {
        // Het slot. De rij zelf hebben we niet nodig; het gaat om de wacht.
        await tx.execute(`SELECT reference FROM orders WHERE reference = ? FOR UPDATE`, [
          input.orderReference,
        ]);

        const [open] = await tx.execute(
          `SELECT COUNT(*) AS n FROM returns
            WHERE order_reference = ? AND status IN ('requested', 'received')`,
          [input.orderReference],
        );
        // De driver typeert elk resultaat als 'kan ook een schrijfactie zijn'
        const rows = open as unknown as ReadonlyArray<{ n: number }>;
        if (Number(rows[0]?.n ?? 0) > 0) return true;

        await tx.execute(
          `INSERT INTO returns (
             reference, order_reference, status, reason, note, email_key,
             items_cents, shipping_cents, requested_at
           ) VALUES (?, ?, 'requested', ?, ?, ?, ?, ?, ?)`,
          [
            reference,
            input.orderReference,
            input.reason,
            input.note,
            input.emailKey.trim().toLowerCase(),
            input.itemsCents,
            input.shippingCents,
            new Date(),
          ],
        );
        for (const line of input.lines) {
          await tx.execute(
            `INSERT INTO return_lines (
               return_reference, part_id, name,
               quantity, unit_gross_cents, line_gross_cents
             ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
              reference,
              line.partId,
              line.name,
              line.quantity,
              line.unitGrossCents,
              line.lineGrossCents,
            ],
          );
        }
        return false;
      });

      return taken ? { ok: false, reason: "open" } : { ok: true, reference };
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "ER_DUP_ENTRY") throw error;
    }
  }
  throw new Error("Geen vrij retournummer gevonden");
}

/**
 * Hoeveel er per artikel al aangemeld is voor deze bestelling.
 *
 * Afgewezen retouren tellen niet mee: die artikelen zijn nooit teruggekomen,
 * dus ze mogen opnieuw aangemeld worden. Zonder deze controle kan iemand
 * viermaal dezelfde bougie aanmelden en viermaal geld terugvragen.
 */
export async function returnedQuantities(
  orderReference: string,
): Promise<Map<string, number>> {
  const rows = await query<{ part_id: string; total: number }>(
    `SELECT l.part_id, SUM(l.quantity) AS total
       FROM return_lines l
       JOIN returns r ON r.reference = l.return_reference
      WHERE r.order_reference = ?
        AND r.status <> 'rejected'
      GROUP BY l.part_id`,
    [orderReference],
  );
  return new Map(rows.map((row) => [row.part_id, Number(row.total)]));
}

/** Loopt er al een aanvraag voor deze bestelling die nog niet is afgehandeld? */
export async function hasOpenReturn(orderReference: string): Promise<boolean> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM returns
      WHERE order_reference = ? AND status IN ('requested', 'received')`,
    [orderReference],
  );
  return Number(row?.n ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Lezen
// ---------------------------------------------------------------------------

export async function readReturn(
  reference: string,
): Promise<StoredReturn | null> {
  const row = await queryOne<ReturnRow>(
    `SELECT * FROM returns WHERE reference = ?`,
    [reference],
  );
  if (!row) return null;

  const lines = await query<LineRow>(
    `SELECT * FROM return_lines WHERE return_reference = ? ORDER BY id`,
    [reference],
  );
  return toStoredReturn(row, lines);
}

/**
 * Alle retouren voor het paneel, openstaande eerst.
 *
 * De regels komen in één tweede vraag mee in plaats van één per retour: met
 * twintig retouren op een pagina zijn dat anders eenentwintig vragen.
 */
export async function listReturns(limit = 100): Promise<StoredReturn[]> {
  const rows = await query<ReturnRow>(
    `SELECT * FROM returns
      ORDER BY FIELD(status, 'requested', 'received', 'refunded', 'rejected'),
               requested_at DESC
      LIMIT ?`,
    [limit],
  );
  if (rows.length === 0) return [];

  const placeholders = rows.map(() => "?").join(", ");
  const lines = await query<LineRow>(
    `SELECT * FROM return_lines
      WHERE return_reference IN (${placeholders}) ORDER BY id`,
    rows.map((row) => row.reference),
  );

  const byReturn = new Map<string, LineRow[]>();
  for (const line of lines) {
    const list = byReturn.get(line.return_reference) ?? [];
    list.push(line);
    byReturn.set(line.return_reference, list);
  }
  return rows.map((row) => toStoredReturn(row, byReturn.get(row.reference) ?? []));
}

export interface ReturnTotals {
  /** Aangemeld of pakket binnen, maar nog niet afgerond */
  openCount: number;
  refundedCount: number;
  /** Wat er werkelijk is teruggeboekt, niet wat er is aangevraagd */
  refundedCents: number;
}

/**
 * De cijfers voor het dashboard.
 *
 * **Geteld wordt wat er terugbetaald is, niet wat er aangevraagd is.** Een
 * aanvraag is een voornemen; pas een terugboeking is geld dat de winkel uit
 * gaat, en alleen dat hoort van de omzet af. Afgewezen retouren tellen dus
 * nergens in mee.
 *
 * Valt terug op nullen als de database niet bereikbaar is: dit staat op een
 * pagina die moet blijven werken (docs/DECISIONS.md #13 — een lezer valt terug
 * op leeg, een schrijver hoort luid te falen).
 */
export async function returnTotals(): Promise<ReturnTotals> {
  try {
    const row = await queryOne<{
      open_count: number;
      refunded_count: number;
      refunded_cents: number | null;
    }>(
      `SELECT
         SUM(status IN ('requested', 'received')) AS open_count,
         SUM(status = 'refunded') AS refunded_count,
         SUM(CASE WHEN status = 'refunded' THEN refunded_cents ELSE 0 END)
           AS refunded_cents
       FROM returns`,
    );
    return {
      openCount: Number(row?.open_count ?? 0),
      refundedCount: Number(row?.refunded_count ?? 0),
      refundedCents: Number(row?.refunded_cents ?? 0),
    };
  } catch {
    return { openCount: 0, refundedCount: 0, refundedCents: 0 };
  }
}

// ---------------------------------------------------------------------------
// Afhandelen
// ---------------------------------------------------------------------------

/**
 * Pakket binnen. Alleen vanuit `requested`, zodat een dubbele klik of een
 * teruggeknop een afgeronde retour niet terugzet.
 */
export async function markReturnReceived(
  reference: string,
  adminId: number,
): Promise<boolean> {
  const result = await execute(
    `UPDATE returns
        SET status = 'received', received_at = ?, handled_by = ?
      WHERE reference = ? AND status = 'requested'`,
    [new Date(), adminId, reference],
  );
  return result.affectedRows === 1;
}

/**
 * Terugbetaald. Wordt pas aangeroepen als de betaaldienst het bedrag heeft aangenomen;
 * het `re_…`-kenmerk is het bewijs.
 *
 * De voorwaarde in de WHERE is wat dubbel terugbetalen tegenhoudt: twee
 * tabbladen die allebei op de knop drukken, leveren één geslaagde update op.
 */
export async function markReturnRefunded(
  reference: string,
  adminId: number,
  refundId: string,
  cents: number,
): Promise<boolean> {
  const result = await execute(
    `UPDATE returns
        SET status = 'refunded', refunded_at = ?, refund_id = ?,
            refunded_cents = ?, handled_by = ?
      WHERE reference = ? AND status IN ('requested', 'received')`,
    [new Date(), refundId, cents, adminId, reference],
  );
  return result.affectedRows === 1;
}

/** Afwijzen, met reden. Zonder reden gebeurt er niets — net als bij een
 * verborgen beoordeling moet later na te lezen zijn waaróm. */
export async function rejectReturn(
  reference: string,
  adminId: number,
  reason: string,
): Promise<boolean> {
  const trimmed = reason.trim();
  if (!trimmed) return false;
  const result = await execute(
    `UPDATE returns
        SET status = 'rejected', rejected_at = ?, rejected_reason = ?,
            handled_by = ?
      WHERE reference = ? AND status IN ('requested', 'received')`,
    [new Date(), trimmed.slice(0, 190), adminId, reference],
  );
  return result.affectedRows === 1;
}
