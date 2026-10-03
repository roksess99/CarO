import { familySource, PRODUCT_FAMILIES, usesVehicleCatalog } from "./families";

/**
 * Werkt de sleutel bij de leverancier nog?
 *
 * **Waarom dit bestaat.** De adapter vangt een fout van de leverancier af met
 * een lege lijst. Dat is goed voor de klant — hij krijgt een eerlijke lege
 * staat in plaats van een foutpagina — maar het betekent ook dat een verlopen
 * token er precies zo uitziet als een categorie zonder aanbod. GEMETEN
 * 2026-10-03: de onderdelen stonden een dag uit de winkel zonder dat iets of
 * iemand dat meldde, en wat er nog stond waren restanten uit de cache die
 * langzaam ouder werden (@docs/api/WEARPARTS.md).
 *
 * Tokens verlopen; dat staat met zoveel woorden in de documentatie van de
 * leverancier. Dit is dus geen uitzondering maar iets dat terugkomt.
 *
 * **Bewust een eigen aanroep en niet de provider.** Die cachet zijn antwoorden
 * een uur; een geslaagde call van vanmorgen zou een dode sleutel van nu
 * verbergen. Daarom het goedkoopste endpoint per API, zonder cache.
 */

export type CatalogApi = "products" | "wearparts";

export interface CatalogStatus {
  api: CatalogApi;
  /** De families die hierop draaien, voor de melding in het paneel */
  families: ReadonlyArray<string>;
  ok: boolean;
  /** `true` als de leverancier onze sleutel weigert (401/403) */
  rejected: boolean;
  status?: number;
  detail?: string;
}

/** Vijf minuten is kort genoeg om het te merken en ruim binnen de rate limit */
const CACHE_MS = 5 * 60_000;
let cache: { at: number; result: CatalogStatus[] } | null = null;

/** Het goedkoopste antwoord dat een token vereist, per API */
const PROBES: Record<CatalogApi, { url: (base: string) => string }> = {
  // Negen areas; het kleinste dat bestaat op deze API.
  products: { url: (base) => `${base}/areas` },
  // Een handvol sorteeropties. Geen parameters nodig en een klein antwoord.
  wearparts: { url: () => "https://tyre24.alzura.com/nl/nl/rest/V16/wearparts/sorters" },
};

async function probe(
  api: CatalogApi,
  url: string,
  token: string | undefined,
  families: ReadonlyArray<string>,
): Promise<CatalogStatus> {
  if (!token) {
    return {
      api,
      families,
      ok: false,
      rejected: false,
      detail: "geen sleutel ingesteld",
    };
  }

  try {
    const response = await fetch(url, {
      headers: { "X-AUTH-TOKEN": token },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) return { api, families, ok: true, rejected: false };

    // 401 en 403 zijn het geval waar het om gaat: de sleutel wordt geweigerd.
    // Een 500 bij de leverancier is vervelend maar gaat vanzelf over.
    const rejected = response.status === 401 || response.status === 403;
    let detail = `HTTP ${response.status}`;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "errorCode" in body) {
        detail = String((body as { errorCode: unknown }).errorCode);
      }
    } catch {
      // Geen JSON; de status zegt genoeg
    }
    return { api, families, ok: false, rejected, status: response.status, detail };
  } catch (error) {
    return {
      api,
      families,
      ok: false,
      rejected: false,
      detail: error instanceof Error ? error.message : "onbereikbaar",
    };
  }
}

export async function catalogHealth(): Promise<CatalogStatus[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.result;

  const products = PRODUCT_FAMILIES.filter((family) => !usesVehicleCatalog(family));
  const parts = PRODUCT_FAMILIES.filter((family) => usesVehicleCatalog(family));

  // Eén willekeurige bron van de Products-API volstaat: ze delen het token.
  const source = products.map((family) => familySource(family)).find(Boolean);

  const result = await Promise.all([
    probe(
      "products",
      source ? PROBES.products.url(source.baseUrl) : "",
      source ? process.env.TYRE24_API_TOKEN : undefined,
      products,
    ),
    probe(
      "wearparts",
      PROBES.wearparts.url(""),
      process.env.TYRE24_WEARPARTS_TOKEN,
      parts,
    ),
  ]);

  cache = { at: now, result };
  return result;
}

/** Na een sleutelwissel hoeft niemand vijf minuten te wachten */
export function forgetCatalogHealth(): void {
  cache = null;
}
