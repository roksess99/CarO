import { z } from "zod";
import { consumerPriceCents } from "../pricing";
import { isCategoryInAssortment } from "./assortment";
import type { CatalogProvider, Category, Part, PartQuery } from "./types";

// Tyre24/ALZURA-adapter (docs/api/TYRE24.md). Draait UITSLUITEND server-side:
// het token is een secret en de rate limit is 100 requests/minuut.
// Alle responses gaan door Zod aan de rand; daarbinnen is alles getypeerd.

// ---------- configuratie ----------

function getConfig() {
  if (typeof window !== "undefined") {
    throw new Error("tyre24-provider mag nooit in de browser draaien");
  }
  const token = process.env.TYRE24_API_TOKEN;
  const productAreaId = process.env.TYRE24_PRODUCT_AREA_ID;
  if (!token || !productAreaId) {
    // provider.ts hoort dit al af te vangen door de mock te kiezen
    throw new Error("TYRE24_API_TOKEN of TYRE24_PRODUCT_AREA_ID ontbreekt");
  }
  const baseUrl =
    process.env.TYRE24_BASE_URL ??
    "https://tyre24.alzura.com/nl/nl/rest/v13/products";
  return { token, productAreaId, baseUrl };
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
});

const itemsResponseSchema = z.object({
  result: z.array(z.unknown()).optional(),
  // GEMETEN: het filterblok geeft per merk een base64-"identifier"
  // (bv. "NjE3fkFMVEVOWk8" = "617~ALTENZO"). Het manufacturer-filter van
  // /items verwacht die identifier, niet de merknaam.
  filter: z
    .object({
      manufacturer: z
        .object({
          filter: z
            .array(
              z.object({
                identifier: z.string().optional(),
                value: z.string().optional(),
              }),
            )
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

const errorResponseSchema = z.object({
  errorMessage: z.string().optional(),
});

// ---------- helpers ----------

/** "12.34", "12,34" of "1.234,56" → centen. Stringrekenwerk, nooit floats. */
export function euroStringToCents(value: string): number | null {
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

/** Slugs eindigen op het Tyre24-id zodat we ze terug kunnen vertalen */
function idFromSlug(slug: string): number | null {
  const match = /-(\d+)$/.exec(slug);
  return match ? Number(match[1]) : null;
}

async function apiGet(
  path: string,
  params: Record<string, string | number | undefined>,
  revalidateSeconds: number,
): Promise<unknown> {
  const { token, productAreaId, baseUrl } = getConfig();
  const url = new URL(baseUrl + path);
  url.searchParams.set("productAreaId", productAreaId);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
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

function toPart(raw: unknown): Part | null {
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
  if (
    category &&
    !isCategoryInAssortment(getConfig().productAreaId, category.categoryId)
  ) {
    return null;
  }

  // GEMETEN: bij banden bevat imageLink placeholders ("...-%s-%s-br1.jpg").
  // Die URL is onbruikbaar en zou een gebroken afbeelding opleveren.
  const image = item.media?.find(
    (m) => m.isDefault && !m.isDeleted && m.imageLink && !m.imageLink.includes("%s"),
  );

  return {
    id: String(item.itemId),
    slug: `${slugify(item.name)}-${item.itemId}`,
    name: item.name,
    brand: item.manufacturerName ?? "",
    oeNumber:
      item.identifications?.OEN?.[0] ?? item.manufacturerItemNumber ?? "",
    categorySlug: category ? `${slugify(category.name)}-${category.categoryId}` : "",
    priceCents: consumerPriceCents({ purchaseCents, recommendedCents }),
    availability: (item.stock ?? 0) > 0 ? "in-stock" : "out-of-stock",
    imageUrl: image?.imageLink,
  };
}

async function fetchParts(
  params: Record<string, string | number | undefined>,
): Promise<Part[]> {
  const data = await apiGet("/items", params, 300);
  const parsed = itemsResponseSchema.safeParse(data);
  if (!parsed.success) return [];
  return (parsed.data.result ?? [])
    .map(toPart)
    .filter((part): part is Part => part !== null);
}

/**
 * Merknaam → base64-identifier die het manufacturer-filter verwacht.
 * Kost een extra ongefilterde call; die is gecacht, dus dat is acceptabel.
 */
async function brandIdentifier(
  parentNodeId: number,
  brand: string,
): Promise<string | null> {
  const data = await apiGet("/items", { parentNodeId, limit: 1, page: 1 }, 3600);
  const parsed = itemsResponseSchema.safeParse(data);
  if (!parsed.success) return null;
  const match = parsed.data.filter?.manufacturer?.filter?.find(
    (entry) => entry.value?.toUpperCase() === brand.toUpperCase(),
  );
  return match?.identifier ?? null;
}

async function fetchCategories(): Promise<Category[]> {
  const { productAreaId } = getConfig();
  const data = await apiGet("/categories", { hideEmpty: "true" }, 3600);
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
        slug: `${slugify(category.data.name)}-${category.data.categoryId}`,
        name: category.data.name,
      },
    ];
  });
}

// ---------- provider ----------

export const tyre24Provider: CatalogProvider = {
  async getCategories() {
    return fetchCategories();
  },

  async getParts(query?: PartQuery) {
    let parentNodeId: number | undefined;

    if (query?.categorySlug) {
      parentNodeId = idFromSlug(query.categorySlug) ?? undefined;
    } else {
      // /items vereist parentNodeId, search of itemId — een "toon alles"
      // bestaat niet. Zonder filter tonen we de eerste categorie met aanbod.
      // TODO: uitgelichte selectie voor de homepage is een winkelkeuze.
      const categories = await fetchCategories();
      const first = categories[0];
      if (!first) return [];
      parentNodeId = idFromSlug(first.slug) ?? undefined;
    }
    if (parentNodeId === undefined) return [];

    // GEMETEN: manufacturer wil de base64-identifier, niet de merknaam.
    // Onbekend merk → geen filter meesturen i.p.v. een lege lijst tonen.
    const manufacturer = query?.brand
      ? ((await brandIdentifier(parentNodeId, query.brand)) ?? undefined)
      : undefined;

    return fetchParts({
      parentNodeId,
      manufacturer,
      limit: query?.limit,
      page: 1,
    });
  },

  async getPartBySlug(slug: string) {
    const itemId = idFromSlug(slug);
    if (itemId === null) return null;
    const parts = await fetchParts({ itemId });
    return parts[0] ?? null;
  },
};
