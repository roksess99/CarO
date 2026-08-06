// Bedragen zijn integers in eurocenten (CLAUDE.md). Alleen hier wordt
// gedeeld door 100. nl-NL-notatie in beide talen: NL-markt, euro.
const eurFormatter = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
});

export function formatPriceCents(priceCents: number): string {
  return eurFormatter.format(priceCents / 100);
}
