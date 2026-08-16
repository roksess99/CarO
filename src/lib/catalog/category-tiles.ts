import type { ProductFamily } from "./families";

/**
 * Tegels voor het catalogusblok op de homepage.
 *
 * Handmatig samengesteld en niet uit de API gegenereerd: de API levert
 * tientallen categorieën met Duitse namen, terwijl dit blok juist een korte,
 * Nederlandse ingang moet zijn voor wat mensen het vaakst zoeken.
 *
 * Elke tegel wijst naar een pagina die bestaat — de categorieslugs hieronder
 * zijn geverifieerd (HTTP 200). Een tegel toevoegen is één regel hier plus
 * een bestand in `public/categorieen/`.
 */
export interface CategoryTile {
  /** Sleutel in messages onder `categoryTiles` */
  key: string;
  /** Pad in `public/`; verhouding maakt niet uit, de tegel snijdt bij */
  image: string;
  family: ProductFamily;
  /** Zonder categorie linkt de tegel naar de familie zelf */
  category?: string;
}

export const CATEGORY_TILES: CategoryTile[] = [
  { key: "banden", image: "/categorieen/banden.jpg", family: "banden" },
  { key: "velgen", image: "/categorieen/velgen.jpg", family: "velgen" },
  {
    key: "remmen",
    image: "/categorieen/remmen.jpg",
    family: "gebruikt",
    category: "bremsanlage-133",
  },
  {
    key: "motor",
    image: "/categorieen/motor.jpg",
    family: "gebruikt",
    category: "motor-512",
  },
  {
    key: "filters",
    image: "/categorieen/filters.jpg",
    family: "gebruikt",
    category: "filter-414",
  },
  {
    key: "verlichting",
    image: "/categorieen/verlichting.jpg",
    family: "gebruikt",
    category: "beleuchtung-99",
  },
];
