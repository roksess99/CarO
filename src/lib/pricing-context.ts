import {
  activeDiscounts,
  type DiscountSet,
  NO_DISCOUNTS,
} from "@/lib/discounts/rules";
import {
  NO_REFERENCES,
  referencePrices,
  type ReferenceSet,
} from "@/lib/prices/references";

/**
 * Alles wat een adapter nodig heeft om een prijs te bepalen, in één object.
 *
 * Twee dingen die allebei uit ónze database komen en allebei bij élke
 * productweergave nodig zijn:
 *
 * - **welke actie erop loopt** — dat bepaalt de prijs die de klant betaalt;
 * - **de laagste prijs van de afgelopen dertig dagen** — dat bepaalt of er een
 *   doorgestreepte "van"-prijs bij mag staan.
 *
 * Samen in één object omdat ze samen opgehaald worden: twee losse `await`s in
 * elke adapter zouden hetzelfde verzoek twee keer laten wachten. Beide staan
 * een paar minuten in het geheugen, dus dit kost in de praktijk niets.
 */
export interface PricingContext {
  discounts: DiscountSet;
  references: ReferenceSet;
}

/** Geen actie en geen geschiedenis: de kale prijs uit de catalogus */
export const PLAIN_PRICING: PricingContext = {
  discounts: NO_DISCOUNTS,
  references: NO_REFERENCES,
};

export async function pricingContext(): Promise<PricingContext> {
  const [discounts, references] = await Promise.all([
    activeDiscounts(),
    referencePrices(),
  ]);
  return { discounts, references };
}
