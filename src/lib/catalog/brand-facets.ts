import type { Part } from "./types";

/**
 * Merken tellen over een lijst artikelen die we al in handen hebben.
 *
 * **Waarom niet de filters van de leverancier.** Die horen bij een categorie,
 * en bij een zoekopdracht op bandenmaat komt de lijst juist niet uit een
 * categorie (`/items` accepteert `search` óf `parentNodeId`, nooit allebei).
 * De filterknoppen van de API zouden dan over een ándere verzameling gaan dan
 * wat er op het scherm staat.
 *
 * Bijkomend voordeel: deze aantallen zijn **echt**. Het `count`-veld van
 * Tyre24 staat bij élk merk op 1 (GEMETEN 2026-08-16), dus daar valt niets
 * mee te sorteren en niets mee te tonen.
 */
export interface BrandFacet {
  /** Het merk zoals de leverancier het schrijft; ook de waarde in de URL */
  label: string;
  count: number;
}

/** Hoofdletters en spaties weg, zodat "Apollo" en "APOLLO" één merk zijn */
function key(brand: string): string {
  return brand.trim().toUpperCase();
}

/** Merken met hun aantal, grootste eerst en bij gelijk aantal op naam */
export function brandFacets(parts: readonly Part[]): BrandFacet[] {
  const counts = new Map<string, BrandFacet>();
  for (const part of parts) {
    const label = part.brand?.trim();
    if (!label) continue;
    const found = counts.get(key(label));
    if (found) {
      found.count += 1;
    } else {
      counts.set(key(label), { label, count: 1 });
    }
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, "nl"),
  );
}

/** Of dit artikel bij het gekozen merk hoort; hoofdletterongevoelig */
export function matchesBrand(part: Part, brand: string): boolean {
  return key(part.brand ?? "") === key(brand);
}
