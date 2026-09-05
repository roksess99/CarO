// Brug tussen de gekozen auto en de catalogus.
//
// De echte fitment-koppeling (RDW-kenteken → TecDoc-voertuig-id) bestaat niet
// — `tecDocData` komt leeg terug en er zijn geen voertuig-endpoints, gemeten
// 2026-09-05, zie docs/DECISIONS.md #6. Wat wél kan: de vrije-tekstzoekfunctie
// van Tyre24. Staalvelgen dragen de auto in hun artikelnaam
// ("SF OPEL CORSA D, 6.0X15 ET39 5/110/65"), dus daar levert zoeken op merk en
// model echte treffers op.
//
// Dit is dus geen garantie dat een artikel past. De UI moet dat ook zo zeggen.

import type { ProductFamily } from "./families";
import type { Vehicle } from "@/lib/vehicle/types";

/**
 * Hoe zeker een resultatenlijst is. Bepaalt welke tekst de klant leest.
 * `none` = deze familie is niet op voertuig te doorzoeken.
 */
export type MatchLevel = "brandModel" | "brand" | "none";

/**
 * Wat een familie kan.
 *
 * - `brandModel`: artikelnamen bevatten merk én model (staalvelgen)
 * - `brand`: alleen het merk komt voor ("Autoschlüssel-Hülle für Opel")
 * - `none`: banden hebben geen voertuigrelatie, en area 3 doorzoekt
 *   uitsluitend exacte OE-nummers
 */
const FAMILY_MATCH: Record<ProductFamily, MatchLevel> = {
  velgen: "brandModel",
  toebehoren: "brand",
  banden: "none",
  onderdelen: "none",
};

export function familyMatchLevel(family: ProductFamily): MatchLevel {
  return FAMILY_MATCH[family];
}

/**
 * De groothandel schrijft merken korter op dan het RDW. "VOLKSWAGEN GOLF"
 * geeft nul treffers, "VW GOLF" wél — gemeten 2026-09-05. Per merk staan de
 * schrijfwijzen in volgorde van kans; we proberen ze allemaal.
 */
const BRAND_ALIASES: Record<string, ReadonlyArray<string>> = {
  VOLKSWAGEN: ["VW", "VOLKSWAGEN"],
  "MERCEDES-BENZ": ["MERCEDES", "MB", "MERCEDES-BENZ"],
  MERCEDES: ["MERCEDES", "MB"],
  CITROEN: ["CITROEN", "CITROËN"],
  "ALFA ROMEO": ["ALFA", "ALFA ROMEO"],
  "LAND ROVER": ["LAND ROVER", "ROVER"],
};

function brandAliases(brand: string): string[] {
  const upper = brand.trim().toUpperCase();
  return [...(BRAND_ALIASES[upper] ?? [upper])];
}

/**
 * Het model zoals de leverancier het schrijft. Het RDW levert
 * "CORSA-D" of "A3 SPORTBACK"; de catalogus heeft "CORSA D" en "A3". Het
 * eerste woord is het onderscheidende deel en de rest voegt vooral ruis toe.
 */
function modelKeyword(model: string): string {
  const first = model.trim().split(/[\s/,]+/)[0] ?? "";
  return first.replace(/[-_]+/g, " ").trim();
}

/**
 * Zoektermen van specifiek naar breed. De aanroeper probeert ze op volgorde
 * en stopt bij de eerste die treffers oplevert — zo krijgt de klant de meest
 * gerichte lijst die de catalogus kan geven.
 */
export function vehicleSearchTerms(
  vehicle: Pick<Vehicle, "brand" | "model">,
  family: ProductFamily,
): Array<{ term: string; level: MatchLevel }> {
  const level = familyMatchLevel(family);
  if (level === "none") return [];

  const aliases = brandAliases(vehicle.brand);
  const model = modelKeyword(vehicle.model);
  const terms: Array<{ term: string; level: MatchLevel }> = [];

  if (level === "brandModel" && model) {
    for (const alias of aliases) terms.push({ term: `${alias} ${model}`, level: "brandModel" });
  }
  for (const alias of aliases) terms.push({ term: alias, level: "brand" });
  return terms;
}

/** Jaartal uit "08.13-" (maand.jaar) of gewoon "2013" */
function twoDigitYear(value: string): number {
  const year = Number(value);
  return year > 50 ? 1900 + year : 2000 + year;
}

/**
 * Sluit de artikelnaam dit bouwjaar uit?
 *
 * Namen dragen het bouwjaar op twee manieren: "(2011-)" en "08.13-". Kunnen
 * we er geen periode uit lezen, dan houden we het artikel — een terechte
 * treffer wegfilteren is erger dan er een te veel tonen, zeker omdat dit
 * sowieso geen harde fitment-garantie is.
 */
export function matchesYear(name: string, year: number | undefined): boolean {
  if (!year) return true;

  const full = /\((\d{4})\s*-\s*(\d{4})?\)/.exec(name);
  if (full) {
    const from = Number(full[1]);
    const until = full[2] ? Number(full[2]) : Number.POSITIVE_INFINITY;
    return year >= from && year <= until;
  }

  const short = /\b(\d{2})\.(\d{2})\s*-\s*((\d{2})\.(\d{2}))?/.exec(name);
  if (short) {
    const from = twoDigitYear(short[2]);
    const until = short[5] ? twoDigitYear(short[5]) : Number.POSITIVE_INFINITY;
    return year >= from && year <= until;
  }

  return true;
}
