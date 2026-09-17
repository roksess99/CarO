import type { PoolConnection, ResultSetHeader } from "mysql2/promise";
import { execute, query, queryOne } from "@/lib/db/client";
import { codeDiscountCents, normalizeCode } from "./code-base";

export { codeBaseCents, codeDiscountCents, normalizeCode } from "./code-base";

/**
 * Kortingscodes: een percentage over de artikelen, met een looptijd.
 *
 * Drie regels die uit docs/DECISIONS.md #14 komen en niet zomaar mogen wijzigen:
 *
 * - **Alleen een percentage**, geen vaste bedragen. Dat scheelt een halve
 *   rekenmachine aan randgevallen rond btw en gedeeltelijke retouren.
 * - **Het minimum kijkt naar de artikelen, niet naar de verzendkosten.** Een
 *   code afdwingen met een verzendtarief erbij zou de klant laten betalen voor
 *   het halen van zijn eigen drempel.
 * - **Niet op artikelen die al in de aanbieding zijn.** Twee kortingen over
 *   elkaar heen zakken door de marge-ondergrens, en dan zou de winkel de code
 *   alsnog moeten weigeren op het moment dat de klant wil betalen. De code
 *   telt dus alleen over de artikelen zónder actie — en het minimum kijkt naar
 *   datzelfde bedrag, zodat drempel en korting over hetzelfde geld gaan.
 */

export interface DiscountCode {
  id: number;
  code: string;
  percent: number;
  minSpendCents: number;
  startsAt: Date;
  endsAt: Date;
  /** null = onbeperkt */
  maxUses: number | null;
  usedCount: number;
  oncePerCustomer: boolean;
  disabledAt: Date | null;
  createdBy: number;
}

interface CodeRow {
  id: number;
  code: string;
  percent: number;
  min_spend_cents: number;
  starts_at: Date;
  ends_at: Date;
  max_uses: number | null;
  used_count: number;
  once_per_customer: number;
  disabled_at: Date | null;
  created_by: number;
}

function toCode(row: CodeRow): DiscountCode {
  return {
    id: row.id,
    code: row.code,
    percent: Number(row.percent),
    minSpendCents: Number(row.min_spend_cents),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    maxUses: row.max_uses === null ? null : Number(row.max_uses),
    usedCount: Number(row.used_count),
    oncePerCustomer: row.once_per_customer === 1,
    disabledAt: row.disabled_at,
    createdBy: row.created_by,
  };
}

/** Het mailadres zoals het in `discount_code_uses` staat: kleine letters, geen spaties */
export function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

export async function createCode(input: {
  code: string;
  percent: number;
  minSpendCents: number;
  startsAt: Date;
  endsAt: Date;
  maxUses: number | null;
  oncePerCustomer: boolean;
  createdBy: number;
}): Promise<number> {
  const result = await execute(
    `INSERT INTO discount_codes
       (code, percent, min_spend_cents, starts_at, ends_at, max_uses,
        once_per_customer, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.code,
      input.percent,
      input.minSpendCents,
      input.startsAt,
      input.endsAt,
      input.maxUses,
      input.oncePerCustomer ? 1 : 0,
      input.createdBy,
      new Date(),
    ],
  );
  return result.insertId;
}

export async function stopCode(id: number): Promise<boolean> {
  const result = await execute(
    `UPDATE discount_codes SET disabled_at = ?
      WHERE id = ? AND disabled_at IS NULL`,
    [new Date(), id],
  );
  return result.affectedRows === 1;
}

export async function listCodes(): Promise<DiscountCode[]> {
  const rows = await query<CodeRow>(
    `SELECT * FROM discount_codes
      ORDER BY disabled_at IS NOT NULL, starts_at DESC`,
  );
  return rows.map(toCode);
}

export async function findCode(code: string): Promise<DiscountCode | null> {
  const row = await queryOne<CodeRow>(
    `SELECT * FROM discount_codes WHERE code = ?`,
    [normalizeCode(code)],
  );
  return row ? toCode(row) : null;
}

export async function findCodeById(id: number): Promise<DiscountCode | null> {
  const row = await queryOne<CodeRow>(
    `SELECT * FROM discount_codes WHERE id = ?`,
    [id],
  );
  return row ? toCode(row) : null;
}

// ---------------------------------------------------------------------------
// Keuren
// ---------------------------------------------------------------------------

/**
 * Waarom een code niet geldt. De checkout vertaalt dit naar een zin; de reden
 * blijft hier in code-taal, want hij gaat ook het logboek in.
 */
export type CodeRejection =
  | "unknown"
  | "notStarted"
  | "expired"
  | "exhausted"
  | "alreadyUsed"
  | "minSpend"
  | "onlyDiscounted";

export type CodeCheck =
  | {
      ok: true;
      code: DiscountCode;
      /** Waar de code over gerekend is: de artikelen zónder lopende actie */
      baseGrossCents: number;
      discountGrossCents: number;
    }
  | { ok: false; reason: CodeRejection; minSpendCents?: number };

/**
 * Keurt een code voor deze wagen en deze klant.
 *
 * Draait op de server, met bedragen die de server zelf uit de catalogus heeft
 * gehaald — nooit met een bedrag uit de browser (CLAUDE.md).
 */
export async function checkCode(input: {
  code: string;
  email?: string;
  baseGrossCents: number;
  now?: Date;
}): Promise<CodeCheck> {
  const entered = normalizeCode(input.code);
  if (!entered) return { ok: false, reason: "unknown" };

  const code = await findCode(entered);
  if (!code || code.disabledAt) return { ok: false, reason: "unknown" };

  const now = input.now ?? new Date();
  if (code.startsAt > now) return { ok: false, reason: "notStarted" };
  if (code.endsAt <= now) return { ok: false, reason: "expired" };
  if (code.maxUses !== null && code.usedCount >= code.maxUses) {
    return { ok: false, reason: "exhausted" };
  }

  // Staat er niets in de wagen waar de code op mag, dan is het geen
  // "te weinig besteed" maar een andere reden — dat scheelt een klant die
  // artikelen bij gaat leggen en dan alsnog nul korting krijgt.
  if (input.baseGrossCents <= 0) return { ok: false, reason: "onlyDiscounted" };
  if (input.baseGrossCents < code.minSpendCents) {
    return { ok: false, reason: "minSpend", minSpendCents: code.minSpendCents };
  }

  if (code.oncePerCustomer && input.email) {
    const used = await queryOne<{ id: number }>(
      `SELECT id FROM discount_code_uses WHERE code_id = ? AND email_key = ?`,
      [code.id, emailKey(input.email)],
    );
    if (used) return { ok: false, reason: "alreadyUsed" };
  }

  return {
    ok: true,
    code,
    baseGrossCents: input.baseGrossCents,
    discountGrossCents: codeDiscountCents(input.baseGrossCents, code.percent),
  };
}

/**
 * Vastleggen dat deze klant de code gebruikt heeft.
 *
 * **Pas als er betaald is**, binnen dezelfde transactie als de afhandeling: een
 * afgebroken checkout mag de enige kans van een klant niet opsouperen.
 *
 * De unieke sleutel (code_id, email_key) is wat "één keer per klant" écht
 * afdwingt. Twee bestellingen die op hetzelfde moment afgerekend worden lezen
 * allebei "nog niet gebruikt"; de database weigert dan de tweede. Dat is geen
 * fout in de afhandeling — de betaling is dan al binnen — dus de aanroeper
 * krijgt `false` terug en de bestelling gaat gewoon door.
 */
export async function recordCodeUse(
  tx: PoolConnection,
  input: { codeId: number; email: string; orderReference: string },
): Promise<boolean> {
  const [result] = await tx.execute(
    `INSERT IGNORE INTO discount_code_uses
       (code_id, email_key, order_reference, used_at)
     VALUES (?, ?, ?, ?)`,
    [input.codeId, emailKey(input.email), input.orderReference, new Date()],
  );
  if ((result as ResultSetHeader).affectedRows !== 1) return false;

  await tx.execute(
    `UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ?`,
    [input.codeId],
  );
  return true;
}
