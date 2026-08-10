import type { SelectedFilters } from "./types";

// Filters staan in de URL als herhaalde `f`-parameters: ?f=merk:BOSCH&f=inzet:Winterbanden
// Eén parameter houdt de URL leesbaar en werkt zonder JavaScript, want elke
// filteroptie is gewoon een link naar dezelfde pagina met een andere `f`.

export const FILTER_PARAM = "f";

/** URL-parameters → gekozen filters per groep */
export function parseFilterParam(
  raw: string | string[] | undefined,
): SelectedFilters {
  const entries = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
  const selected: SelectedFilters = {};
  for (const entry of entries) {
    // Alleen op de eerste dubbele punt splitsen: waarden mogen er zelf ook
    // een bevatten (bv. een maataanduiding).
    const separator = entry.indexOf(":");
    if (separator <= 0) continue;
    const key = entry.slice(0, separator);
    const value = entry.slice(separator + 1);
    if (!value) continue;
    (selected[key] ??= []).push(value);
  }
  return selected;
}

/** Gekozen filters → lijst voor de querystring */
export function toFilterParam(selected: SelectedFilters): string[] {
  return Object.entries(selected).flatMap(([key, values]) =>
    values.map((value) => `${key}:${value}`),
  );
}

/** Een waarde aan- of uitzetten binnen een groep */
export function toggleFilter(
  selected: SelectedFilters,
  key: string,
  value: string,
): SelectedFilters {
  const current = selected[key] ?? [];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  const result = { ...selected };
  if (next.length) result[key] = next;
  else delete result[key];
  return result;
}

export function isFilterActive(
  selected: SelectedFilters,
  key: string,
  value: string,
): boolean {
  return selected[key]?.includes(value) ?? false;
}

export function countActiveFilters(selected: SelectedFilters): number {
  return Object.values(selected).reduce((sum, values) => sum + values.length, 0);
}
