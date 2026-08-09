// Consumentenprijs uit de B2B-prijzen van Tyre24.
//
// GEMETEN 2026-08-07 aan de echte API: elk artikel heeft een prijsblok
// `type: "ek"` (inkoopprijs) en meestal `type: "evp_3"` (adviesverkoopprijs
// van de leverancier). Voorbeeld band: ek 27,63 / evp_3 48,00.
//
// !! AANNAME DIE GEVERIFIEERD MOET WORDEN VOORDAT DE SHOP LIVE GAAT !!
// Tyre24 is een B2B-marktplaats en die noteren bedragen standaard EXCLUSIEF
// btw. De API-documentatie zegt er niets over. Wij rekenen daarom 21% btw
// erbovenop. Blijkt dat de bedragen al inclusief btw zijn, dan is elke prijs
// in de shop 21% te hoog. Navragen bij Tyre24. Zie docs/DECISIONS.md #5.
const VAT_PERCENT = 21;

const DEFAULT_MARGIN_PERCENT = 35;

function marginPercent(): number {
  const raw = Number(process.env.CARO_MARGIN_PERCENT);
  return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_MARGIN_PERCENT;
}

/** Of de adviesverkoopprijs van de leverancier gevolgd wordt (default: ja) */
function followsRecommendedPrice(): boolean {
  return process.env.CARO_USE_RECOMMENDED_PRICE !== "false";
}

function addVat(cents: number): number {
  return Math.round((cents * (100 + VAT_PERCENT)) / 100);
}

/**
 * Inkoop- en adviesprijs (beide excl. btw, in centen) → consumentenprijs
 * in centen inclusief btw. Integer-rekenwerk, nooit floats voor geld.
 *
 * Regel: volg de adviesverkoopprijs van de leverancier als die er is —
 * dat is een marktconforme prijs. Anders inkoopprijs + eigen marge.
 */
export function consumerPriceCents({
  purchaseCents,
  recommendedCents,
}: {
  purchaseCents: number;
  recommendedCents?: number | null;
}): number {
  if (followsRecommendedPrice() && recommendedCents && recommendedCents > purchaseCents) {
    return addVat(recommendedCents);
  }
  const withMargin = Math.round((purchaseCents * (100 + marginPercent())) / 100);
  return addVat(withMargin);
}

/** Alleen nog voor losse berekeningen/tests: inkoop → consumentenprijs via marge */
export function sellingPriceCents(purchasePriceCents: number): number {
  return consumerPriceCents({ purchaseCents: purchasePriceCents });
}
