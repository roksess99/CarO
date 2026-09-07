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
//   9  "Werkzeuge"    — gereedschap; winkelkeuze 2026-09-05, we verkopen
//                       geen gereedschap meer
//  10  "Gebrauchtteile" — gebruikte onderdelen; winkelkeuze 2026-09-05,
//                       tweedehands past niet bij het aanbod
// Lichtmetalen velgen komen via de aparte Alloys-API (docs/api/TYRE24.md).

/** Op welk landplatform de area actief is */
type Platform = "nl" | "de";

/** Hoe je in deze familie producten vindt */
type Browse =
  /** Categorieën doorbladeren */
  | "categories"
  /** Zoeken op naam, en bladeren zodra er een auto gekozen is */
  | "vehicle";

/** Welke API de familie bedient */
type Catalog =
  /** Products REST API v1.3 — banden, velgen, toebehoren */
  | "products"
  /** Wearparts REST API v1.6 — onderdelen (docs/api/WEARPARTS.md) */
  | "wearparts";

interface FamilyDefinition {
  areaId: string;
  platform: Platform;
  browse: Browse;
  catalog: Catalog;
  /** URL-segment per taal; NL is leidend (SEO-regel) */
  slugs: { nl: string; en: string };
}

const FAMILIES = {
  // Onderdelen draaien sinds 2026-09-06 op de Wearparts-API. Die kent wél
  // een categorieboom en zoeken op naam; product area 3 kon alleen exacte
  // OE-nummers en was niet actief op het NL-platform (DECISIONS #7).
  onderdelen: {
    areaId: "",
    platform: "nl",
    browse: "vehicle",
    catalog: "wearparts",
    slugs: { nl: "onderdelen", en: "parts" },
  },
  banden: {
    areaId: "6",
    platform: "nl",
    browse: "categories",
    catalog: "products",
    slugs: { nl: "banden", en: "tyres" },
  },
  velgen: {
    areaId: "7",
    platform: "nl",
    browse: "categories",
    catalog: "products",
    slugs: { nl: "velgen", en: "wheels" },
  },
  toebehoren: {
    areaId: "1",
    platform: "de",
    browse: "categories",
    catalog: "products",
    slugs: { nl: "toebehoren", en: "accessories" },
  },
} as const satisfies Record<string, FamilyDefinition>;

export type ProductFamily = keyof typeof FAMILIES;

export const PRODUCT_FAMILIES = Object.keys(FAMILIES) as ProductFamily[];

/**
 * Indeling van de hoofdnavigatie. Elke familie heeft een eigen knop: de klant
 * ziet het hele assortiment in één oogopslag. De groepsvorm blijft bestaan
 * zodat families later alsnog gebundeld kunnen worden.
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

/** Familie waarvan de catalogus aan een gekozen auto hangt */
export function usesVehicleCatalog(family: ProductFamily): boolean {
  return FAMILIES[family].catalog === "wearparts";
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
  // Deze familie komt van een andere API; de Products-adapter heeft er niets
  // te zoeken en zou anders area "" opvragen.
  if (definition.catalog !== "products") return null;
  return {
    productAreaId: definition.areaId,
    baseUrl: platformBaseUrl(definition.platform),
  };
}

