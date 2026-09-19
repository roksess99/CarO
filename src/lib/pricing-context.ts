import {
  activeDiscounts,
  type DiscountSet,
  NO_DISCOUNTS,
} from "@/lib/discounts/rules";
import {
  activeMarkups,
  type MarkupSet,
  NO_MARKUP,
} from "@/lib/prices/markup";
import {
  NO_REFERENCES,
  referencePrices,
  type ReferenceSet,
} from "@/lib/prices/references";

/**
 * Alles wat een adapter nodig heeft om een prijs te bepalen, in één object.
 *
 * Drie dingen die alle drie uit ónze database komen en alle drie bij élke
 * productweergave nodig zijn:
 *
 * - **welke opslag erop zit** — dat bepaalt wat het artikel kost;
 * - **welke actie erop loopt** — dat bepaalt wat de klant vandaag betaalt;
 * - **de laagste prijs van de afgelopen dertig dagen** — dat bepaalt of er een
 *   doorgestreepte "van"-prijs bij mag staan.
 *
 * Samen in één object omdat ze samen opgehaald worden: drie losse `await`s in
 * elke adapter zouden hetzelfde verzoek drie keer laten wachten. Alle drie
 * staan een paar minuten in het geheugen, dus dit kost in de praktijk niets.
 */
export interface PricingContext {
  markups: MarkupSet;
  discounts: DiscountSet;
  references: ReferenceSet;
}

/** Geen opslag, geen actie en geen geschiedenis: de kale prijs uit de catalogus */
export const PLAIN_PRICING: PricingContext = {
  markups: NO_MARKUP,
  discounts: NO_DISCOUNTS,
  references: NO_REFERENCES,
};

export async function pricingContext(): Promise<PricingContext> {
  const [markups, discounts, references] = await Promise.all([
    activeMarkups(),
    activeDiscounts(),
    referencePrices(),
  ]);
  return { markups, discounts, references };
}
