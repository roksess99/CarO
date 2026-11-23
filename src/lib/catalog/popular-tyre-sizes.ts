import type { TyreSize } from "./tyre-size";

/**
 * Bandenmaten die een eigen, vindbare pagina krijgen.
 *
 * Zoeken op maat ("205/55 R16 banden") is de manier waarop mensen banden
 * zoeken, en de maatkiezer kon dat al — maar alleen via een formulier. Een
 * zoekmachine vult geen formulieren in, dus geen enkele maat stond in de
 * index (GEMETEN 2026-11-23: nul links met `breedte=` op de hele site). Deze
 * lijst geeft er een vaste link naar, vanaf de homepage, /banden en de
 * sitemap; de familiepagina geeft zo'n URL een eigen titel en canonical.
 *
 * **Dit is een voornemen, geen meting.** Het zijn de gangbare maten voor
 * personenauto's in Nederland, niet een telling uit onze verkoop of uit de
 * catalogus — die is lokaal bewust niet bevraagd (het kost verzoeken bij de
 * leverancier). Valt er een tegen, dan toont de pagina een eerlijke lege staat
 * en hoort hij hier weg. Meet het zodra er verkoopcijfers zijn.
 *
 * Elke maat kost bij een eerste bezoek één zoekverzoek bij de leverancier
 * (`search` + `limit=120`, daarna gecacht). Houd de lijst dus kort.
 */
export const POPULAR_TYRE_SIZES: readonly TyreSize[] = [
  { width: 205, height: 55, diameter: 16 },
  { width: 195, height: 65, diameter: 15 },
  { width: 225, height: 45, diameter: 17 },
  { width: 205, height: 60, diameter: 16 },
  { width: 215, height: 55, diameter: 17 },
  { width: 225, height: 40, diameter: 18 },
  { width: 185, height: 65, diameter: 15 },
  { width: 195, height: 55, diameter: 16 },
  { width: 215, height: 60, diameter: 16 },
  { width: 225, height: 50, diameter: 17 },
  { width: 235, height: 55, diameter: 18 },
  { width: 175, height: 65, diameter: 14 },
];

/** De querystring van de maatkiezer, zodat link en formulier één URL delen */
export function tyreSizeQuery(size: TyreSize): Record<string, string> {
  return {
    breedte: String(size.width),
    hoogte: String(size.height),
    diameter: String(size.diameter),
  };
}

/**
 * De maat van de bandenrij op de homepage: de eerste uit de lijst, en daarmee
 * ook de eerste link in "Populaire bandenmaten". Hier en niet in de pagina,
 * want `warm.ts` moet precies dezelfde zoekopdracht aanraken.
 */
export const HOME_TYRE_SIZE: TyreSize = POPULAR_TYRE_SIZES[0];
