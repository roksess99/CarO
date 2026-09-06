"use server";

import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import {
  familySlug,
  PRODUCT_FAMILIES,
  usesVehicleCatalog,
} from "@/lib/catalog/families";
import { getCatalogProvider } from "@/lib/catalog/provider";
import { searchParts } from "@/lib/catalog/wearparts-provider";

/** Kortste term die we accepteren; korter levert alleen ruis op */
const MIN_TERM_LENGTH = 3;

/** Suggesties per familie; zes families × 3 blijft een leesbare lijst */
const PER_FAMILY = 3;

export interface SearchSuggestion {
  id: string;
  name: string;
  brand: string;
  oeNumber: string;
  priceCents: number;
  /** Productfoto; ontbreekt bij artikelen waar de leverancier er geen heeft */
  imageUrl?: string;
  /** Volledig pad naar het artikel, klaar om naartoe te navigeren */
  href: string;
}

/**
 * Suggesties voor de zoekbalk.
 *
 * Een Server Action en geen route handler: de Tyre24-token blijft dan
 * server-side (CLAUDE.md) en er ontstaat geen publiek endpoint dat iemand
 * kan leegtrekken.
 *
 * Let op de kosten: elke aanroep raakt zes productfamilies, dus zes calls
 * naar Tyre24 met een limiet van 100 per minuut. De client mag hier daarom
 * pas op typen ná een debounce en vanaf drie tekens. De adapter cachet de
 * /items-call vijf minuten, waardoor herhaalde termen gratis zijn.
 */
export async function searchSuggestionsAction(
  term: string,
  locale: string,
): Promise<SearchSuggestion[]> {
  const trimmed = term.trim();
  if (trimmed.length < MIN_TERM_LENGTH) return [];

  const targetLocale = routing.locales.includes(locale as Locale)
    ? (locale as Locale)
    : routing.defaultLocale;

  const provider = getCatalogProvider();
  const perFamily = await Promise.all(
    PRODUCT_FAMILIES.map(async (family) => {
      // Onderdelen komen uit de Wearparts-API; die kent de familie niet en
      // zit niet achter de provider (docs/api/WEARPARTS.md).
      const parts = usesVehicleCatalog(family)
        ? (await searchParts(trimmed, PER_FAMILY)).parts
        : await provider.getParts({
            family,
            search: trimmed,
            limit: PER_FAMILY,
          });
      return parts.map((part) => ({
        id: part.id,
        name: part.name,
        brand: part.brand,
        oeNumber: part.oeNumber,
        priceCents: part.priceCents,
        imageUrl: part.imageUrl,
        href: getPathname({
          locale: targetLocale,
          href: {
            pathname: "/[family]/[category]/[part]",
            params: {
              family: familySlug(part.family, targetLocale),
              category: part.categorySlug,
              part: part.slug,
            },
          },
        }),
      }));
    }),
  );

  return perFamily.flat();
}
