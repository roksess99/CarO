import { execute, query, queryOne } from "@/lib/db/client";
import type { ProductFamily } from "@/lib/catalog/families";

/**
 * Kortingsregels: welke artikelen staan er in de aanbieding, en voor hoeveel.
 *
 * **Een regel wijst een groep aan, geen lijst.** "15% op alle remschijven" is
 * één rij, geen tweehonderd. Dat scheelt opslag, maar vooral werk bij de
 * nachtelijke prijscontrole: die hoeft dan één categorie op te halen in plaats
 * van tweehonderd artikelen los (GEMETEN: een categorie komt in één
 * API-verzoek binnen, artikelen zijn niet te bundelen op nummer).
 *
 * **Stoppen is niet weggooien.** Een afgelopen actie blijft staan met een
 * einddatum, anders verdwijnt waaróm een oude bestelling die prijs had.
 */

export type DiscountScope = "part" | "category" | "family";

export interface DiscountRule {
  id: number;
  label: string;
  scope: DiscountScope;
  /** Bij welke catalogus het doel hoort; de aanbiedingenpagina heeft dat nodig */
  family: ProductFamily;
  target: string;
  percent: number;
  startsAt: Date;
  endsAt: Date;
  disabledAt: Date | null;
  createdBy: number;
}

interface RuleRow {
  id: number;
  label: string;
  scope: DiscountScope;
  family: ProductFamily;
  target: string;
  percent: number;
  starts_at: Date;
  ends_at: Date;
  disabled_at: Date | null;
  created_by: number;
}

function toRule(row: RuleRow): DiscountRule {
  return {
    id: row.id,
    label: row.label,
    scope: row.scope,
    family: row.family,
    target: row.target,
    percent: Number(row.percent),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    disabledAt: row.disabled_at,
    createdBy: row.created_by,
  };
}

export async function createRule(input: {
  label: string;
  scope: DiscountScope;
  family: ProductFamily;
  target: string;
  percent: number;
  startsAt: Date;
  endsAt: Date;
  createdBy: number;
}): Promise<number> {
  const result = await execute(
    `INSERT INTO discount_rules
       (label, scope, family, target, percent, starts_at, ends_at, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.label,
      input.scope,
      input.family,
      input.target,
      input.percent,
      input.startsAt,
      input.endsAt,
      input.createdBy,
      new Date(),
    ],
  );
  return result.insertId;
}

export async function stopRule(id: number): Promise<boolean> {
  const result = await execute(
    `UPDATE discount_rules SET disabled_at = ?
      WHERE id = ? AND disabled_at IS NULL`,
    [new Date(), id],
  );
  return result.affectedRows === 1;
}

export async function listRules(): Promise<DiscountRule[]> {
  const rows = await query<RuleRow>(
    `SELECT * FROM discount_rules ORDER BY disabled_at IS NOT NULL, starts_at DESC`,
  );
  return rows.map(toRule);
}

export async function findRule(id: number): Promise<DiscountRule | null> {
  const row = await queryOne<RuleRow>(
    `SELECT * FROM discount_rules WHERE id = ?`,
    [id],
  );
  return row ? toRule(row) : null;
}

// ---------------------------------------------------------------------------
// Wat de winkel gebruikt bij het tonen van een prijs
// ---------------------------------------------------------------------------

/**
 * De regels die nú lopen, in een vorm die per artikel snel te bevragen is.
 *
 * Dit wordt bij élke productweergave geraadpleegd, dus het gaat niet elke keer
 * naar de database: een minuut in het geheugen is ruim, want een actie die een
 * minuut later zichtbaar wordt is geen probleem. De regels zijn klein — een
 * handvol rijen — dus dit kost niets.
 */
export interface DiscountSet {
  percentFor(part: {
    id: string;
    family: ProductFamily;
    categorySlug: string;
  }): number;
}

export const NO_DISCOUNTS: DiscountSet = { percentFor: () => 0 };

const CACHE_MS = 60_000;
let cache: { at: number; set: DiscountSet; rules: DiscountRule[] } | null = null;

function build(rules: DiscountRule[]): DiscountSet {
  const byPart = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const byFamily = new Map<string, number>();

  for (const rule of rules) {
    const target =
      rule.scope === "part"
        ? byPart
        : rule.scope === "category"
          ? byCategory
          : byFamily;
    // Lopen er twee acties op hetzelfde artikel, dan wint de hoogste. Stapelen
    // doen we niet: twee kortingen over elkaar heen is voor niemand na te
    // rekenen, en de ondergrens zou het verschil toch opeten.
    const current = target.get(rule.target) ?? 0;
    if (rule.percent > current) target.set(rule.target, rule.percent);
  }

  return {
    percentFor(part) {
      return Math.max(
        byPart.get(part.id) ?? 0,
        byCategory.get(part.categorySlug) ?? 0,
        byFamily.get(part.family) ?? 0,
      );
    },
  };
}

/** De lopende regels, gecacht. Zowel de opzoektabel als de regels zelf. */
async function loadActive(): Promise<{ set: DiscountSet; rules: DiscountRule[] }> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache;

  try {
    const rows = await query<RuleRow>(
      `SELECT * FROM discount_rules
        WHERE disabled_at IS NULL AND starts_at <= ? AND ends_at > ?`,
      [new Date(), new Date()],
    );
    const rules = rows.map(toRule);
    const set = build(rules);
    cache = { at: now, set, rules };
    return cache;
  } catch (error) {
    // Ligt de database eruit, dan toont de winkel gewoon de normale prijs.
    // Dat is de goede kant om op te falen: te duur tonen kan de klant zien en
    // afwijzen, te goedkoop verkopen kost geld.
    console.error("Kortingsregels konden niet geladen worden", error);
    return cache ?? { set: NO_DISCOUNTS, rules: [] };
  }
}

export async function activeDiscounts(): Promise<DiscountSet> {
  return (await loadActive()).set;
}

/**
 * De acties waarvan de nachtelijke prijsmeting de prijzen moet bewaren: alles
 * wat nu loopt én alles wat binnenkort begint.
 *
 * Bewust niet uit de cache van hierboven: dit draait één keer per dag, en die
 * cache kent alleen wat er nú loopt. Een actie die volgende week begint moet
 * vandaag al gemeten worden, anders is er over dertig dagen geen "van"-prijs.
 */
export async function rulesToMeasure(
  startingBefore: Date,
): Promise<DiscountRule[]> {
  const rows = await query<RuleRow>(
    `SELECT * FROM discount_rules
      WHERE disabled_at IS NULL AND starts_at <= ? AND ends_at > ?`,
    [startingBefore, new Date()],
  );
  return rows.map(toRule);
}

/** Voor de aanbiedingenpagina: welke acties lopen er nu? */
export async function activeRules(): Promise<DiscountRule[]> {
  return (await loadActive()).rules;
}

/** Voor het beheerpaneel: na een wijziging hoeft niemand een minuut te wachten */
export function forgetDiscountCache(): void {
  cache = null;
}
