// Welke eigenschappen van een onderdeel als filter in beeld komen.
//
// De Wearparts-API geeft bij elke categorie facetten terug: per eigenschap de
// waarden met hun aantal. Het probleem is dat het er véél zijn en dat het
// merendeel niets is om op te filteren. GEMETEN 2026-09-11 op remblokken voor
// carId 128136: 36 `attr_*`-facetten, waaronder OE-nummers (`1607083180`),
// interne codes (`ST30/20X147A`) en maatvoering in millimeters.
//
// Een vaste allowlist van attribuut-ids zoals bij de Products-API
// (filter-groups.ts) werkt hier niet: elk artikeltype heeft zijn eigen
// eigenschappen, en dat zijn er duizenden. Wat wél blijkt te werken is
// **dekking**. Gemeten over vijf categorieën voor dezelfde auto:
//
// | Categorie    | Bruikbaar                            | Dekking  |
// |---|---|---|
// | Luchtfilter  | Filter type                          | 59/59    |
// | Schokdemper  | Inbouwtype, Bevestigingstype         | 55/55    |
// | Schokdemper  | Inbouwplaats                         | 47/55    |
// | Remschijf    | Remschijftype                        | 283/283  |
// | Remschijf    | Oppervlakte                          | 181/283  |
// | Remschijf    | Inbouwplaats                         | 114/283  |
// | Wisserblad   | Soort wisserblad                     | 82/113   |
//
// En de rommel waar het om ging:
//
// | Categorie    | Onbruikbaar                          | Dekking  |
// |---|---|---|
// | Oliefilter   | `OCS 1 / J9131003 / LS 7`            | 5/73     |
// | Schokdemper  | `ST30/20X147A / SE32/15X142A`        | 3/55     |
// | Remschijf    | `J / JC`                             | 3/283    |
//
// De grens ligt dus rond 40%: eigenschappen die de leverancier bij vrijwel
// elk artikel invult zijn productkenmerken, eigenschappen die bij een handvol
// artikelen staan zijn leveranciersadministratie.

import type { ArticleFacet } from "./wearparts";
import type { FilterGroup } from "./types";

/** Onder deze dekking is het geen productkenmerk maar administratie */
const MIN_COVERAGE = 0.4;

/**
 * Een keuzelijst van één optie filtert niets, en boven de acht is het geen
 * keuze meer maar een opsomming — dan staan er meestal maten in.
 */
const MIN_VALUES = 2;
const MAX_VALUES = 8;

/** Sleutel in de URL: `attr_100` wordt `e100`, net zo kort als `a238` */
export function partFilterKey(attributeId: string): string {
  return `e${attributeId}`;
}

export function attributeIdFromKey(key: string): string | null {
  return key.startsWith("e") ? key.slice(1) : null;
}

/**
 * Is dit een getal? Maatvoering ("15.8", "87", "136,8") hoort niet in een
 * keuzelijst: daar zijn het er tientallen van en niemand filtert zijn
 * remschijf op 136,8 mm breed. Die staan wél op de productpagina.
 */
function isNumeric(value: string): boolean {
  return !Number.isNaN(Number(value.replace(",", ".")));
}

/**
 * Facetten → filtergroepen, met de naam van de eigenschap uit de artikelen
 * zelf.
 *
 * De facetten dragen alleen de wáárden, niet hoe de eigenschap heet. Die naam
 * staat in `attr` op elk artikel dat hem heeft — vandaar `labels`, dat de
 * aanroeper uit de opgehaalde artikelen samenstelt. Kennen we de naam niet,
 * dan laten we de groep weg: een kop "attr_2338" is geen filter.
 */
export function partFilterGroups(
  facets: readonly ArticleFacet[],
  labels: ReadonlyMap<string, string>,
  total: number,
): FilterGroup[] {
  if (total === 0) return [];

  return facets
    .flatMap((facet) => {
      const label = labels.get(facet.id);
      if (!label) return [];
      if (facet.values.length < MIN_VALUES) return [];
      if (facet.values.length > MAX_VALUES) return [];
      if (facet.values.some((entry) => isNumeric(entry.value))) return [];

      const covered = facet.values.reduce((sum, v) => sum + v.count, 0);
      if (covered / total < MIN_COVERAGE) return [];

      return [
        {
          key: partFilterKey(facet.id),
          label,
          options: [...facet.values]
            .sort((a, b) => b.count - a.count)
            .map((entry) => ({
              value: entry.value,
              label: entry.value,
              count: entry.count,
            })),
          // Eigen veld: hoeveel van de artikelen deze eigenschap überhaupt
          // hebben. De UI waarschuwt als filteren een deel verbergt.
          coverage: covered / total,
        } satisfies FilterGroup & { coverage: number },
      ];
    })
    .sort((a, b) => b.coverage - a.coverage);
}

/**
 * Gekozen filters uit de URL → wat `searchArticles` verwacht.
 *
 * Eén waarde per eigenschap: de API kan er meer aan, maar dat is niet gemeten
 * en "vooras óf achteras" is geen keuze die een klant maakt.
 */
export function toAttributeFilters(
  selected: Record<string, string[]>,
): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const [key, values] of Object.entries(selected)) {
    const id = attributeIdFromKey(key);
    const value = values[0];
    if (id && value) attributes[id] = value;
  }
  return attributes;
}

/**
 * Namen van eigenschappen uit de opgehaalde artikelen.
 *
 * Niet alleen uit het eerste artikel: bij wisserbladen draagt het eerste
 * artikel geen `Inbouwplaats`, terwijl de helft van de lijst hem wél heeft.
 * Eén keer alle artikelen langs kost niets en vult de koppen compleet.
 */
export function attributeLabels(
  articles: ReadonlyArray<{
    attr?: Record<string, { translation?: string }> | undefined;
  }>,
): Map<string, string> {
  const labels = new Map<string, string>();
  for (const article of articles) {
    for (const [id, attribute] of Object.entries(article.attr ?? {})) {
      const name = attribute?.translation?.trim();
      if (name && !labels.has(id)) labels.set(id, name);
    }
  }
  return labels;
}
