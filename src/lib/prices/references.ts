import { activeRules, type DiscountRule } from "@/lib/discounts/rules";
import { lowestPricesBetween, REFERENCE_DAYS } from "./history";

/**
 * De doorgestreepte "van"-prijs per artikel.
 *
 * **Het venster hangt aan de actie, niet aan vandaag.** Het Besluit
 * prijsaanduiding producten vraagt de laagste prijs van de dertig dagen die aan
 * de verlaging vóórafgaan. Zou je tot vandaag tellen, dan zit de actieprijs
 * zelf in dat venster en is de laagste prijs per definitie gelijk aan wat het
 * artikel nu kost — er verschijnt dan nooit een "van"-prijs. (Zo stond het er
 * eerst; gevonden bij het narekenen op 2026-09-17.)
 *
 * Dus: per lopende actie kijken we naar de dertig dagen vóór háár startdatum.
 * Een actie die vandaag begint heeft dat venster niet gevuld en toont dus geen
 * doorgestreepte prijs. Wie een maand vooruit plant wél.
 */

export interface ReferenceSet {
  referenceFor(partId: string): number | undefined;
}

export const NO_REFERENCES: ReferenceSet = { referenceFor: () => undefined };

const CACHE_MS = 5 * 60_000;
let cache: { at: number; set: ReferenceSet } | null = null;

/** De startmomenten van de lopende acties, ontdubbeld op de dag */
function startDays(rules: ReadonlyArray<DiscountRule>): Date[] {
  const byDay = new Map<string, Date>();
  for (const rule of rules) {
    byDay.set(rule.startsAt.toISOString().slice(0, 10), rule.startsAt);
  }
  return [...byDay.values()];
}

export async function referencePrices(): Promise<ReferenceSet> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.set;

  try {
    const rules = await activeRules();
    if (rules.length === 0) {
      cache = { at: now, set: NO_REFERENCES };
      return NO_REFERENCES;
    }

    // Eén query per startdag; in de praktijk zijn dat er één of twee.
    const byPart = new Map<string, number>();
    for (const start of startDays(rules)) {
      const from = new Date(start.getTime() - REFERENCE_DAYS * 86_400_000);
      const lows = await lowestPricesBetween(from, start);
      for (const [partId, cents] of lows) {
        // Vallen twee acties over hetzelfde artikel, dan houden we de laagste
        // referentie aan. Dat belooft de klant nooit meer korting dan er is.
        const current = byPart.get(partId);
        if (current === undefined || cents < current) byPart.set(partId, cents);
      }
    }

    const set: ReferenceSet = { referenceFor: (id) => byPart.get(id) };
    cache = { at: now, set };
    return set;
  } catch (error) {
    // Zonder geschiedenis toont de winkel gewoon de nieuwe prijs zonder
    // doorstreping. Dat is de veilige kant: te weinig beloven kan altijd.
    console.error("Prijsgeschiedenis kon niet geladen worden", error);
    return cache?.set ?? NO_REFERENCES;
  }
}

/** Na een meting of een wijziging in het paneel hoeft niemand te wachten */
export function forgetReferenceCache(): void {
  cache = null;
}
