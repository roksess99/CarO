import { cache } from "react";
import { familySource } from "./families";
import { mockProvider } from "./mock-provider";
import { tyre24Provider } from "./tyre24-provider";
import type { CatalogProvider } from "./types";

// Enige plek waar de databron gekozen wordt. Zonder Tyre24-token draait
// alles op de mock — de site moet altijd zonder token blijven werken
// (CLAUDE.md, fase 3). Token + areas: zie docs/api/TYRE24.md.
export function getCatalogProvider(): CatalogProvider {
  const hasToken = Boolean(process.env.TYRE24_API_TOKEN);
  // Minstens één familie moet een bron hebben, anders heeft de echte
  // provider niets te bieden en is de mock nuttiger.
  const hasAnySource = Boolean(familySource("banden") ?? familySource("onderdelen"));
  if (hasToken && hasAnySource) {
    return perRequest;
  }
  return mockProvider;
}

/**
 * De categorieboom wordt per verzoek één keer opgehaald, niet drie keer.
 *
 * GEMETEN 2026-10-09 met `logging.fetches` op een categoriepagina: dezelfde
 * `/categories?productAreaId=6` ging er **drie keer** uit, en op de homepage
 * twee keer per area. Dat komt doordat `generateMetadata`, de pagina zelf en
 * het kruimelpad allemaal dezelfde vraag stellen — drie losse aanroepen die
 * Next niet samenvoegt.
 *
 * `cache()` van React doet dat wél: binnen één verzoek telt de tweede aanroep
 * met hetzelfde argument niet meer. Dat is iets anders dan de TTL-cache in de
 * provider, die over verzoeken héén werkt maar niets zegt over dubbel werk
 * binnen één render.
 *
 * Waarom dit telt terwijl die calls "cache hit" meldden: op een koude cache
 * zíjn het echte verzoeken, en de leverancier staat er honderd per minuut toe
 * voor de héle winkel (@docs/api/TYRE24.md).
 */
const cachedCategories = cache(tyre24Provider.getCategories);

const perRequest: CatalogProvider = {
  ...tyre24Provider,
  getCategories: cachedCategories,
};
