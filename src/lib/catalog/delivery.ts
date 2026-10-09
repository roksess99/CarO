import {
  familySource,
  type ProductFamily,
  usesVehicleCatalog,
} from "./families";
import type { Part } from "./types";

/**
 * Wanneer het pakket bij de klant is.
 *
 * **Dit is dropshipping**: de groothandel levert rechtstreeks bij de klant
 * (@docs/DECISIONS.md #4). De datum die de leverancier teruggeeft is dus de
 * datum van de klant en niet die van ons magazijn — er is geen magazijn.
 *
 * **De datum van de groothandel wordt onveranderd overgenomen** (winkelkeuze
 * van de eigenaar, 2026-10-09). Hier kwam tot die dag één werkdag bij, omdat
 * hij met de hand inkoopt; dat is eraf. Wat dat betekent staat in
 * @docs/DECISIONS.md #27: koopt hij in nadat de groothandel zijn dag heeft
 * afgesloten, dan is de datum die de klant las een dag te vroeg.
 *
 * **De datum komt van dezelfde groothandel als de prijs** (`part.sellerId`).
 * Mengen van twee verkopers levert een belofte op die bij niemand hoort —
 * dezelfde fout als bij de voorraad (@docs/DECISIONS.md #22).
 *
 * GEMETEN 2026-10-03, en dat bepaalde de vorm:
 *
 * - **De postcode doet niets.** Vier postcodes door heel Nederland gaven bij
 *   beide API's dezelfde datums. De parameter wordt geaccepteerd en genegeerd;
 *   daarom vragen we er niet om.
 * - **Het aantal doet alles.** Bij één band: twee groothandels, snelste 7
 *   oktober. Bij twee: de goedkoopste heeft er maar één, valt weg, en het
 *   wordt 9 oktober bij de volgende. Daarom hoort het aantal in de aanvraag.
 */

/** Eén uur: de datums schuiven per dag, niet per minuut */
const CACHE_MS = 60 * 60_000;

/** Niet eindeloos laten groeien; een winkel toont maar zoveel artikelen */
const MAX_CACHE = 500;

const cache = new Map<string, { at: number; date: string | null }>();

interface Distributor {
  distributorId?: number;
  shippingCosts?: Record<string, { estimatedDelivery?: string } | undefined>;
}

async function fetchDistributors(
  family: ProductFamily,
  articleId: string,
  quantity: number,
): Promise<Distributor[]> {
  const url = usesVehicleCatalog(family)
    ? `https://tyre24.alzura.com/nl/nl/rest/V16/wearparts/distributorList?articleId=${encodeURIComponent(articleId)}&quantity=${quantity}`
    : wheelsUrl(family, articleId, quantity);
  const token = usesVehicleCatalog(family)
    ? process.env.TYRE24_WEARPARTS_TOKEN
    : process.env.TYRE24_API_TOKEN;

  if (!url || !token) return [];

  const response = await fetch(url, {
    headers: { "X-AUTH-TOKEN": token },
    signal: AbortSignal.timeout(6000),
    next: { revalidate: 3600 },
  });
  if (!response.ok) return [];

  const data: unknown = await response.json();
  if (!Array.isArray(data)) return [];
  return data as Distributor[];
}

function wheelsUrl(
  family: ProductFamily,
  itemId: string,
  quantity: number,
): string | null {
  const source = familySource(family);
  if (!source) return null;
  return `${source.baseUrl}/distributors?productAreaId=${source.productAreaId}&itemId=${encodeURIComponent(itemId)}&quantity=${quantity}`;
}

/**
 * De verwachte leverdatum, als ISO-dag (`2026-10-08`), of `null`.
 *
 * **`null` is een geldig antwoord en betekent: niets tonen.** Geen
 * "levertijd onbekend" en geen foutmelding; een levertijd die je niet kunt
 * onderbouwen beloof je niet. De bestaande verzendtekst blijft dan staan.
 */
export async function expectedDelivery(
  part: Pick<Part, "id" | "family" | "sellerId">,
  quantity = 1,
): Promise<string | null> {
  if (part.sellerId === undefined) return null;

  const key = `${part.family}:${part.id}:${quantity}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_MS) return hit.date;

  let date: string | null = null;
  try {
    const distributors = await fetchDistributors(part.family, part.id, quantity);
    const mine = distributors.find((d) => d.distributorId === part.sellerId);
    const raw = Object.values(mine?.shippingCosts ?? {})
      .map((option) => option?.estimatedDelivery)
      .filter((value): value is string => typeof value === "string")
      .sort()[0];

    // Onveranderd overnemen — maar niet ongekeurd. De vorm staat vast met de
    // regex; dat `2026-02-31` daar doorheen komt en geen bestaande dag is,
    // vangt de datumcontrole eronder op. Een onzindatum doorgeven zou in de
    // mail en op de factuur belanden, want hij wordt bij het afrekenen
    // bevroren (@docs/DECISIONS.md #27).
    if (
      raw &&
      /^\d{4}-\d{2}-\d{2}$/.test(raw) &&
      !Number.isNaN(new Date(`${raw}T12:00:00`).getTime())
    ) {
      date = raw;
    }
  } catch (error) {
    // Een levertijd is prettig om te weten, geen reden om een productpagina
    // te laten vallen.
    console.error("Leverdatum kon niet opgehaald worden", error);
  }

  if (cache.size >= MAX_CACHE) {
    for (const [oud, waarde] of cache) {
      if (now - waarde.at >= CACHE_MS) cache.delete(oud);
    }
    if (cache.size >= MAX_CACHE) cache.clear();
  }
  cache.set(key, { at: now, date });
  return date;
}

/**
 * De laatste datum over meerdere regels: het pakket is pas compleet als het
 * laatste artikel er is. Komt er van één regel niets terug, dan is er niets te
 * beloven over het geheel en geven we `null`.
 */
export async function expectedDeliveryForAll(
  lines: ReadonlyArray<{ part: Pick<Part, "id" | "family" | "sellerId">; quantity: number }>,
): Promise<string | null> {
  if (lines.length === 0) return null;
  const dates = await Promise.all(
    lines.map((line) => expectedDelivery(line.part, line.quantity)),
  );
  if (dates.some((date) => date === null)) return null;
  return (dates as string[]).sort().at(-1) ?? null;
}
