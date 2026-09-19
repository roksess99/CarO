import type { FilterGroup, SelectedFilters } from "./types";
import type { WearpartsArticle } from "./wearparts";

/**
 * Filteren op eigenschap bij onderdelen — alléén waar de data het draagt.
 *
 * De winkelkeuze van 2026-09-11 was "geen filters op eigenschap bij
 * onderdelen" (@docs/DECISIONS.md #7), en die blijft staan voor remblokken,
 * schokdempers en de rest. Twee redenen: de koppen zijn monteursjargon, en
 * filteren verbergt artikelen waarvoor de fabrikant het veld niet invulde —
 * van 261 remblokken hebben er 116 een `Inbouwplaats`.
 *
 * Bij motorolie gaat geen van beide redenen op, en dat is GEMETEN
 * (2026-09-17, vier auto's, 57 tot 389 artikelen per auto):
 *
 * | Eigenschap | Dekking |
 * |---|---|
 * | Merk (`brandName`) | 100% |
 * | Inhoud in liters (`attr_423`) | 100% |
 * | SAE-viscositeit (`attr_2467` + `attr_1054`) | 99% |
 *
 * En het zijn geen jargonkoppen maar precies de drie dingen die op een fles
 * olie staan en die je moet weten voordat je hem koopt: hoeveel liter, welk
 * merk, welke viscositeit. Zonder filter staan er 389 flessen door elkaar —
 * 1 liter naast een vat van 208 — en daar valt niet in te winkelen.
 *
 * **Het filteren gebeurt hier, niet bij de leverancier.** Drie redenen, in
 * volgorde van zwaarte:
 *
 * 1. De API kent viscositeit onder twee attribuut-ids. GEMETEN op carId
 *    115566: 276 artikelen dragen `attr_2467`, 21 dragen `attr_1054`, geen
 *    enkele allebei — en in de facetten komt `attr_1054` helemaal niet voor.
 *    Filteren via `filter[attr_2467]=5W-30` laat die 21 dus stil vallen.
 *    Hier voegen we de twee samen en klopt het aantal wél.
 * 2. Eén ongefilterde vraag bedient élke filtercombinatie. De call heeft
 *    daarmee steeds dezelfde cachesleutel; filteren bij de leverancier zou
 *    per combinatie een nieuwe zijn, en die limiet is 100 per minuut voor de
 *    hele winkel.
 * 3. De aantallen achter de opties tellen dan echt mee wat er ná filteren
 *    overblijft.
 */

/** Groepen waar filteren op eigenschap aan staat. Uitbreiden = eerst meten. */
const FILTERABLE_GROUPS = new Set<number>([
  1371, // motorolie
]);

export function groupSupportsFilters(groupId: number): boolean {
  return FILTERABLE_GROUPS.has(groupId);
}

/** Groepssleutels in de URL: `?f=viscositeit:5W-30&f=inhoud:5` */
export const PART_FILTER_KEYS = {
  brand: "merk",
  viscosity: "viscositeit",
  volume: "inhoud",
} as const;

/**
 * Vertaalsleutel onder `filters.labels`. Merk deelt die met banden en velgen
 * — het is dezelfde kop, en twee vertalingen van "Merk" lopen onherroepelijk
 * uit elkaar.
 */
const LABEL_KEYS: Record<string, string> = {
  [PART_FILTER_KEYS.brand]: "manufacturer",
  [PART_FILTER_KEYS.viscosity]: "viscosity",
  [PART_FILTER_KEYS.volume]: "volume",
};

/**
 * Attribuut-ids per filter. Meerdere ids per filter omdat de leverancier
 * dezelfde eigenschap onder twee nummers levert — zie de kop van dit bestand.
 */
const VISCOSITY_ATTRS = ["2467", "1054"];
const VOLUME_ATTRS = ["423"];

function attrValue(
  article: WearpartsArticle,
  ids: ReadonlyArray<string>,
): string | undefined {
  for (const id of ids) {
    const value = article.attr?.[id]?.value?.trim();
    if (value) return value;
  }
  return undefined;
}

/** De drie waarden waarop we filteren, uit één artikel */
function valuesOf(article: WearpartsArticle) {
  return {
    [PART_FILTER_KEYS.brand]: article.brandName?.trim() || undefined,
    [PART_FILTER_KEYS.viscosity]: attrValue(article, VISCOSITY_ATTRS),
    [PART_FILTER_KEYS.volume]: attrValue(article, VOLUME_ATTRS),
  };
}

export function articleMatchesFilters(
  article: WearpartsArticle,
  selected: SelectedFilters,
): boolean {
  const values = valuesOf(article);
  for (const [key, chosen] of Object.entries(selected)) {
    if (chosen.length === 0) continue;
    const value = values[key as keyof typeof values];
    // Binnen een groep is het "of", tussen groepen "en" — zelfde gedrag als
    // het filterpaneel bij banden en velgen.
    if (value === undefined || !chosen.includes(value)) return false;
  }
  return true;
}

/**
 * "5W-30" vóór "5W-40" vóór "10W-40": op het winterdeel, dan op het
 * zomerdeel. Alfabetisch zou 10W-40 vóór 5W-30 komen.
 */
function viscosityOrder(value: string): number {
  const match = /^(\d+)W-?(\d+)?/i.exec(value);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 1000 + Number(match[2] ?? 0);
}

function optionSorter(key: string): (a: string, b: string) => number {
  if (key === PART_FILTER_KEYS.volume) {
    return (a, b) => Number(a) - Number(b);
  }
  if (key === PART_FILTER_KEYS.viscosity) {
    return (a, b) => viscosityOrder(a) - viscosityOrder(b) || a.localeCompare(b);
  }
  return (a, b) => a.localeCompare(b, "nl");
}

/** "5" → "5 L". De eenheid staat niet in de waarde; die zetten wij ervoor. */
function optionLabel(key: string, value: string): string {
  return key === PART_FILTER_KEYS.volume ? `${value} L` : value;
}

/**
 * De filtergroepen met hun aantallen.
 *
 * Per groep tellen we op de artikelen die aan de **andere** groepen voldoen.
 * Anders zou de laatste keuze binnen een groep alle andere opties daar op nul
 * zetten en kon de klant er niet meer bijkiezen.
 */
export function partFilterGroups(
  articles: ReadonlyArray<WearpartsArticle>,
  selected: SelectedFilters,
): FilterGroup[] {
  const groups: FilterGroup[] = [];

  for (const key of Object.values(PART_FILTER_KEYS)) {
    const others = Object.fromEntries(
      Object.entries(selected).filter(([other]) => other !== key),
    );
    const counts = new Map<string, number>();
    for (const article of articles) {
      if (!articleMatchesFilters(article, others)) continue;
      const value = valuesOf(article)[key as keyof ReturnType<typeof valuesOf>];
      if (!value) continue;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    // Eén optie filtert niets: elk artikel valt er toch al onder.
    if (counts.size < 2) continue;

    groups.push({
      key,
      // Het label komt uit messages/; `label` is de terugval van
      // filterGroupLabel() en wordt hier dus nooit gelezen.
      label: key,
      labelKey: LABEL_KEYS[key],
      options: [...counts.keys()]
        .sort(optionSorter(key))
        .map((value) => ({
          value,
          label: optionLabel(key, value),
          count: counts.get(value),
        })),
    });
  }

  return groups;
}
