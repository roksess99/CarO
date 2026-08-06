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
  categorySlug: string;
  /** Integer in eurocenten, inclusief 21% btw. Nooit floats voor geld. */
  priceCents: number;
  availability: Availability;
  imageUrl?: string;
}

export interface PartQuery {
  categorySlug?: string;
  limit?: number;
}

export interface CatalogProvider {
  getCategories(): Promise<Category[]>;
  getParts(query?: PartQuery): Promise<Part[]>;
  getPartBySlug(slug: string): Promise<Part | null>;
}
