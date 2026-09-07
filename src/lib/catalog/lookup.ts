import { type ProductFamily, usesVehicleCatalog } from "./families";
import { getCatalogProvider } from "./provider";
import type { Part } from "./types";
import { idFromPartSlug, partById } from "./wearparts-provider";

// Eén artikel opzoeken, ongeacht welke catalogus erachter zit.
//
// Onderdelen komen uit Wearparts en zitten NIET in de Tyre24-provider: die
// kent alleen families met een productArea. Wie dat vergeet krijgt stilletjes
// null terug — zo verdwenen onderdelen eerder uit de winkelwagen. Vandaar dat
// elke opzoeking op id of slug via dit bestand loopt.

export async function loadPartBySlug(
  family: ProductFamily,
  slug: string,
): Promise<Part | null> {
  if (usesVehicleCatalog(family)) {
    const id = idFromPartSlug(slug);
    return id ? partById(id) : null;
  }
  return getCatalogProvider().getPartBySlug(family, slug);
}

export async function loadPartById(
  family: ProductFamily,
  id: string,
): Promise<Part | null> {
  if (usesVehicleCatalog(family)) {
    return partById(id);
  }
  return getCatalogProvider().getPartById(family, id);
}
