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

export function categoryLabelKey(
  productAreaId: string,
  categoryId: number,
): string | undefined {
  return LABEL_KEYS[`${productAreaId}.${categoryId}`];
}

/** Naam van een categorie in de taal van de shop, met terugval op de API. */
export function categoryLabel(category: Category, t: Translator): string {
  const key = category.labelKey ?? "";
  return key && t.has(key) ? t(key) : category.name;
}
