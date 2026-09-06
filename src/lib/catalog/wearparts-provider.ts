// Onderdelen uit de Wearparts-API, vertaald naar het datacontract van de
// shop (types.ts). Zie docs/api/WEARPARTS.md voor de gemeten eigenschappen.
//
// Deze familie werkt anders dan de rest: bladeren kan alleen mét een auto,
// omdat de categorieboom aan een TecDoc-voertuig hangt. Zoeken op naam kan
// altijd. De pagina's regelen dat verschil; de mapping hieronder niet.

import { consumerPriceCents } from "@/lib/pricing";
import {
  type AssemblyGroup,
  articleById,
  assemblyGroupById,
  assemblyGroups,
  searchArticles,
  type WearpartsArticle,
} from "./wearparts";
import type { Category, Part } from "./types";

/** Prijzen komen als euro's met decimalen; wij rekenen in centen */
function toCents(amount: number | undefined): number | null {
  if (amount === undefined || !Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

export function slugifyPart(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Artikel-id uit een slug. De id van de Wearparts-API is geen getal maar een
 * sleutel als "101-3231363633", dus die zetten we achteraan met een dubbele
 * streep ertussen — één streep zou niet te onderscheiden zijn van de streepjes
 * in de naam zelf.
 */
const ID_SEPARATOR = "--";

export function partSlug(article: WearpartsArticle): string {
  return `${slugifyPart(article.articleName)}${ID_SEPARATOR}${article.id}`;
}

export function idFromPartSlug(slug: string): string | null {
  const index = slug.lastIndexOf(ID_SEPARATOR);
  if (index === -1) return null;
  const id = slug.slice(index + ID_SEPARATOR.length);
  return id.length > 0 ? id : null;
}

/**
 * Categoriesegment voor artikelen die niet uit een categorie komen maar uit
 * een zoekopdracht. De URL heeft drie niveaus nodig; zonder dit segment
 * ontstaat "/nl/onderdelen//artikel" en dat is geen geldige route.
 */
export const SEARCH_CATEGORY_SLUG = "zoekresultaat";

export function groupSlug(group: AssemblyGroup): string {
  return `${slugifyPart(group.name)}-${group.id}`;
}

export function groupIdFromSlug(slug: string): number | null {
  const match = /-(\d+)$/.exec(slug);
  return match ? Number(match[1]) : null;
}

/**
 * Artikel → Part. Het goedkoopste aanbod telt: de klant koopt er één, en de
 * `offerList` staat niet gegarandeerd op prijs gesorteerd.
 */
export function toPart(
  article: WearpartsArticle,
  categorySlug: string,
  categoryName: string,
): Part | null {
  const offers = article.offerList ?? [];
  const priced = offers
    .map((offer) => ({
      purchase: toCents(offer.price),
      recommended: toCents(offer.retailPrice),
      stock: offer.stock ?? 0,
    }))
    .filter((offer): offer is { purchase: number; recommended: number | null; stock: number } =>
      offer.purchase !== null && offer.purchase > 0,
    )
    .sort((a, b) => a.purchase - b.purchase);

  const best = priced[0];
  // Zonder inkoopprijs kunnen we niet verkopen — zelfde regel als bij banden.
  if (!best) return null;

  // `quality` is een cijfercode zonder betekenis buiten hun database (1, 2,
  // 3); die tonen we niet, net als de codefilters bij banden.
  const specs: Array<{ key: string; value: string }> = [];
  if (article.eanNumber?.[0]) {
    specs.push({ key: "ean", value: article.eanNumber[0] });
  }
  if (article.articleId) {
    specs.push({ key: "itemNumber", value: article.articleId });
  }

  return {
    id: article.id,
    slug: partSlug(article),
    name: article.articleName,
    brand: article.brandName ?? "",
    family: "onderdelen",
    oeNumber: article.articleId ?? "",
    categorySlug,
    categoryName,
    priceCents: consumerPriceCents({
      purchaseCents: best.purchase,
      recommendedCents: best.recommended,
    }),
    availability: best.stock > 0 ? "in-stock" : "out-of-stock",
    imageUrl: article.image,
    specs,
    stock: best.stock,
  };
}

/** Hoofdgroepen van een auto, als categorieën voor de navigatie */
export async function partCategories(carId: number): Promise<Category[]> {
  const groups = await assemblyGroups(carId);
  return groups.map((group) => ({ slug: groupSlug(group), name: group.name }));
}

export async function partGroupById(
  carId: number,
  groupId: number,
): Promise<AssemblyGroup | null> {
  return assemblyGroupById(carId, groupId);
}

export async function partGroups(
  carId: number,
  parentNodeId?: number,
): Promise<AssemblyGroup[]> {
  return assemblyGroups(carId, parentNodeId);
}

/** Onderdelen zoeken op vrije tekst; werkt zonder gekozen auto */
export async function searchParts(
  term: string,
  limit = 20,
  page = 0,
): Promise<{ parts: Part[]; total: number }> {
  const { articles, total } = await searchArticles({
    search: term,
    limit,
    page,
  });
  return {
    parts: articles.flatMap((article) => {
      const part = toPart(article, SEARCH_CATEGORY_SLUG, "");
      return part ? [part] : [];
    }),
    total,
  };
}

/** Onderdelen binnen één categorie van één auto */
export async function partsInGroup({
  carId,
  categoryId,
  categorySlug,
  categoryName,
  limit = 20,
  page = 0,
}: {
  carId: number;
  categoryId: number;
  categorySlug: string;
  categoryName: string;
  limit?: number;
  page?: number;
}): Promise<{ parts: Part[]; total: number }> {
  const { articles, total } = await searchArticles({
    carId,
    categoryId,
    limit,
    page,
  });
  return {
    parts: articles.flatMap((article) => {
      const part = toPart(article, categorySlug, categoryName);
      return part ? [part] : [];
    }),
    total,
  };
}

export async function partById(id: string): Promise<Part | null> {
  const article = await articleById(id);
  return article ? toPart(article, SEARCH_CATEGORY_SLUG, "") : null;
}
