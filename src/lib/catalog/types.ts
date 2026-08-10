import type { ProductFamily } from "./families";

// Datacontract van de catalogus. Componenten importeren ALLEEN uit dit
// bestand — nooit uit de mock of een echte adapter (CLAUDE.md, fase 1/2).
// Past de echte API hier straks niet op, dan passen we de adapter aan.

export type Availability = "in-stock" | "ordered" | "out-of-stock";

export interface Category {
  slug: string;
  name: string;
}

export interface Part {
  id: string;
  slug: string;
  name: string;
  /** Fabrikant, bv. Bosch of Brembo */
  brand: string;
  /** OE-referentienummer — data, geen UI-tekst; tabular-nums bij weergave */
  oeNumber: string;
  /** Onderdelen of banden — bepaalt de URL en de navigatie */
  family: ProductFamily;
  categorySlug: string;
  /** Weergavenaam van de categorie; niet elke area levert een categorielijst */
  categoryName: string;
  /** Integer in eurocenten, inclusief 21% btw. Nooit floats voor geld. */
  priceCents: number;
  availability: Availability;
  imageUrl?: string;
}

/** Eén keuzemogelijkheid binnen een filtergroep */
export interface FilterOption {
  /** Waarde zoals die in de URL staat, bv. "Winterbanden" of "CONTINENTAL" */
  value: string;
  /** Wat de klant leest; vaak gelijk aan value */
  label: string;
  /** Aantal artikelen met deze waarde, als de bron dat meegeeft */
  count?: number;
}

/** Een filterblok, bv. "Merk" of "Inzet" (seizoen) */
export interface FilterGroup {
  /** Stabiele sleutel voor de URL, bv. "merk" of "inzet" */
  key: string;
  /** Kop boven het blok, komt uit de API en is dus al vertaald */
  label: string;
  options: FilterOption[];
}

/** Gekozen filters: groepssleutel → gekozen waarden */
export type SelectedFilters = Record<string, string[]>;

export interface PartQuery {
  family: ProductFamily;
  categorySlug?: string;
  /** Exacte fabrikantnaam, bv. "Bosch" */
  brand?: string;
  /** Actieve filters uit de URL */
  filters?: SelectedFilters;
  /**
   * Vrije zoekterm. Bij Tyre24 area 3 (nieuwe onderdelen) is dit het enige
   * ingangspunt en moet het een VOLLEDIG OE-nummer zijn — deelnummers,
   * wildcards en productnamen geven nul resultaten (gemeten 2026-08-07).
   */
  search?: string;
  limit?: number;
}

export interface CatalogProvider {
  getCategories(family: ProductFamily): Promise<Category[]>;
  getParts(query: PartQuery): Promise<Part[]>;
  getPartBySlug(family: ProductFamily, slug: string): Promise<Part | null>;
  /**
   * Eén artikel op id. Nodig voor de winkelwagen: die kent alleen id's en
   * mag niet afhangen van "staat het toevallig in de opgehaalde lijst".
   */
  getPartById(family: ProductFamily, id: string): Promise<Part | null>;
  /**
   * Beschikbare filters binnen een categorie. Welke groepen er zijn bepaalt
   * de bron, niet wij — bij banden levert Tyre24 o.a. merk, seizoen,
   * laadindex, M+S en 3PMSF.
   */
  getFilters(
    family: ProductFamily,
    categorySlug: string,
  ): Promise<FilterGroup[]>;
}
