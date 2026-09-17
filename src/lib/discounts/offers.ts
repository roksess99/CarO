import { usesVehicleCatalog } from "@/lib/catalog/families";
import { loadPartById } from "@/lib/catalog/lookup";
import { getCatalogProvider } from "@/lib/catalog/provider";
import type { Part } from "@/lib/catalog/types";
import { activeRules, type DiscountRule } from "./rules";

/**
 * De artikelen die nú in de aanbieding zijn.
 *
 * Andersom geredeneerd dan de rest van de winkel: die kijkt per artikel of er
 * een regel op past, dit begint bij de regel en zoekt de artikelen erbij. Dat
 * kost API-verkeer, dus het antwoord blijft een kwartier staan — de homepage is
 * de drukste pagina van de winkel en dit rijtje verandert hooguit een paar keer
 * per week (docs/DECISIONS.md #14).
 *
 * **Niet elke regel levert artikelen op.** Onderdelen hangen aan een auto: hun
 * categorieboom en artikellijst zijn niet op te vragen zonder `carId`. Een
 * korting op de hele groep onderdelen werkt dus wél in de winkel, maar is hier
 * niet te tonen. Eén artikel aanwijzen kan altijd.
 */

/** Hoeveel artikelen we per regel ophalen om uit te kiezen */
const PER_RULE = 24;

/** Meer regels dan dit tegelijk uitpluizen is het niet waard; vijf acties is al veel */
const MAX_RULES = 6;

const CACHE_MS = 15 * 60_000;
let cache: { at: number; signature: string; parts: Part[] } | null = null;

/**
 * Welke acties er lopen, als één tekenreeks.
 *
 * Het kwartier geheugen is voor het API-verkeer, maar het mag geen actie laten
 * doorlopen die er niet meer is: een regel die op zijn einddatum afloopt komt
 * langs niemand die de cache kan wissen. Verandert de verzameling regels, dan
 * wordt het rijtje opnieuw opgehaald — ook binnen het kwartier.
 */
function signatureOf(rules: ReadonlyArray<DiscountRule>): string {
  return rules
    .map((rule) => `${rule.id}:${rule.percent}`)
    .sort()
    .join("|");
}

async function partsForRule(rule: DiscountRule): Promise<Part[]> {
  if (!rule.family) return [];

  if (rule.scope === "part") {
    const part = await loadPartById(rule.family, rule.target);
    return part ? [part] : [];
  }

  // De catalogus van onderdelen is niet te bevragen zonder gekozen auto
  if (usesVehicleCatalog(rule.family)) return [];

  return getCatalogProvider().getParts({
    family: rule.family,
    categorySlug: rule.scope === "category" ? rule.target : undefined,
    limit: PER_RULE,
  });
}

export async function offerParts(limit = 8): Promise<Part[]> {
  const now = Date.now();
  const rules = (await activeRules()).slice(0, MAX_RULES);
  const signature = signatureOf(rules);

  if (cache && cache.signature === signature && now - cache.at < CACHE_MS) {
    return cache.parts.slice(0, limit);
  }

  if (rules.length === 0) {
    cache = { at: now, signature, parts: [] };
    return [];
  }

  let found: Part[] = [];
  try {
    const lists = await Promise.all(rules.map((rule) => partsForRule(rule)));
    // Alleen artikelen waar de korting ook echt op uitkomt: de
    // marge-ondergrens kan hem bij een deel van een categorie opeten, en dan
    // is er niets aan te kondigen.
    const byId = new Map<string, Part>();
    for (const part of lists.flat()) {
      if ((part.discountPercent ?? 0) > 0) byId.set(part.id, part);
    }
    found = [...byId.values()].sort(
      (a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0),
    );
  } catch (error) {
    // Ligt de leverancier eruit, dan toont de homepage gewoon de gewone banner
    console.error("Aanbiedingen konden niet geladen worden", error);
    return cache?.parts.slice(0, limit) ?? [];
  }

  cache = { at: now, signature, parts: found };
  return found.slice(0, limit);
}

/** Na een wijziging in het paneel hoeft niemand een kwartier te wachten */
export function forgetOffers(): void {
  cache = null;
}
