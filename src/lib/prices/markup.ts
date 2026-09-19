import { execute, query, queryOne } from "@/lib/db/client";
import type { ProductFamily } from "@/lib/catalog/families";

/**
 * Prijsopslag per groep: wat de beheerder boven op de inkoopprijs zet.
 *
 * Tot 2026-09-19 volgde de winkel de adviesverkoopprijs van de leverancier
 * (docs/DECISIONS.md #5). De eigenaar bepaalt het nu zelf: hij vult een
 * percentage in en dat is de opslag op de **inkoopprijs**. 10% betekent
 * inkoop × 1,10, en daar komt de btw nog overheen.
 *
 * **Dit is een prijs, geen aanbieding.** Een kortingsregel is tijdelijk en
 * mag als "-15%" bij de klant in beeld; een regel hier is gewoon wat het
 * artikel kost. Geen kortingsvlag, geen doorgestreepte van-prijs, niet op de
 * aanbiedingenpagina.
 *
 * **Zonder regel verandert er niets.** Dan blijft de adviesprijs staan. Dat
 * is met opzet: een leeg veld mag niet betekenen dat de hele winkel ineens
 * bijna op inkoopprijs verkoopt.
 *
 * ## De sleutel per familie verschilt, en dat is geen willekeur
 *
 * Bij banden, velgen en toebehoren draagt elk artikel zijn categorie, dus
 * daar kan een regel op de categorieslug ("auto-suv-1").
 *
 * **Bij onderdelen kan dat niet.** Hun categorieboom hangt aan een auto, en
 * een artikel dat via het zoekveld binnenkomt draagt helemaal geen categorie
 * maar `zoekresultaat` (docs/DECISIONS.md #7). Een categorieregel zou daar
 * op de ene pagina wél gelden en op de andere niet — bij een korting is dat
 * verwarrend, bij een prijs is het onacceptabel: het afrekenen leest het
 * artikel op id en zou dan een ánder bedrag uitrekenen dan de klant zag.
 *
 * Daarom `kind`: het TecDoc-soortnummer, dat de leverancier op het artikel
 * zelf meelevert en dus overal hetzelfde is. GEMETEN 2026-09-19 op twee
 * auto's, identiek: oliefilter 7, luchtfilter 8, interieurfilter 424,
 * remblok 402, remschijf 82, motorolie 3224, accu 1, wisserblad 298,
 * bougie 686, schokdemper 854, distributieriem 1123.
 */

export type PriceScope = "shop" | "family" | "category" | "kind" | "part";

export interface PriceRule {
  id: number;
  label: string;
  scope: PriceScope;
  family: ProductFamily | "";
  target: string;
  markupPercent: number;
  disabledAt: Date | null;
  createdBy: number;
  createdAt: Date;
}

interface RuleRow {
  id: number;
  label: string;
  scope: PriceScope;
  family: ProductFamily | "";
  target: string;
  markup_percent: string | number;
  disabled_at: Date | null;
  created_by: number;
  created_at: Date;
}

function toRule(row: RuleRow): PriceRule {
  return {
    id: row.id,
    label: row.label,
    scope: row.scope,
    family: row.family,
    target: row.target,
    markupPercent: Number(row.markup_percent),
    disabledAt: row.disabled_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

/**
 * Een regel toevoegen. Bestond er al een lopende regel voor precies hetzelfde
 * doel, dan wordt die gestopt: de beheerder verándert zijn opslag, hij stapelt
 * er geen tweede bovenop. Twee actieve regels op één doel zouden bovendien
 * niet te lezen zijn in het overzicht.
 */
export async function createPriceRule(input: {
  label: string;
  scope: PriceScope;
  family: ProductFamily | "";
  target: string;
  markupPercent: number;
  createdBy: number;
}): Promise<number> {
  await execute(
    `UPDATE price_rules SET disabled_at = ?
      WHERE disabled_at IS NULL AND scope = ? AND family = ? AND target = ?`,
    [new Date(), input.scope, input.family, input.target],
  );
  const result = await execute(
    `INSERT INTO price_rules
       (label, scope, family, target, markup_percent, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.label,
      input.scope,
      input.family,
      input.target,
      input.markupPercent,
      input.createdBy,
      new Date(),
    ],
  );
  return result.insertId;
}

export async function stopPriceRule(id: number): Promise<boolean> {
  const result = await execute(
    `UPDATE price_rules SET disabled_at = ?
      WHERE id = ? AND disabled_at IS NULL`,
    [new Date(), id],
  );
  return result.affectedRows === 1;
}

export async function listPriceRules(): Promise<PriceRule[]> {
  const rows = await query<RuleRow>(
    `SELECT * FROM price_rules
      ORDER BY disabled_at IS NOT NULL, FIELD(scope,'part','kind','category','family','shop'), created_at DESC`,
  );
  return rows.map(toRule);
}

export async function findPriceRule(id: number): Promise<PriceRule | null> {
  const row = await queryOne<RuleRow>(`SELECT * FROM price_rules WHERE id = ?`, [
    id,
  ]);
  return row ? toRule(row) : null;
}

// ---------------------------------------------------------------------------
// Wat de winkel gebruikt bij het tonen van een prijs
// ---------------------------------------------------------------------------

/** Waar een artikel bij hoort, zodat de juiste regel gevonden kan worden */
export interface MarkupSubject {
  id: string;
  family: ProductFamily;
  categorySlug: string;
  /**
   * TecDoc-soortnummers van het artikel. Alleen onderdelen hebben ze, en een
   * artikel kan er meerdere dragen — motorolie komt terug als [1862, 3224].
   */
  kinds?: ReadonlyArray<string>;
}

export interface MarkupSet {
  /** Opslag in procenten, of `undefined` als geen enkele regel past */
  markupFor(subject: MarkupSubject): number | undefined;
}

export const NO_MARKUP: MarkupSet = { markupFor: () => undefined };

const CACHE_MS = 60_000;
let cache: { at: number; set: MarkupSet; rules: PriceRule[] } | null = null;

/**
 * De smalste regel wint: één artikel gaat vóór een soort, een soort vóór een
 * categorie, een categorie vóór een familie, een familie vóór de hele winkel.
 * Nooit optellen — twee opslagen over elkaar is voor niemand na te rekenen.
 */
function build(rules: ReadonlyArray<PriceRule>): MarkupSet {
  const byPart = new Map<string, number>();
  const byKind = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const byFamily = new Map<string, number>();
  let shopWide: number | undefined;

  for (const rule of rules) {
    switch (rule.scope) {
      case "part":
        byPart.set(rule.target, rule.markupPercent);
        break;
      case "kind":
        byKind.set(rule.target, rule.markupPercent);
        break;
      case "category":
        byCategory.set(rule.target, rule.markupPercent);
        break;
      case "family":
        byFamily.set(rule.family, rule.markupPercent);
        break;
      case "shop":
        shopWide = rule.markupPercent;
        break;
    }
  }

  return {
    markupFor(subject) {
      const part = byPart.get(subject.id);
      if (part !== undefined) return part;

      // Draagt het artikel meerdere soorten, dan telt de laagste opslag. Dat
      // is de veilige kant: liever te goedkoop aanbieden dan een klant een
      // prijs laten zien die bij het afrekenen hoger blijkt.
      let kind: number | undefined;
      for (const id of subject.kinds ?? []) {
        const found = byKind.get(id);
        if (found !== undefined && (kind === undefined || found < kind)) {
          kind = found;
        }
      }
      if (kind !== undefined) return kind;

      const category = subject.categorySlug
        ? byCategory.get(subject.categorySlug)
        : undefined;
      if (category !== undefined) return category;

      return byFamily.get(subject.family) ?? shopWide;
    },
  };
}

async function loadActive(): Promise<{ set: MarkupSet; rules: PriceRule[] }> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache;

  try {
    const rows = await query<RuleRow>(
      `SELECT * FROM price_rules WHERE disabled_at IS NULL`,
    );
    const rules = rows.map(toRule);
    cache = { at: now, set: build(rules), rules };
    return cache;
  } catch (error) {
    // Ligt de database eruit, dan valt de winkel terug op de adviesprijs van
    // de leverancier. Dat is de goede kant om op te falen: die ligt hoger dan
    // welke opslag de beheerder ook instelt, dus we verkopen nooit per
    // ongeluk te goedkoop.
    console.error("Prijsregels konden niet geladen worden", error);
    return cache ?? { set: NO_MARKUP, rules: [] };
  }
}

export async function activeMarkups(): Promise<MarkupSet> {
  return (await loadActive()).set;
}

export async function activePriceRules(): Promise<PriceRule[]> {
  return (await loadActive()).rules;
}

/** Na een wijziging in het paneel hoeft niemand een minuut te wachten */
export function forgetMarkupCache(): void {
  cache = null;
}
