import type { ProductFamily } from "./families";

/**
 * Beeld per productfamilie voor het catalogusblok op de homepage.
 *
 * Eigen foto's en niet de `image`-URL uit de API: die levert voor élke
 * categorie exact hetzelfde bestand van 1789 bytes (gemeten 2026-08-16),
 * net als bij de productfoto's — een generieke placeholder.
 *
 * De tegels klappen uit naar de categorieën van de familie. Die komen uit de
 * provider, dus een nieuwe categorie bij de leverancier verschijnt vanzelf.
 */
export const FAMILY_TILE_IMAGES: Record<ProductFamily, string> = {
  onderdelen: "/categorieen/onderdelen.jpg",
  banden: "/categorieen/banden.jpg",
  velgen: "/categorieen/velgen.jpg",
  toebehoren: "/categorieen/toebehoren.jpg",
};
