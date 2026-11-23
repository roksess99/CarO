/**
 * De rijtjes in de footer: automerken, onderdelenmerken en veelgezochte
 * onderdelen.
 *
 * **Elke naam is tegelijk de zoekterm.** De catalogus van de leverancier is
 * Nederlands (docs/api/WEARPARTS.md: er is geen Engels platform), dus een
 * Engelse vertaling van "Remblokken" zou nul treffers geven. Daarom staan deze
 * labels in beide talen in het Nederlands — net als de artikelnamen op de
 * productpagina's.
 *
 * Alles hier verwijst naar een pagina die bestaat en resultaten geeft; er
 * staat geen link in die op een lege pagina uitkomt.
 */

/**
 * Automerken → de zoekbrug op merk en model (`/mijn-auto`).
 *
 * GEMETEN 2026-09-10 hoeveel artikelen elk merk oplevert: Audi, BMW, Ford,
 * Opel en Volkswagen elk 47, Peugeot 45, Mercedes-Benz 41, Renault 33.
 * Citroën gaf er drie en staat er daarom niet bij — een merk aanbieden dat
 * op een vrijwel lege pagina uitkomt is erger dan het weglaten.
 */
export const CAR_MAKES = [
  "Audi",
  "BMW",
  "Ford",
  "Mercedes-Benz",
  "Opel",
  "Peugeot",
  "Renault",
  "Volkswagen",
] as const;

/** Fabrikanten van onderdelen → vrije zoekopdracht */
export const PART_BRANDS = [
  "Bosch",
  "Brembo",
  "Febi",
  "Hella",
  "Mann-Filter",
  "Sachs",
  "Valeo",
  "Vemo",
] as const;

/** Onderdelen waar het meest op gezocht wordt → vrije zoekopdracht */
export const POPULAR_PARTS = [
  "Remschijf",
  "Remblokken",
  "Oliefilter",
  "Luchtfilter",
  "Schokdemper",
  "Bougie",
  "Distributieriem",
  "Accu",
] as const;

/**
 * De foto bij elk veelgezocht onderdeel, voor de tegels op de homepage.
 *
 * Een sleutel uit `lib/catalog/group-photos.ts`, dus dezelfde foto's van de
 * groothandel als in de rij "meest gezocht" (@docs/DECISIONS.md #9). Een
 * `Record` op het type van `POPULAR_PARTS`: zet je er een onderdeel bij, dan
 * weigert TypeScript te bouwen tot hij ook een foto heeft — een tegel zonder
 * beeld valt in een raster van foto's direct op.
 */
export const POPULAR_PART_PHOTOS: Record<
  (typeof POPULAR_PARTS)[number],
  string
> = {
  Remschijf: "remschijf",
  Remblokken: "remblok",
  Oliefilter: "oliefilter",
  Luchtfilter: "luchtfilter",
  Schokdemper: "schokdemper",
  Bougie: "bougie",
  Distributieriem: "distributieriem",
  Accu: "accu",
};
