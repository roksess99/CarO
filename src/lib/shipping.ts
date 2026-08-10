// Verzendkosten. Bedragen in centen, inclusief btw — net als alle prijzen
// die de klant ziet (CLAUDE.md).
//
// ONDERZOCHT 2026-08-07 bij bekende NL/EU onderdelenshops:
//   Winparts   € 6,95
//   Autodoc    € 9,95  (gratis vanaf € 120)
//   Auto-onderdelen24    (gratis vanaf € 120)
//
// Gemiddelde van de twee bekende tarieven: € 8,45. Wij gaan daar € 1 onder
// zitten → € 7,45. Ter vergelijking: Tyre24 rekent óns € 6,90 per zending
// (en levert gratis boven € 60 inkoopwaarde), dus dit dekt de kosten.
const SHIPPING_COST_CENTS = 745;

/** Vanaf dit orderbedrag verzenden we gratis */
const FREE_SHIPPING_FROM_CENTS = 10_000;

export interface ShippingResult {
  /** Wat de klant betaalt aan verzendkosten, in centen */
  costCents: number;
  /** Bedrag dat nog nodig is voor gratis verzending; 0 als het al gratis is */
  remainingForFreeCents: number;
  isFree: boolean;
}

export function calculateShipping(subtotalCents: number): ShippingResult {
  // Lege wagen: niets te verzenden, dus ook geen kosten tonen
  if (subtotalCents <= 0) {
    return {
      costCents: 0,
      remainingForFreeCents: FREE_SHIPPING_FROM_CENTS,
      isFree: false,
    };
  }
  const isFree = subtotalCents >= FREE_SHIPPING_FROM_CENTS;
  return {
    costCents: isFree ? 0 : SHIPPING_COST_CENTS,
    remainingForFreeCents: isFree
      ? 0
      : FREE_SHIPPING_FROM_CENTS - subtotalCents,
    isFree,
  };
}

export const FREE_SHIPPING_THRESHOLD_CENTS = FREE_SHIPPING_FROM_CENTS;
export const STANDARD_SHIPPING_CENTS = SHIPPING_COST_CENTS;
