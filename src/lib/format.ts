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
