import { stripeProvider } from "./stripe-provider";
import type { PaymentHealth, PaymentProvider } from "./types";

export * from "./types";

/**
 * Wie int het geld.
 *
 * **Waarom dit een functie is en geen import.** Mollie wees de aanvraag
 * 2026-10-09 definitief af en is diezelfde dag uit de code gehaald
 * (@docs/DECISIONS.md #30). Wat bleef is de naad: de winkel praat met vijf
 * bewerkingen en kent de dienst erachter niet. Dat kostte bij deze wissel een
 * dag; bij een volgende is het één bestand.
 *
 * Er is dus bewust géén `PAYMENT_PROVIDER`-variabele meer. Een keuzeschakelaar
 * met één keuze is geen keuze — hij suggereert alleen dat er iets te kiezen
 * valt en dat de andere kant nog werkt.
 */
export function paymentProvider(): PaymentProvider {
  return stripeProvider;
}

/**
 * Bestellingen van vóór de overstap dragen een Mollie-kenmerk (`tr_…`). Dat is
 * bij Stripe niet op te zoeken, dus elke poging geeft een fout die niets
 * uitlegt. Hiermee is het verschil zichtbaar te maken waar het ertoe doet: bij
 * het terugbetalen in het beheerpaneel.
 *
 * Opzoeken en terugboeken kan voor die bestellingen alleen nog in het
 * Mollie-dashboard zelf.
 */
export function isLegacyMolliePayment(paymentId: string): boolean {
  return paymentId.startsWith("tr_");
}

/** Vijf minuten: kort genoeg om het te merken, en het verandert zelden */
const CACHE_MS = 5 * 60_000;
let cache: { at: number; result: PaymentHealth } | null = null;

/**
 * Kan er op dit moment betaald worden? Gooit nooit — een storing bij het
 * ophalen van de gezondheid mag de winkel niet meeslepen.
 */
export async function paymentsHealth(): Promise<PaymentHealth> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.result;

  const provider = paymentProvider();
  let result: PaymentHealth;
  try {
    result = await provider.health();
  } catch (error) {
    result = {
      provider: provider.name,
      configured: provider.isConfigured(),
      reachable: false,
      rejected: false,
      live: false,
      ready: false,
      methods: [],
      detail: error instanceof Error ? error.message : "onbereikbaar",
    };
  }

  cache = { at: now, result };
  return result;
}

/** Na een wijziging in het dashboard hoeft niemand vijf minuten te wachten */
export function forgetPaymentsHealth(): void {
  cache = null;
}
