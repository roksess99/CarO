import type { Part } from "./types";

// Zoeken op bandenmaat.
//
// GEMETEN 2026-09-07: de Products-API heeft géén maatfilter. Het filterblok
// van area 6 kent alleen `manufacturer` en `filterByExpress`; de maat zit in
// de artikelnaam. Zoeken werkt wél, maar alleen in het formaat mét spatie:
//
//   search=205/55 R16  -> 1888 treffers
//   search=205/55R16   ->    3 treffers
//
// De vrije zoektekst alleen is niet nauwkeurig genoeg (hij matcht ook
// 205/55 R16C of een naam waar het nummer toevallig in staat), maar élk
// artikel draagt wél een `sizes`-blok met breedte, hoogte en diameter als
// getal. Daarom: breed zoeken bij de leverancier, exact narekenen bij ons.

export interface TyreSize {
  /** Breedte in mm, bv. 205 */
  width: number;
  /** Hoogte als percentage van de breedte, bv. 55 */
  height: number;
  /** Velgdiameter in inch, bv. 16 */
  diameter: number;
}

/**
 * Gangbare maten voor de keuzelijsten. Bewust een vaste tabel en geen lijst
 * uit de API: die kent geen maatfilter, dus de enige andere manier is de hele
 * catalogus doorbladeren om te zien welke maten erin zitten.
 */
export const TYRE_WIDTHS = [
  135, 145, 155, 165, 175, 185, 195, 205, 215, 225, 235, 245, 255, 265, 275,
  285, 295, 305, 315, 325, 335, 345, 355,
] as const;

export const TYRE_HEIGHTS = [
  25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85,
] as const;

export const TYRE_DIAMETERS = [
  12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24,
] as const;

/** Seizoenen zoals ze in de URL staan; NL is leidend voor slugs */
export const TYRE_SEASONS = ["zomer", "winter", "allseason"] as const;
export type TyreSeason = (typeof TYRE_SEASONS)[number];

/**
 * Het seizoen komt als attribuut "Inzet" binnen. GEMETEN: de waarden zijn
 * Duits, óók op het NL-platform — Sommerreifen, Winterreifen,
 * Ganzjahresreifen. De woordenlijst in messages/ vertaalt ze voor de UI;
 * hier hebben we ze nodig om op te filteren.
 */
const SEASON_BY_SUPPLIER_VALUE: Record<string, TyreSeason> = {
  sommerreifen: "zomer",
  winterreifen: "winter",
  ganzjahresreifen: "allseason",
};

function inList(value: string | undefined, allowed: readonly number[]) {
  const number = Number(value);
  return value !== undefined && allowed.includes(number) ? number : null;
}

/** Maat uit de URL. Alles moet kloppen, anders is er geen maat gekozen. */
export function parseTyreSize(params: {
  width?: string;
  height?: string;
  diameter?: string;
}): TyreSize | null {
  const width = inList(params.width, TYRE_WIDTHS);
  const height = inList(params.height, TYRE_HEIGHTS);
  const diameter = inList(params.diameter, TYRE_DIAMETERS);
  if (width === null || height === null || diameter === null) return null;
  return { width, height, diameter };
}

export function parseTyreSeason(value: string | undefined): TyreSeason | null {
  return TYRE_SEASONS.find((season) => season === value) ?? null;
}

/** Zoals de klant hem leest en zoals hij op de band staat: 205/55 R16 */
export function formatTyreSize(size: TyreSize): string {
  return `${size.width}/${size.height} R${size.diameter}`;
}

/**
 * Zoekwoord per seizoen. GEMETEN 2026-09-07 op maat 205/55 R16: het woord
 * erachter plakken beperkt de treffers tot dat seizoen én levert een volle
 * pagina op, waar zelf nafilteren er van de zestig maar zes overhield.
 *
 *   205/55 R16               1888 treffers (alle seizoenen door elkaar)
 *   205/55 R16 winter         528 treffers, alle winterbanden
 *   205/55 R16 zomer          999 treffers, alle zomerbanden
 *   205/55 R16 all season     358 treffers, alle vierseizoenenbanden
 *
 * Let op de schrijfwijze: "vierseizoenen", "all-season" en "4 seizoenen"
 * geven alle drie nul treffers.
 */
const SEASON_SEARCH_WORD: Record<TyreSeason, string> = {
  zomer: "zomer",
  winter: "winter",
  allseason: "all season",
};

/** Zoekterm voor /items — de spatie is verplicht, zie de kop van dit bestand */
export function tyreSearchTerm(
  size: TyreSize,
  season: TyreSeason | null,
): string {
  const base = formatTyreSize(size);
  return season ? `${base} ${SEASON_SEARCH_WORD[season]}` : base;
}

/**
 * Maat terug uit de specificatie die de adapter van `sizes` maakte.
 * De aanduiding tussen hoogte en diameter varieert (R, ZR, RF), dus die
 * slaan we over: 205/55 ZR16 is dezelfde maat als 205/55 R16.
 */
const SIZE_PATTERN = /^(\d{2,3})\s*\/\s*(\d{2,3})\s*[A-Z]{0,2}\s*(\d{2})$/i;

export function partTyreSize(part: Part): TyreSize | null {
  const value = part.specs?.find((spec) => spec.key === "size")?.value;
  const match = value ? SIZE_PATTERN.exec(value.trim()) : null;
  if (!match) return null;
  return {
    width: Number(match[1]),
    height: Number(match[2]),
    diameter: Number(match[3]),
  };
}

export function partTyreSeason(part: Part): TyreSeason | null {
  const value = part.specs?.find((spec) => spec.key === "season")?.value;
  return value ? (SEASON_BY_SUPPLIER_VALUE[value.toLowerCase()] ?? null) : null;
}

function sameSize(a: TyreSize, b: TyreSize): boolean {
  return (
    a.width === b.width && a.height === b.height && a.diameter === b.diameter
  );
}

/**
 * Houdt alleen de banden over die écht in de gevraagde maat zijn. Een band
 * zonder maatblok valt af: liever een korter lijstje dan een band die niet
 * op de velg past.
 */
export function filterTyres(
  parts: readonly Part[],
  size: TyreSize,
  season: TyreSeason | null,
): Part[] {
  return parts.filter((part) => {
    const partSize = partTyreSize(part);
    if (!partSize || !sameSize(partSize, size)) return false;
    return !season || partTyreSeason(part) === season;
  });
}
