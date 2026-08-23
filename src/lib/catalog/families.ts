// Productfamilies: elke familie is één Tyre24 productArea. Het onderscheid
// loopt door de hele site (navigatie, URL's, kruimelpad, homepage).
//
// De area's staan hier in code en niet in .env: welk assortiment we verkopen
// is een winkelkeuze, net als src/lib/catalog/assortment.ts. In .env staat
// alleen het token (en desgewenst een afwijkende platform-URL).
//
// Alle waarden hieronder zijn gemeten op het echte account (2026-08-07),
// zie docs/api/TYRE24.md. Area's die we bewust NIET verkopen:
//   4  "Flowers"      — bloemen, geen auto-onderdelen
//   5  "Services"     — dienstverlening, 0 artikelen op het NL-platform
//   8  "Alufelgen"    — leeg op beide platformen
// Lichtmetalen velgen komen via de aparte Alloys-API (docs/api/TYRE24.md).

/** Op welk landplatform de area actief is */
type Platform = "nl" | "de";

/** Hoe je in deze familie producten vindt */
type Browse =
  /** Categorieën doorbladeren */
  | "categories"
  /** Alleen zoeken (area 3: searchableByCategory=false, searchPrefix=OEN) */
  | "search";

interface FamilyDefinition {
  areaId: string;
  platform: Platform;
  browse: Browse;
  /** URL-segment per taal; NL is leidend (SEO-regel) */
  slugs: { nl: string; en: string };
}

const FAMILIES = {
  onderdelen: {
    areaId: "3",
    platform: "de",
    browse: "search",
    slugs: { nl: "onderdelen", en: "parts" },
  },
  gebruikt: {
    areaId: "10",
    platform: "de",
    browse: "categories",
    slugs: { nl: "gebruikte-onderdelen", en: "used-parts" },
  },
  banden: {
    areaId: "6",
    platform: "nl",
    browse: "categories",
    slugs: { nl: "banden", en: "tyres" },
  },
  velgen: {
    areaId: "7",
    platform: "nl",
    browse: "categories",
    slugs: { nl: "velgen", en: "wheels" },
  },
  toebehoren: {
    areaId: "1",
    platform: "de",
    browse: "categories",
    slugs: { nl: "toebehoren", en: "accessories" },
  },
  gereedschap: {
    areaId: "9",
    platform: "de",
    browse: "categories",
    slugs: { nl: "gereedschap", en: "tools" },
  },
} as const satisfies Record<string, FamilyDefinition>;

export type ProductFamily = keyof typeof FAMILIES;

export const PRODUCT_FAMILIES = Object.keys(FAMILIES) as ProductFamily[];

/**
 * Indeling van de hoofdnavigatie. Elke familie heeft een eigen knop: de klant
 * ziet het hele assortiment in één oogopslag en hoeft niet te raden onder
 * welke noemer "gebruikte onderdelen" verstopt zit. De groepsvorm blijft
 * bestaan zodat families later alsnog gebundeld kunnen worden.
 */
export const NAV_GROUPS = PRODUCT_FAMILIES.map((family) => ({
  key: family,
  families: [family],
})) satisfies ReadonlyArray<{
  key: string;
  families: ReadonlyArray<ProductFamily>;
}>;

/**
 * URL-segment voor een familie.
 *
 * Arabisch deelt de Engelse slug: Arabisch schrift in een URL wordt
 * percent-encoded en levert onleesbare links op (zie i18n/routing.ts).
 */
export function familySlug(family: ProductFamily, locale: string): string {
  const slugs = FAMILIES[family].slugs;
  return locale === "nl" ? slugs.nl : slugs.en;
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

/** Familie waarin alleen gezocht kan worden, niet gebladerd */
export function isSearchOnly(family: ProductFamily): boolean {
  return FAMILIES[family].browse === "search";
}

export interface FamilySource {
  productAreaId: string;
  baseUrl: string;
}

function platformBaseUrl(platform: Platform): string {
  const override =
    platform === "nl"
      ? process.env.TYRE24_BASE_URL_NL
      : process.env.TYRE24_BASE_URL_DE;
  return (
    override ??
    `https://tyre24.alzura.com/${platform}/${platform}/rest/v13/products`
  );
}

/**
 * Waar de data van een familie vandaan komt. `null` als er geen token is;
 * de shop valt dan terug op de mock (CLAUDE.md, fase 3).
 */
export function familySource(family: ProductFamily): FamilySource | null {
  if (!process.env.TYRE24_API_TOKEN) return null;
  const definition = FAMILIES[family];
  return {
    productAreaId: definition.areaId,
    baseUrl: platformBaseUrl(definition.platform),
  };
}

export function familyHasSource(family: ProductFamily): boolean {
  return familySource(family) !== null;
}
