// Productfamilies: de shop verkoopt twee soorten dingen en dat onderscheid
// loopt door de hele site (navigatie, URL's, kruimelpad).
//
// Elke familie hangt aan een eigen Tyre24 productArea. Let op: die kunnen op
// een ánder platform zitten — gebruikte onderdelen (area 10) bestaan alleen
// op /de/de/, banden (area 6) op /nl/nl/. Zie docs/api/TYRE24.md.

export const PRODUCT_FAMILIES = ["onderdelen", "banden"] as const;

export type ProductFamily = (typeof PRODUCT_FAMILIES)[number];

/** URL-segment per taal. NL is leidend (SEO-regel: Nederlandse slugs). */
const FAMILY_SLUGS: Record<ProductFamily, Record<string, string>> = {
  onderdelen: { nl: "onderdelen", en: "parts" },
  banden: { nl: "banden", en: "tyres" },
};

export function familySlug(family: ProductFamily, locale: string): string {
  return FAMILY_SLUGS[family][locale] ?? FAMILY_SLUGS[family].nl;
}

/** URL-segment → familie. Onbekend segment → null (pagina geeft 404). */
export function familyFromSlug(
  slug: string,
  locale: string,
): ProductFamily | null {
  for (const family of PRODUCT_FAMILIES) {
    if (familySlug(family, locale) === slug) return family;
  }
  return null;
}

export interface FamilySource {
  /** Tyre24 productAreaId */
  productAreaId: string;
  baseUrl: string;
}

const NL_BASE = "https://tyre24.alzura.com/nl/nl/rest/v13/products";

/**
 * Waar de data van een familie vandaan komt. `null` = nog geen bron, de
 * familie toont dan een eerlijke lege staat in plaats van verzonnen producten.
 *
 * Banden: area 6 op het NL-platform, werkt.
 * Onderdelen: dit account heeft geen area met nieuwe onderdelen. Zetten we
 * TYRE24_PARTS_AREA_ID (+ eventueel TYRE24_PARTS_BASE_URL voor het
 * DE-platform), dan vult de familie zich. Zie docs/DECISIONS.md #7.
 */
/** Heeft deze familie een databron? (los van of er categorieën zijn) */
export function familyHasSource(family: ProductFamily): boolean {
  return familySource(family) !== null;
}

export function familySource(family: ProductFamily): FamilySource | null {
  if (family === "banden") {
    const productAreaId = process.env.TYRE24_PRODUCT_AREA_ID;
    if (!productAreaId) return null;
    return {
      productAreaId,
      baseUrl: process.env.TYRE24_BASE_URL ?? NL_BASE,
    };
  }

  const productAreaId = process.env.TYRE24_PARTS_AREA_ID;
  if (!productAreaId) return null;
  return {
    productAreaId,
    baseUrl: process.env.TYRE24_PARTS_BASE_URL ?? NL_BASE,
  };
}
