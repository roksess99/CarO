// Verkoopprijs op basis van de B2B-inkoopprijs van Tyre24.
//
// TODO docs/DECISIONS.md #5: de margestrategie is een open beslissing
// (vaste marge, per categorie, of adviesprijs/evkPrices). Tot die tijd:
// CARO_MARGIN_PERCENT uit .env — alleen voor ontwikkeling, niet live gaan.

const DEFAULT_MARGIN_PERCENT = 35;

function marginPercent(): number {
  const raw = Number(process.env.CARO_MARGIN_PERCENT);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_MARGIN_PERCENT;
}

/** Inkoop (centen, excl. marge) → consumentenprijs in centen. Integer-rekenwerk. */
export function sellingPriceCents(purchasePriceCents: number): number {
  return Math.round((purchasePriceCents * (100 + marginPercent())) / 100);
}
