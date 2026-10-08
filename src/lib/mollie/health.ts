import { mollieIsConfigured } from "./client";

/**
 * Kan er op dit moment betaald worden?
 *
 * **Waarom dit bestaat.** Een sleutel die werkt is niet hetzelfde als een
 * account dat betalingen aanneemt. GEMETEN 2026-10-08: de live sleutel
 * antwoordde netjes, maar élke methode stond op `pending-boarding` — iDEAL,
 * kaart, Klarna, Riverty. Mollie wilde de gegevens opnieuw verifiëren nadat de
 * handelsnaam bij de KvK was gewijzigd (@docs/DECISIONS.md #3), en zette
 * daarom alles uit.
 *
 * Het gevolg was onzichtbaar: de laatste betaling bij Mollie dateerde van 24
 * september, en er stond sindsdien geen enkele mislukte poging — zonder
 * actieve methode komt een betaling niet eens tot stand. De winkel toonde
 * gewoon een betaalknop, en de klant liep er pas tegenaan nadat hij zijn naam
 * en adres had ingevuld.
 *
 * Zelfde opzet als `lib/catalog/health.ts`: één goedkope aanroep, buiten de
 * gewone betaalcode om, vijf minuten in het geheugen, en hij gooit nooit.
 */

export interface MollieStatus {
  /** Staat er een sleutel in de omgeving? */
  configured: boolean;
  /** Antwoordde Mollie? */
  reachable: boolean;
  /** `true` als Mollie onze sleutel weigert (401/403) */
  rejected: boolean;
  /** Een live- of een testsleutel */
  live: boolean;
  /** De methodes die de klant kan kiezen; leeg betekent: niets te kiezen */
  methods: string[];
  detail?: string;
}

/** Vijf minuten: kort genoeg om het te merken, en het verandert zelden */
const CACHE_MS = 5 * 60_000;
let cache: { at: number; result: MollieStatus } | null = null;

/** Kan een klant hiermee afrekenen? */
export function paymentsPossible(status: MollieStatus): boolean {
  return status.configured && status.reachable && status.methods.length > 0;
}

interface MethodsResponse {
  _embedded?: { methods?: Array<{ id?: string }> };
}

export async function mollieHealth(): Promise<MollieStatus> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.result;

  const key = process.env.MOLLIE_API_KEY ?? "";
  const live = key.startsWith("live_");
  let result: MollieStatus;

  if (!mollieIsConfigured()) {
    result = {
      configured: false,
      reachable: false,
      rejected: false,
      live,
      methods: [],
      detail: "geen sleutel ingesteld",
    };
  } else {
    try {
      // `/methods` geeft precies wat de klant te zien zou krijgen: de
      // methodes die op dit profiel aanstaan. Leeg is het antwoord waar het
      // hier om gaat.
      const response = await fetch("https://api.mollie.com/v2/methods", {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const body = (await response.json()) as MethodsResponse;
        const methods = (body._embedded?.methods ?? [])
          .map((method) => method.id)
          .filter((id): id is string => typeof id === "string");
        result = { configured: true, reachable: true, rejected: false, live, methods };
      } else {
        result = {
          configured: true,
          reachable: true,
          rejected: response.status === 401 || response.status === 403,
          live,
          methods: [],
          detail: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      // Onbereikbaar is iets anders dan "staat uit": het eerste gaat vanzelf
      // over, het tweede vraagt een handeling in het dashboard.
      result = {
        configured: true,
        reachable: false,
        rejected: false,
        live,
        methods: [],
        detail: error instanceof Error ? error.message : "onbereikbaar",
      };
    }
  }

  cache = { at: now, result };
  return result;
}

/** Na een wijziging in het dashboard hoeft niemand vijf minuten te wachten */
export function forgetMollieHealth(): void {
  cache = null;
}
