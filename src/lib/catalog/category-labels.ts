// Categorienamen vertalen.
//
// Tyre24 levert categorienamen in de taal van het platform: Nederlands voor
// banden en velgen (nl-platform), Duits voor toebehoren (de-platform). Een
// Engelse bezoeker zag daardoor "Rad & Reifenzubehör" en "Auto / SUV". De
// namen zijn een korte, stabiele lijst per area, dus die vertalen we zelf.
//
// Sleutel is `<productAreaId>.<categoryId>`; de vertalingen staan onder
// `categories` in messages/. Onbekende categorie → naam van de leverancier.

import type { Category } from "./types";
import type { Translator } from "./filter-values";

const LABEL_KEYS: Record<string, string> = {
  // Banden (area 6)
  "6.1": "tyresCar",
  "6.2": "tyresOffroad",
  "6.3": "tyresVan",
  "6.5": "tyresTwoWheeler",
  "6.6": "tyresQuad",
  "6.11": "tyresSmall",
  // Velgen (area 7)
  "7.9999": "steelWheels",
  // Toebehoren (area 1)
  "1.22": "accWheelTyre",
  "1.35": "accCar",
  "1.1554": "accTwoWheeler",
  "1.38": "accBattery",
  "1.1636": "accLighting",
  "1.69": "accOil",
  "1.89": "accCare",
  "1.90": "accSmartRepair",
  "1.325": "accFasteners",
  "1.484": "accPaint",
};

/**
 * Nederlandse URL-slug per categorie, zonder het id-achtervoegsel.
 *
 * De leverancier levert de naam in de taal van zijn platform, en voor
 * toebehoren is dat Duits — dat gaf URL's als
 * `/nl/toebehoren/rad-reifenzubehor-22`, terwijl de regel is dat URL's
 * Nederlandse slugs dragen.
 *
 * Bewust een aparte, bevroren lijst en niet afgeleid uit `categories` in
 * messages/: een tekstcorrectie in een label mag geen URL verhuizen. Verander
 * je hier iets, dan verandert een bestaande URL — de categoriepagina vangt de
 * oude op met een permanente omleiding, want het id achteraan blijft gelijk.
 */
const SLUGS: Record<string, string> = {
  // Banden (area 6)
  "6.1": "auto-suv",
  "6.2": "offroad",
  "6.3": "bestelwagen",
  "6.5": "tweewieler",
  "6.6": "quad-atv",
  "6.11": "kleine-banden",
  // Velgen (area 7)
  "7.9999": "staalvelgen",
  // Toebehoren (area 1) — hier stond het Duits van het de-platform
  "1.22": "wiel-en-bandenaccessoires",
  "1.35": "auto-uitrusting-en-accessoires",
  "1.1554": "tweewieleraccessoires",
  "1.38": "accus-en-acculaders",
  "1.1636": "voertuigverlichting",
  "1.69": "olien-en-smeermiddelen",
  "1.89": "autoverzorging-en-onderhoud",
  "1.90": "smart-repair",
  "1.325": "bevestigingsmateriaal",
  "1.484": "schuren-en-lakken",
};

export function categoryLabelKey(
  productAreaId: string,
  categoryId: number,
): string | undefined {
  return LABEL_KEYS[`${productAreaId}.${categoryId}`];
}

/**
 * Categorie-URL's die 2026-09-08 hernoemd zijn, oud → nieuw.
 *
 * De slugtekst kwam tot dan van de leverancier, en die schrijft toebehoren in
 * het Duits — `/nl/toebehoren/rad-reifenzubehor-22`. De proxy stuurt de oude
 * adressen permanent door, zodat bestaande links en de plek in Google blijven
 * werken. Deze lijst is klaar: er komt niets bij tenzij `SLUGS` hierboven
 * opnieuw verandert.
 */
export const RENAMED_CATEGORY_SLUGS: Record<string, string> = {
  "transporter-3": "bestelwagen-3",
  "rad-reifenzubehor-22": "wiel-en-bandenaccessoires-22",
  "pkw-ausstattung-zubehor-35": "auto-uitrusting-en-accessoires-35",
  "zweirad-ausstattung-zubehor-1554": "tweewieleraccessoires-1554",
  "batterien-batterie-ladegerate-38": "accus-en-acculaders-38",
  "fahrzeugbeleuchtung-1636": "voertuigverlichting-1636",
  "ole-schmier-und-betriebsstoffe-69": "olien-en-smeermiddelen-69",
  "autopflege-wartung-89": "autoverzorging-en-onderhoud-89",
  "schleifen-lackieren-484": "schuren-en-lakken-484",
  "befestigungstechnik-325": "bevestigingsmateriaal-325",
};

/**
 * Het Tyre24-id achter aan een categorieslug, of `null` als het ontbreekt.
 *
 * Het id is het stabiele deel van de URL: de tekst ervoor mag veranderen (en
 * is dat 2026-09-08 ook, van Duits naar Nederlands) zonder dat we een
 * categorie kwijtraken.
 */
export function categoryIdFromSlug(slug: string): number | null {
  const match = /-(\d+)$/.exec(slug);
  return match ? Number(match[1]) : null;
}

/**
 * Slugtekst voor een categorie. Onbekend → `undefined`, dan valt de provider
 * terug op de naam van de leverancier.
 */
export function categorySlugText(
  productAreaId: string,
  categoryId: number,
): string | undefined {
  return SLUGS[`${productAreaId}.${categoryId}`];
}

/** Naam van een categorie in de taal van de shop, met terugval op de API. */
export function categoryLabel(category: Category, t: Translator): string {
  const key = category.labelKey ?? "";
  return key && t.has(key) ? t(key) : category.name;
}
