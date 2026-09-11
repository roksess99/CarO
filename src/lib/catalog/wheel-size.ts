// Velgmaten uit de filterwaarden van de leverancier.
//
// De Products-API levert geen losse velden voor diameter, breedte en
// steekcirkel: het zijn samengestelde teksten in één filtergroep. GEMETEN
// 2026-09-11 op area 7 (826 staalvelgen, categorie 9999):
//
//   Velgmaat        59 waarden — "5,5j*14", "4.00*13", "6,75*17,5", "16*17"
//   Velgverbinding  88 waarden — "4*100*54" = gaten * steekcirkel * naafgat
//   ET              83 waarden — "35", "23,5", maar ook "hm 115" en "et32"
//
// Dit bestand haalt daar bruikbare assen uit, zodat de klant kan kiezen wat
// hij van zijn auto kent — 15 inch, 5 gaten op 112 — in plaats van uit 59
// samengestelde teksten te moeten prikken.
//
// De keuze wordt teruggezet naar de **exacte leveranciersteksten**, want het
// bestaande filtermechanisme (`toFilterParams`) zoekt daarop. Eén gekozen
// diameter dekt dus meerdere waarden: 15 inch komt voor als "4,5j*15",
// "5j*15", "6,5j*15" en nog vier andere.

import type { FilterGroup, SelectedFilters } from "./types";

/**
 * Welke filtergroep we zoeken, via de vertaalsleutel uit filter-groups.ts.
 *
 * Niet via `group.key`: die is afgeleid van de identifier van de leverancier
 * en heet "a238" — een getal dat nergens uit af te lezen is. En niet via de
 * API-naam ("Velgmaat"), want die staat in de taal van het platform. De
 * labelKey is het enige stabiele én leesbare aanknopingspunt.
 */
const WHEEL_SIZE_LABEL = "rimSize";
const WHEEL_BOLT_LABEL = "boltPattern";

/**
 * "5,5" en "4.00" zijn hetzelfde getal in twee schrijfwijzen. Letters achter
 * de breedte ("j", "b") zijn de velghoorn-vorm en horen niet bij het getal.
 */
function toNumber(text: string): number | null {
  const cleaned = text.trim().replace(",", ".").replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Zoals de klant het leest: 5.5 → "5,5", 15 → "15" */
function formatNumber(value: number): string {
  return String(value).replace(".", ",");
}

export interface WheelSizeValue {
  /** Exacte tekst van de leverancier, bv. "5,5j*14" */
  raw: string;
  width: number;
  diameter: number;
}

/**
 * Velgmaat splitsen. Alles wat niet in twee plausibele getallen uiteenvalt
 * laten we vallen: dat is data waar een keuzelijst niets mee kan, en een
 * onleesbare optie is erger dan een ontbrekende.
 */
export function parseWheelSize(raw: string): WheelSizeValue | null {
  const parts = raw.split("*");
  if (parts.length !== 2) return null;
  const width = toNumber(parts[0]);
  const diameter = toNumber(parts[1]);
  if (width === null || diameter === null) return null;
  // Grenzen uit de gemeten lijst, ruim genomen. Ze houden omgedraaide of
  // verminkte waarden buiten de keuzelijst.
  if (width < 3 || width > 20) return null;
  if (diameter < 8 || diameter > 24) return null;
  return { raw, width, diameter };
}

export interface WheelBoltValue {
  raw: string;
  /** Aantal gaten */
  holes: number;
  /** Steekcirkel in mm */
  pitchCircle: number;
}

/**
 * Velgverbinding splitsen: "4*100*54" → 4 gaten op 100 mm.
 *
 * Het naafgat (het derde getal) laten we bewust weg uit de keuze. Het is
 * onderdeel van de pasvorm, maar de klant kent het zelden en het zou de
 * lijst van 88 naar ruim 30 opties per steekcirkel opblazen. Wie het wél
 * weet ziet het terug op de productpagina.
 *
 * "5,114,3*66" en "281*335*10" komen ook voor: een verminkte en een
 * omgedraaide waarde. Die vallen af op de grenzen hieronder.
 */
export function parseWheelBolts(raw: string): WheelBoltValue | null {
  const parts = raw.split("*");
  if (parts.length !== 3) return null;
  const holes = toNumber(parts[0]);
  const pitchCircle = toNumber(parts[1]);
  if (holes === null || pitchCircle === null) return null;
  if (!Number.isInteger(holes) || holes < 3 || holes > 10) return null;
  if (pitchCircle < 80 || pitchCircle > 360) return null;
  return { raw, holes, pitchCircle };
}

/** Wat de klant kan kiezen, afgeleid uit het filterblok van deze categorie */
export interface WheelOptions {
  diameters: number[];
  widths: number[];
  /** Steekcirkels als "5x112", oplopend op gaten en dan op cirkel */
  bolts: Array<{ value: string; label: string }>;
}

/** Steekcirkel als één sleutel: 5 gaten op 112 mm → "5x112" */
export function boltKey(holes: number, pitchCircle: number): string {
  return `${holes}x${formatNumber(pitchCircle)}`;
}

function groupByLabel(
  groups: readonly FilterGroup[],
  labelKey: string,
): FilterGroup | undefined {
  return groups.find((group) => group.labelKey === labelKey);
}

function optionValues(
  groups: readonly FilterGroup[],
  labelKey: string,
): string[] {
  return groupByLabel(groups, labelKey)?.options.map((o) => o.value) ?? [];
}

export function wheelOptions(groups: readonly FilterGroup[]): WheelOptions {
  const sizes = optionValues(groups, WHEEL_SIZE_LABEL)
    .map(parseWheelSize)
    .filter((size): size is WheelSizeValue => size !== null);
  const bolts = optionValues(groups, WHEEL_BOLT_LABEL)
    .map(parseWheelBolts)
    .filter((bolt): bolt is WheelBoltValue => bolt !== null);

  const boltLabels = new Map<string, string>();
  for (const bolt of bolts) {
    boltLabels.set(
      boltKey(bolt.holes, bolt.pitchCircle),
      `${bolt.holes} × ${formatNumber(bolt.pitchCircle)}`,
    );
  }

  return {
    diameters: [...new Set(sizes.map((s) => s.diameter))].sort((a, b) => a - b),
    widths: [...new Set(sizes.map((s) => s.width))].sort((a, b) => a - b),
    bolts: [...boltLabels.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "nl", { numeric: true })),
  };
}

/** Wat er uit de URL komt; alles los te kiezen en alles optioneel */
export interface WheelSelection {
  diameter?: number;
  width?: number;
  /** Sleutel uit `boltKey`, bv. "5x112" */
  bolts?: string;
}

export function parseWheelSelection(query: {
  diameter?: string;
  breedte?: string;
  steekcirkel?: string;
}): WheelSelection {
  const diameter = query.diameter ? toNumber(query.diameter) : null;
  const width = query.breedte ? toNumber(query.breedte) : null;
  const bolts = query.steekcirkel?.trim();
  return {
    ...(diameter !== null ? { diameter } : {}),
    ...(width !== null ? { width } : {}),
    ...(bolts ? { bolts } : {}),
  };
}

export function hasWheelSelection(selection: WheelSelection): boolean {
  return (
    selection.diameter !== undefined ||
    selection.width !== undefined ||
    selection.bolts !== undefined
  );
}

/**
 * De keuze terug naar leveranciersteksten, zodat het gewone filterpad hem
 * kan gebruiken. Eén gekozen diameter levert alle Velgmaat-waarden met díe
 * diameter op; die gaan als meerkeuze mee, precies zoals de zijbalk het doet.
 *
 * Levert een as niets op, dan laten we hem weg in plaats van een filter te
 * sturen dat gegarandeerd nul treffers geeft.
 */
export function wheelSelectionToFilters(
  groups: readonly FilterGroup[],
  selection: WheelSelection,
): SelectedFilters {
  const filters: SelectedFilters = {};

  const sizeGroup = groupByLabel(groups, WHEEL_SIZE_LABEL);
  if (
    sizeGroup &&
    (selection.diameter !== undefined || selection.width !== undefined)
  ) {
    const matches = sizeGroup.options
      .map((option) => option.value)
      .map(parseWheelSize)
      .filter((size): size is WheelSizeValue => size !== null)
      .filter(
        (size) =>
          (selection.diameter === undefined ||
            size.diameter === selection.diameter) &&
          (selection.width === undefined || size.width === selection.width),
      )
      .map((size) => size.raw);
    // Sleutel van de groep zelf: `toFilterParams` zoekt daarop.
    if (matches.length > 0) filters[sizeGroup.key] = matches;
  }

  const boltGroup = groupByLabel(groups, WHEEL_BOLT_LABEL);
  if (boltGroup && selection.bolts !== undefined) {
    const matches = boltGroup.options
      .map((option) => option.value)
      .map(parseWheelBolts)
      .filter((bolt): bolt is WheelBoltValue => bolt !== null)
      .filter((bolt) => boltKey(bolt.holes, bolt.pitchCircle) === selection.bolts)
      .map((bolt) => bolt.raw);
    if (matches.length > 0) filters[boltGroup.key] = matches;
  }

  return filters;
}

/** Leesbare samenvatting voor de kop boven de resultaten: "15 inch · 5 × 112" */
export function formatWheelSelection(selection: WheelSelection): string {
  return [
    selection.diameter !== undefined
      ? `${formatNumber(selection.diameter)}″`
      : null,
    selection.width !== undefined ? `${formatNumber(selection.width)}J` : null,
    selection.bolts?.replace("x", " × "),
  ]
    .filter(Boolean)
    .join(" · ");
}
