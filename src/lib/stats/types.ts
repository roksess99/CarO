/**
 * Wat we tellen, en wat niet.
 *
 * Deze lijst is tegelijk de toegangscontrole van `/api/stats`: een naam die
 * hier niet in staat wordt geweigerd. Zonder dat is een open telader een
 * uitnodiging om de cijfers van de eigenaar vol te schrijven.
 *
 * **Er staat geen `paid` in.** Betaalde bestellingen telt het dashboard uit
 * `orders`; dat is de waarheid, en een tweede telling ernaast loopt vroeg of
 * laat uit de pas.
 */
export const STAT_METRICS = [
  /** Eerste pagina van een bezoek: er was geen verwijzer van onze eigen site */
  "visit",
  /** Elke paginaweergave, met het soort pagina als label */
  "pageview",
  /** Waar het bezoek vandaan kwam: google, direct of overig */
  "source",
  /** Er ging een artikel in de winkelwagen */
  "cart_add",
  /** Het afrekenscherm is geopend */
  "checkout_start",
  /** De klant is doorgestuurd naar de betaaldienst */
  "payment_start",
] as const;

export type StatMetric = (typeof STAT_METRICS)[number];

export function isStatMetric(value: unknown): value is StatMetric {
  return (
    typeof value === "string" &&
    (STAT_METRICS as ReadonlyArray<string>).includes(value)
  );
}

/**
 * Labels zijn kort, kleine letters, en komen uit de browser — dus ze worden
 * gekeurd en niet vertrouwd. Alles wat hier niet doorheen komt wordt een lege
 * tekst; dan telt de gebeurtenis nog wel, maar zonder verbijzondering.
 */
export function cleanLabel(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().toLowerCase();
  return /^[a-z0-9-]{1,48}$/.test(trimmed) ? trimmed : "";
}

/** Herkomst uit de verwijzer, zonder het adres zelf te bewaren */
export function sourceFromReferrer(referrer: string, host: string): string {
  if (!referrer) return "direct";
  try {
    const from = new URL(referrer).hostname;
    if (from === host || from.endsWith(`.${host}`)) return "";
    if (/(^|\.)google\./.test(from)) return "google";
    if (/(^|\.)bing\./.test(from)) return "bing";
    return "overig";
  } catch {
    return "overig";
  }
}
