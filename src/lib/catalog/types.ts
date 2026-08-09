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

export interface PartQuery {
  family: ProductFamily;
  categorySlug?: string;
  /** Exacte fabrikantnaam, bv. "Bosch" */
  brand?: string;
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
}
