// Bedragen zijn integers in eurocenten (CLAUDE.md). Alleen hier wordt
// gedeeld door 100. nl-NL-notatie in beide talen: NL-markt, euro.
const eurFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
});

export function formatPriceCents(priceCents: number): string {
  return eurFormatter.format(priceCents / 100);
}

/** "4295" → "42.95". Voor JSON-LD/schema.org, dat een punt-decimaal wil. */
export function priceCentsToDecimalString(priceCents: number): string {
  const euros = Math.trunc(priceCents / 100);
  const cents = Math.abs(priceCents % 100);
  return `${euros}.${String(cents).padStart(2, "0")}`;
}

/**
 * Een bedrag dat middenin een zin komt te staan.
 *
 * In het Arabisch loopt de tekst van rechts naar links, en dan is het
 * euroteken een "neutraal" teken: de browser hangt het aan de kant waar
 * toevallig tekst staat. Daardoor werd "€ 7,45" de ene keer "7,45 €" en de
 * andere keer "€ 100,00" — in dezelfde zin (gemeten 2026-09-08). De
 * LRM-tekens eromheen zetten het bedrag als één links-naar-rechts blokje
 * vast, dezelfde afspraak als bij de maten in `search.tipSize`.
 *
 * Alleen voor bedragen in lopende tekst. Een prijs in een eigen element —
 * productkaart, winkelwagen — heeft dit niet nodig.
 */
export function priceInSentence(priceCents: number): string {
  return `‎${formatPriceCents(priceCents)}‎`;
}
