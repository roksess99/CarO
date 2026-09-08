import { z } from "zod";
import { consumerPriceCents } from "../pricing";
import {
  categoryIdFromSlug,
  categoryLabelKey,
  categorySlugText,
} from "./category-labels";
import {
  API_MANUFACTURER_KEY,
  filterGroupOrder,
  filterLabelKey,
  isFilterGroupAllowed,
  isRealBrand,
} from "./filter-groups";
import { hasAssortmentFilter, isCategoryInAssortment } from "./assortment";
import { type FamilySource, familySource, type ProductFamily } from "./families";
import type {
  CatalogProvider,
  Category,
  FilterGroup,
  Part,
  PartQuery,
  SelectedFilters,
} from "./types";

// Tyre24/ALZURA-adapter (docs/api/TYRE24.md). Draait UITSLUITEND server-side:
// het token is een secret en de rate limit is 100 requests/minuut.
// Alle responses gaan door Zod aan de rand; daarbinnen is alles getypeerd.

// ---------- configuratie ----------

/** Bron van een familie, of null als die (nog) geen productArea heeft */
function getSource(family: ProductFamily): (FamilySource & { token: string }) | null {
  if (typeof window !== "undefined") {
    throw new Error("tyre24-provider mag nooit in de browser draaien");
  }
  const token = process.env.TYRE24_API_TOKEN;
  const source = familySource(family);
  if (!token || !source) return null;
  return { ...source, token };
}

// ---------- zod-schema's (alleen de velden die wij lezen) ----------

// De API levert numerieke waardes regelmatig als string → overal coerce.
const tyreCategorySchema = z.object({
  categoryId: z.coerce.number(),
  name: z.string(),
});

// GEMETEN 2026-08-07: elke distributeur levert meerdere prijsblokken met een
// `type`. "ek" = inkoopprijs (Einkaufspreis), "evp_3" = adviesverkoopprijs.
// De sleutel binnen `prices` is "1", NIET de productAreaId.
// GEMETEN 2026-08-07: paginering is 0-geïndexeerd. `page=1` levert de TWEEDE
// pagina — bij weinig treffers dus een lege lijst. De default is 0.
const FIRST_PAGE = 0;

/** Groepssleutel van het merkfilter; die gaat naar een eigen parameter */
const MANUFACTURER_KEY = "manufacturer";
/** Aantal artikelen waarover de attribuutfilters worden berekend */
const FILTER_SAMPLE_SIZE = 100;

const PURCHASE_PRICE_TYPE = "ek";
const RETAIL_PRICE_PREFIX = "evp";

const tyrePriceSchema = z.object({
  type: z.string().optional(),
  currency: z.string().optional(),
  prices: z
    .record(z.string(), z.object({ base: z.string().optional() }))
    .optional(),
});

const tyreDistributorSchema = z.object({
  prices: z.array(tyrePriceSchema).optional(),
});

const tyreMediaSchema = z.object({
  isDefault: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  imageLink: z.string().optional(),
});

/** Categorieboom: /categories geeft de kinderen genest mee */
type CategoryTree = {
  categoryId: number;
  children?: CategoryTree[];
};
const categoryTreeSchema: z.ZodType<CategoryTree> = z.lazy(() =>
  z.object({
    categoryId: z.coerce.number(),
    children: z.array(categoryTreeSchema).optional(),
  }),
);

const tyreItemSchema = z.object({
  itemId: z.coerce.number(),
  name: z.string(),
  manufacturerName: z.string().optional(),
  manufacturerItemNumber: z.string().optional(),
  stock: z.coerce.number().optional(),
  identifications: z
    .object({ OEN: z.array(z.string()).optional() })
    .optional(),
  categories: z.array(tyreCategorySchema).optional(),
  distributors: z.array(tyreDistributorSchema).optional(),
  media: z.array(tyreMediaSchema).optional(),
  // Attributen en maten voeden de specificatietabel op de productpagina.
  attributeValues: z
    .record(
      z.string(),
      z.object({
        name: z.string().optional(),
        value: z.string().optional(),
        values: z
          .array(z.object({ translated_value: z.string().optional() }))
          .optional(),
      }),
    )
    .optional()
    .catch(undefined),
  sizes: z
    .array(
      z.object({
        tyreWidth: z.coerce.number().optional(),
        tyreHeight: z.coerce.number().optional(),
        design: z.string().optional(),
        tyreDiameter: z.coerce.number().optional(),
      }),
    )
    .optional()
    .catch(undefined),
});

/**
 * Attribuutnamen die we op de productpagina tonen, met hun vertaalsleutel
 * onder `product.specs`. Net als bij de filters is de sleutel van de API de
 * attribuutnaam in de taal van het platform (nl voor banden en velgen, de
 * voor toebehoren). Alles wat hier niet staat laten we weg: het merendeel is
 * interne codering ("systeem: 73", "DA: 3").
 */
const SPEC_KEYS: Record<string, string> = {
  // Banden
  Inzet: "season",
  Snelheidsindex: "speedIndex",
  laadindex: "loadIndex",
  // Velgen — dit bepaalt of een velg past
  Velgmaat: "rimSize",
  Velgverbinding: "boltPattern",
  ET: "offset",
  "Max. draagkracht": "maxLoad",
  wielmontage: "wheelMounting",
  // Toebehoren (DE-platform, dus Duitse attribuutnamen)
  Farbe: "colour",
  Material: "material",
  "Größe": "size",
  Inhalt: "content",
  Verpackungseinheit: "packaging",
};

/**
 * Naam met het merk ervoor, tenzij het er al staat.
 *
 * "CONTI TS860 195/65 R15 91 H" is van CONTINENTAL, maar dat las je nergens.
 * Alleen bij een écht merk: bij velgen staat in dit veld een omschrijving
 * ("STAHLRAD OE QUALITÄT: ALCAR,KPZ,SÜDRAD,MWD"), en die hoort niet in een
 * productnaam — zie isRealBrand() in filter-groups.ts.
 */
function displayName(item: z.infer<typeof tyreItemSchema>): string {
  const brand = item.manufacturerName?.trim();
  if (!brand || !isRealBrand(brand)) return item.name;
  return item.name.toLowerCase().startsWith(brand.toLowerCase())
    ? item.name
    : `${brand} ${item.name}`;
}

/**
 * Onderscheidende eigenschap voor op de productkaart, in volgorde van
 * bruikbaarheid. Staat de waarde al in de naam — de bandenmaat bijvoorbeeld —
 * dan voegt herhalen niets toe.
 */
const VARIANT_KEYS = ["season", "colour", "material", "size", "rimSize"];

function variantOf(
  specs: ReadonlyArray<{ key: string; value: string }>,
  name: string,
): string | undefined {
  for (const key of VARIANT_KEYS) {
    const value = specs.find((spec) => spec.key === key)?.value;
    if (value && !name.toLowerCase().includes(value.toLowerCase())) {
      return value;
    }
  }
  return undefined;
}

/** Bandenmaat uit het `sizes`-blok: 195/65 R15 */
function sizeLabel(item: z.infer<typeof tyreItemSchema>): string | null {
  const size = item.sizes?.[0];
  if (!size?.tyreWidth || !size.tyreHeight || !size.tyreDiameter) return null;
  return `${size.tyreWidth}/${size.tyreHeight} ${size.design ?? ""}${size.tyreDiameter}`
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Specificaties voor de productpagina. De waarden blijven staan zoals de
 * leverancier ze schrijft; de UI haalt ze door dezelfde woordenlijst als de
 * filterwaarden, zodat "Winterreifen" alsnog "winterband" wordt.
 */
function toSpecs(
  item: z.infer<typeof tyreItemSchema>,
): Array<{ key: string; value: string }> {
  const specs: Array<{ key: string; value: string }> = [];

  const size = sizeLabel(item);
  if (size) specs.push({ key: "size", value: size });

  for (const attribute of Object.values(item.attributeValues ?? {})) {
    const key = attribute.name ? SPEC_KEYS[attribute.name] : undefined;
    if (!key || specs.some((spec) => spec.key === key)) continue;
    const value = attribute.values?.[0]?.translated_value ?? attribute.value;
    // "Keine Angabe" is de leverancier die zegt dat hij het niet weet; dat is
    // geen specificatie maar ruis.
    if (!value || /^keine angabe$/i.test(value)) continue;
    specs.push({ key, value });
  }

  if (item.manufacturerItemNumber) {
    specs.push({ key: "itemNumber", value: item.manufacturerItemNumber });
  }
  return specs;
}

// GEMETEN: elke filtergroep geeft per optie een base64-"identifier"
// (bv. "NjE3fkFMVEVOWk8" = "617~ALTENZO"). /items verwacht die identifier,
// niet de leesbare waarde: merken via `manufacturer`, alle overige
// eigenschappen via `attributeStrings`.
//
// Sommige opties hebben een `values`-array met de vertaalde weergavetekst
// ("Winterbanden"); anders is `value` zelf de tekst.
const filterOptionSchema = z.object({
  identifier: z.string().optional(),
  value: z.string().optional(),
  count: z.coerce.number().optional(),
  values: z
    .array(z.object({ translated_value: z.string().optional() }))
    .optional(),
});

const filterGroupSchema = z.object({
  name: z.string().optional(),
  filter: z.array(filterOptionSchema).optional(),
});

const itemsResponseSchema = z.object({
  result: z.array(z.unknown()).optional(),
  // LET OP: het type van `filter` wisselt! Bij een categorie-query is het een
  // object, bij een itemId-query een lege array. `.catch()` zorgt dat een
  // afwijkend filterblok nooit de hele response — en dus alle producten —
  // ongeldig maakt. Het filter is een bonus, geen voorwaarde.
  filter: z
    .record(z.string(), filterGroupSchema)
    .optional()
    .catch(undefined),
});

/**
 * GEMETEN 2026-08-07: de identifier is base64 van "id~waarde" en is in elke
 * taal identiek. De groepsnáám niet: "Inzet" heet "Einsatz" op het Duitse
 * platform en "Utilisation" op het Franse. Zouden we op de naam sleutelen,
 * dan verliest een klant al zijn filters zodra hij van taal wisselt.
 * Daarom leiden we sleutel én waarde af uit de identifier.
 */
function decodeIdentifier(
  identifier: string,
): { groupId: string; valueId: string } | null {
  try {
    // base64url zonder padding; atob is beschikbaar in de Node-runtime
    const decoded = atob(identifier.replace(/-/g, "+").replace(/_/g, "/"));
    const separator = decoded.indexOf("~");
    if (separator <= 0) return null;
    return {
      groupId: decoded.slice(0, separator),
      valueId: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

/**
 * Taalonafhankelijke sleutel van een filtergroep. Merken houden "merk":
 * merknamen vertalen niet en lezen prettiger in de URL dan een nummer.
 */
function filterKey(
  apiKey: string,
  options: ReadonlyArray<z.infer<typeof filterOptionSchema>>,
): string {
  if (apiKey === MANUFACTURER_KEY) return "merk";
  for (const option of options) {
    const decoded = option.identifier ? decodeIdentifier(option.identifier) : null;
    if (decoded) return `a${decoded.groupId}`;
  }
  // Geen bruikbare identifier: terugvallen op de naam, met het risico dat
  // deze groep bij een taalwissel zijn selectie verliest.
  return slugify(apiKey) || apiKey.toLowerCase();
}

/**
 * Taalonafhankelijke waarde. Merken gebruiken de merknaam, attributen het
 * id uit de identifier ("241~4" → "4").
 */
function optionValue(
  apiKey: string,
  option: z.infer<typeof filterOptionSchema>,
): string {
  if (apiKey === MANUFACTURER_KEY) return option.value ?? "";
  const decoded = option.identifier ? decodeIdentifier(option.identifier) : null;
  return decoded?.valueId ?? option.value ?? "";
}

/** Weergavetekst van een optie: vertaalde waarde als die er is */
function optionLabel(option: z.infer<typeof filterOptionSchema>): string {
  return option.values?.[0]?.translated_value ?? option.value ?? "";
}

const errorResponseSchema = z.object({
  errorMessage: z.string().optional(),
});

// ---------- helpers ----------

/** "12.34", "12,34" of "1.234,56" → centen. Stringrekenwerk, nooit floats. */
function euroStringToCents(value: string): number | null {
  const cleaned = value.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;

  const sepIndex = Math.max(cleaned.lastIndexOf("."), cleaned.lastIndexOf(","));
  let intPart = cleaned;
  let decPart = "";
  if (sepIndex !== -1) {
    intPart = cleaned.slice(0, sepIndex).replace(/[.,]/g, "");
    decPart = cleaned.slice(sepIndex + 1);
    if (decPart.length > 2) {
      // "1.234" → laatste scheider was een duizendtal
      intPart += decPart;
      decPart = "";
    }
  }

  const euros = parseInt(intPart || "0", 10);
  const cents = parseInt(decPart.padEnd(2, "0").slice(0, 2) || "0", 10);
  if (!Number.isFinite(euros) || !Number.isFinite(cents)) return null;
  return euros * 100 + cents;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * URL-slug van een categorie: Nederlandse tekst plus het Tyre24-id.
 *
 * De tekst komt uit `category-labels.ts`; alleen als een categorie daar
 * ontbreekt valt hij terug op de naam van de leverancier — die staat in de
 * taal van diens platform en kan dus Duits zijn.
 */
function categorySlug(
  productAreaId: string,
  category: { categoryId: number; name: string },
): string {
  const text =
    categorySlugText(productAreaId, category.categoryId) ??
    slugify(category.name);
  return `${text}-${category.categoryId}`;
}

/** Slugs eindigen op het Tyre24-id zodat we ze terug kunnen vertalen */
const idFromSlug = categoryIdFromSlug;

async function apiGet(
  source: FamilySource & { token: string },
  path: string,
  params: Record<string, string | number | string[] | undefined>,
  revalidateSeconds: number,
): Promise<unknown> {
  const { token, productAreaId, baseUrl } = source;
  const url = new URL(baseUrl + path);
  url.searchParams.set("productAreaId", productAreaId);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      // GEMETEN: meerdere waarden MOETEN als `key[]=a&key[]=b`. Een
      // kommalijst pakt stil alleen de eerste, en `key=a&key=b` alleen de
      // laatste — beide leveren zwijgend verkeerde resultaten op.
      for (const entry of value) url.searchParams.append(`${key}[]`, entry);
    } else {
      url.searchParams.set(key, String(value));
    }
  }

  // Server-side cache tegen de rate limit van 100 req/min
  const res = await fetch(url, {
    headers: { "X-AUTH-TOKEN": token },
    next: { revalidate: revalidateSeconds },
  });
  if (!res.ok) {
    throw new Error(`Tyre24 ${path}: HTTP ${res.status}`);
  }
  const data: unknown = await res.json();

  // Foutcodes kunnen óók in een 200-response zitten
  const maybeError = errorResponseSchema.safeParse(data);
  if (maybeError.success && maybeError.data.errorMessage?.startsWith("ERR_")) {
    throw new Error(`Tyre24 ${path}: ${maybeError.data.errorMessage}`);
  }
  return data;
}

// ---------- mapping naar het datacontract ----------

/** Laagste bedrag over alle distributeurs voor prijsblokken die `match` accepteert */
function lowestPriceCents(
  item: z.infer<typeof tyreItemSchema>,
  match: (type: string) => boolean,
): number | null {
  let cheapest: number | null = null;
  for (const distributor of item.distributors ?? []) {
    for (const price of distributor.prices ?? []) {
      if (!match(price.type ?? "")) continue;
      for (const entry of Object.values(price.prices ?? {})) {
        const cents = entry.base ? euroStringToCents(entry.base) : null;
        if (cents !== null && (cheapest === null || cents < cheapest)) {
          cheapest = cents;
        }
      }
    }
  }
  return cheapest;
}

/**
 * Formaat dat we bij de leverancier opvragen. De productpagina toont de foto
 * op 800px breed; Next optimaliseert daarna zelf naar het schermformaat.
 */
const IMAGE_SIZE = "w800-H800";

/**
 * `imageLink` bevat twee `%s`-plaatshouders voor het formaat. ALZURA
 * bevestigde 2026-09-05 dat daar `w<breedte>-H<hoogte>` hoort (kleine w,
 * hoofdletter H). GEMETEN: onbewerkt geeft de URL HTTP 400 en een ander
 * patroon HTTP 500 — alleen deze vorm levert een echte foto op.
 */
function imageUrl(link: string): string {
  return link.replace("%s-%s", IMAGE_SIZE);
}

function toPart(
  raw: unknown,
  source: FamilySource & { token: string },
  family: ProductFamily,
  allowedCategoryIds: ReadonlySet<number> | null,
): Part | null {
  const parsed = tyreItemSchema.safeParse(raw);
  if (!parsed.success) return null;
  const item = parsed.data;

  // Zonder inkoopprijs kunnen we niet verkopen → item overslaan
  const purchaseCents = lowestPriceCents(
    item,
    (type) => type === PURCHASE_PRICE_TYPE,
  );
  if (purchaseCents === null) return null;

  // Adviesverkoopprijs van de leverancier, als die er is
  const recommendedCents = lowestPriceCents(item, (type) =>
    type.startsWith(RETAIL_PRICE_PREFIX),
  );

  const category = item.categories?.[0];
  // Buiten het assortiment → niet verkopen. Hier i.p.v. alleen in de
  // navigatie, zodat ook een directe product-URL niets oplevert.
  // GEMETEN 2026-09-06: bij toebehoren (area 1) draagt een artikel zijn
  // blad-categorie ("Reifenreparaturkörper", id 944), niet de hoofdcategorie
  // uit de navigatie. Toetsen op de hoofd-id alleen liet daar élk artikel
  // afvallen. Daarom de toegestane hoofdcategorieën mét al hun onderliggende
  // ids — zie allowedCategoryIds().
  if (category && allowedCategoryIds && !allowedCategoryIds.has(category.categoryId)) {
    return null;
  }

  const image = item.media?.find(
    (m) => m.isDefault && !m.isDeleted && m.imageLink,
  );

  const specs = toSpecs(item);
  const name = displayName(item);

  return {
    id: String(item.itemId),
    slug: `${slugify(name)}-${item.itemId}`,
    name,
    variant: variantOf(specs, name),
    // Bij velgen staat in dit veld een omschrijving in plaats van een merk
    // ("STAHLRAD OE QUALITÄT: ALCAR,KPZ,SÜDRAD,MWD"). Die hoort niet in de
    // paginatitel of onder "Merk"; dan liever niets.
    brand:
      item.manufacturerName && isRealBrand(item.manufacturerName)
        ? item.manufacturerName
        : "",
    family,
    oeNumber:
      item.identifications?.OEN?.[0] ?? item.manufacturerItemNumber ?? "",
    categorySlug: category ? categorySlug(source.productAreaId, category) : "",
    categoryName: category?.name ?? "",
    priceCents: consumerPriceCents({ purchaseCents, recommendedCents }),
    availability: (item.stock ?? 0) > 0 ? "in-stock" : "out-of-stock",
    imageUrl: image?.imageLink ? imageUrl(image.imageLink) : undefined,
    specs,
    stock: item.stock,
  };
}

/**
 * Alle categorie-id's die we mogen verkopen, inclusief onderliggende niveaus.
 *
 * De categorieboom komt genest terug, dus we lopen hem één keer af (gecacht,
 * net als /categories zelf). Heeft de area geen allowlist, dan is er niets te
 * filteren en geven we null terug — dat scheelt een call.
 */
async function allowedCategoryIds(
  source: FamilySource & { token: string },
): Promise<ReadonlySet<number> | null> {
  if (!hasAssortmentFilter(source.productAreaId)) return null;

  let data: unknown;
  try {
    data = await apiGet(source, "/categories", { hideEmpty: "true" }, 3600);
  } catch {
    return null;
  }
  const tree = z.array(categoryTreeSchema).safeParse(data);
  if (!tree.success) return null;

  const ids = new Set<number>();
  const collect = (node: z.infer<typeof categoryTreeSchema>) => {
    ids.add(node.categoryId);
    for (const child of node.children ?? []) collect(child);
  };
  for (const node of tree.data) {
    if (isCategoryInAssortment(source.productAreaId, node.categoryId)) {
      collect(node);
    }
  }
  return ids;
}

async function fetchParts(
  source: FamilySource & { token: string },
  family: ProductFamily,
  params: Record<string, string | number | string[] | undefined>,
): Promise<Part[]> {
  // GEMETEN: sommige categorieën geven HTTP 500 bij Tyre24 (bv. area 9,
  // categorie 1 "Handwerkzeuge") terwijl de rest van de area het wel doet.
  // Eén kapotte categorie mag geen foutpagina opleveren.
  let data: unknown;
  try {
    data = await apiGet(source, "/items", params, 300);
  } catch (error) {
    console.error("Tyre24 /items faalde:", error instanceof Error ? error.message : error);
    return [];
  }
  const parsed = itemsResponseSchema.safeParse(data);
  if (!parsed.success) return [];
  const allowed = await allowedCategoryIds(source);
  return (parsed.data.result ?? [])
    .map((raw) => toPart(raw, source, family, allowed))
    .filter((part): part is Part => part !== null);
}

async function fetchCategories(
  source: FamilySource & { token: string },
): Promise<Category[]> {
  const { productAreaId } = source;
  // Niet elke area kent categorieën. Area 3 (nieuwe onderdelen) heeft
  // searchableByCategory: false en antwoordt met HTTP 400. Dat is geen
  // storing maar een eigenschap: die familie is alleen doorzoekbaar op
  // OE-nummer. Lege lijst i.p.v. een foutpagina.
  let data: unknown;
  try {
    data = await apiGet(source, "/categories", { hideEmpty: "true" }, 3600);
  } catch {
    return [];
  }
  const parsed = z.array(z.unknown()).safeParse(data);
  if (!parsed.success) return [];
  return parsed.data.flatMap((raw) => {
    const category = tyreCategorySchema.safeParse(raw);
    if (!category.success) return [];
    // Assortimentskeuze: alleen auto's en tweewielers (assortment.ts).
    // Eén filterpunt: dit bepaalt de navigatie én welke categorie-URL's
    // bestaan, want de categoriepagina valideert tegen deze lijst.
    if (!isCategoryInAssortment(productAreaId, category.data.categoryId)) {
      return [];
    }
    return [
      {
        slug: categorySlug(productAreaId, category.data),
        name: category.data.name,
        labelKey: categoryLabelKey(productAreaId, category.data.categoryId),
      },
    ];
  });
}

/** Ruw filterblok van een categorie ophalen (gecacht) */
async function fetchFilterBlock(
  source: FamilySource & { token: string },
  parentNodeId: number,
): Promise<Record<string, z.infer<typeof filterGroupSchema>>> {
  let data: unknown;
  try {
    // Volle pagina: de attribuutfilters worden over de opgehaalde
    // artikelen berekend, niet over de hele categorie.
    data = await apiGet(
      source,
      "/items",
      { parentNodeId, limit: FILTER_SAMPLE_SIZE, page: FIRST_PAGE },
      3600,
    );
  } catch {
    return {};
  }
  const parsed = itemsResponseSchema.safeParse(data);
  return parsed.success ? (parsed.data.filter ?? {}) : {};
}

/** Filterblok → groepen voor de UI. Groepen met één optie filteren niets. */
function toFilterGroups(
  block: Record<string, z.infer<typeof filterGroupSchema>>,
  productAreaId: string,
): FilterGroup[] {
  const groups: Array<{ order: number; group: FilterGroup }> = [];
  for (const [apiKey, group] of Object.entries(block)) {
    if (!isFilterGroupAllowed(productAreaId, apiKey)) continue;
    const raw = group.filter ?? [];
    const options = raw
      .map((option) => ({
        value: optionValue(apiKey, option),
        label: optionLabel(option),
        count: option.count,
      }))
      .filter((option) => option.value !== "" && option.label !== "")
      // Het merkveld bevat ook omschrijvingen van de leverancier; die horen
      // niet tussen de merken te staan.
      .filter(
        (option) =>
          apiKey !== API_MANUFACTURER_KEY || isRealBrand(option.label),
      );
    if (options.length < 2) continue;
    groups.push({
      order: filterGroupOrder(productAreaId, apiKey),
      group: {
        key: filterKey(apiKey, raw),
        label: group.name ?? apiKey,
        labelKey: filterLabelKey(apiKey),
        options,
      },
    });
  }
  // Volgorde van de allowlist, niet die van de API: merk hoort bovenaan.
  return groups.sort((a, b) => a.order - b.order).map((entry) => entry.group);
}

/**
 * Gekozen waarden → de queryparameters die /items verwacht. Merken gaan naar
 * `manufacturer`, alle overige eigenschappen naar `attributeStrings`.
 */
function toFilterParams(
  block: Record<string, z.infer<typeof filterGroupSchema>>,
  selected: SelectedFilters,
): { manufacturer?: string[]; attributeStrings?: string[] } {
  const manufacturer: string[] = [];
  const attributeStrings: string[] = [];

  for (const [apiKey, group] of Object.entries(block)) {
    const raw = group.filter ?? [];
    const chosen = selected[filterKey(apiKey, raw)];
    if (!chosen?.length) continue;
    const wanted = new Set(chosen.map((v) => v.toLowerCase()));
    for (const option of raw) {
      if (!option.identifier) continue;
      if (!wanted.has(optionValue(apiKey, option).toLowerCase())) continue;
      if (apiKey === MANUFACTURER_KEY) manufacturer.push(option.identifier);
      else attributeStrings.push(option.identifier);
    }
  }

  return {
    manufacturer: manufacturer.length ? manufacturer : undefined,
    attributeStrings: attributeStrings.length ? attributeStrings : undefined,
  };
}

// ---------- provider ----------

export const tyre24Provider: CatalogProvider = {
  async getCategories(family) {
    // Familie zonder productArea → lege lijst; de pagina toont dan een
    // eerlijke "nog geen aanbod"-staat i.p.v. een crash.
    const source = getSource(family);
    if (!source) return [];
    return fetchCategories(source);
  },

  async getParts(query: PartQuery) {
    const source = getSource(query.family);
    if (!source) return [];

    // Zoeken op OE-nummer. Voor area 3 (nieuwe onderdelen) is dit het enige
    // ingangspunt; /items accepteert search óf parentNodeId óf itemId.
    if (query.search) {
      const term = query.search.trim();
      const found = await fetchParts(source, query.family, {
        search: term,
        limit: query.limit,
        page: FIRST_PAGE,
      });
      if (found.length > 0) return found;

      // GEMETEN 2026-09-06: de zoekfunctie is hoofdletterongevoelig en
      // negeert spaties, maar struikelt over koppeltekens en punten —
      // "90915-YZZE1" geeft niets, "90915YZZE1" één treffer. Klanten typen
      // het nummer over zoals het op het onderdeel staat, dus proberen we
      // het zonder scheidingstekens nog een keer.
      const stripped = term.replace(/[^A-Za-z0-9]/g, "");
      if (stripped === term || stripped === "") return found;
      return fetchParts(source, query.family, {
        search: stripped,
        limit: query.limit,
        page: FIRST_PAGE,
      });
    }

    let parentNodeId: number | undefined;
    if (query.categorySlug) {
      parentNodeId = idFromSlug(query.categorySlug) ?? undefined;
    } else {
      // /items vereist parentNodeId, search of itemId — een "toon alles"
      // bestaat niet. Zonder filter tonen we de eerste categorie met aanbod.
      // TODO: uitgelichte selectie voor de homepage is een winkelkeuze.
      const categories = await fetchCategories(source);
      const first = categories[0];
      if (!first) return [];
      parentNodeId = idFromSlug(first.slug) ?? undefined;
    }
    if (parentNodeId === undefined) return [];

    // Filters (incl. merk) willen base64-identifiers, geen leesbare namen.
    // Die staan in het filterblok, dus dat halen we eerst op — gecacht.
    const selected: SelectedFilters = { ...(query.filters ?? {}) };
    if (query.brand) selected[MANUFACTURER_KEY] = [query.brand];

    const filterParams = Object.keys(selected).length
      ? toFilterParams(await fetchFilterBlock(source, parentNodeId), selected)
      : {};

    return fetchParts(source, query.family, {
      parentNodeId,
      ...filterParams,
      limit: query.limit,
      page: FIRST_PAGE,
    });
  },

  async getPartBySlug(family, slug) {
    const source = getSource(family);
    if (!source) return null;
    const itemId = idFromSlug(slug);
    if (itemId === null) return null;
    const parts = await fetchParts(source, family, { itemId });
    return parts[0] ?? null;
  },

  async getFilters(family, categorySlug) {
    const source = getSource(family);
    if (!source) return [];
    const parentNodeId = idFromSlug(categorySlug);
    if (parentNodeId === null) return [];
    return toFilterGroups(
      await fetchFilterBlock(source, parentNodeId),
      source.productAreaId,
    );
  },

  async getPartById(family, id) {
    const source = getSource(family);
    if (!source) return null;
    const itemId = Number(id);
    if (!Number.isInteger(itemId)) return null;
    const parts = await fetchParts(source, family, { itemId });
    return parts[0] ?? null;
  },
};
