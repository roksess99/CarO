import nl from "../../../messages/nl.json";
import {
  PRODUCT_FAMILIES,
  type ProductFamily,
  usesVehicleCatalog,
} from "@/lib/catalog/families";
import { getCatalogProvider } from "@/lib/catalog/provider";

/**
 * Keuzelijsten voor het kortingsformulier.
 *
 * De beheerder typte de categorie eerder zelf over uit de URL. Eén tikfout en
 * de actie deed niets — zonder foutmelding, want een slug die nergens op slaat
 * is niet van een geldige te onderscheiden. Daarom komen de categorieën hier
 * uit dezelfde bron als de winkel zelf.
 *
 * Onderdelen ontbreken met opzet: hun categorieboom hangt aan een auto
 * (`/category` zonder carId antwoordt met ERR_MISSING_MANDATORY_PARAMETER), en
 * een artikel dat via de zoekfunctie binnenkomt draagt helemaal geen
 * categorie. Een categoriekorting op onderdelen zou dus op de ene pagina wél
 * gelden en op de andere niet. Daar is de familie- of artikelkorting voor.
 */

export interface CategoryOption {
  slug: string;
  name: string;
}

export type CategoryOptions = Record<ProductFamily, CategoryOption[]>;

// De namen die de klant ziet. De leverancier levert ze in de taal van zijn
// platform — toebehoren komt van het Duitse — dus zoeken we hetzelfde label op
// dat de winkel toont, anders staat er "Rad & Reifenzubehör" in het paneel.
const LABELS: Record<string, string> = nl.categories;

export async function categoryOptions(): Promise<CategoryOptions> {
  const provider = getCatalogProvider();
  const entries = await Promise.all(
    PRODUCT_FAMILIES.map(async (family): Promise<[ProductFamily, CategoryOption[]]> => {
      if (usesVehicleCatalog(family)) return [family, []];
      const categories = await provider.getCategories(family);
      return [
        family,
        categories.map((category) => ({
          slug: category.slug,
          name: (category.labelKey && LABELS[category.labelKey]) || category.name,
        })),
      ];
    }),
  );
  return Object.fromEntries(entries) as CategoryOptions;
}

/** Bestaat deze categorie echt binnen deze familie? */
export function isKnownCategory(
  options: CategoryOptions,
  family: ProductFamily,
  slug: string,
): boolean {
  return options[family].some((option) => option.slug === slug);
}
