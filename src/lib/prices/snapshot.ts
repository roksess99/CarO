import { usesVehicleCatalog } from "@/lib/catalog/families";
import { loadPartById } from "@/lib/catalog/lookup";
import { getCatalogProvider } from "@/lib/catalog/provider";
import type { Part } from "@/lib/catalog/types";
import { type DiscountRule, rulesToMeasure } from "@/lib/discounts/rules";
import {
  claimJob,
  finishJob,
  prunePrices,
  recordPrices,
  REFERENCE_DAYS,
} from "./history";
import { forgetReferenceCache } from "./references";

/**
 * De dagelijkse prijsmeting.
 *
 * **Wat het kost — GEMETEN 2026-09-17 op het echte account.** Eén verzoek
 * draagt honderden prijzen tegelijk, dus de rekening gaat over het aantal
 * acties, niet over het aantal artikelen:
 *
 * | Wat | Verzoeken |
 * |---|---|
 * | `limit=500` op Auto / SUV (1.603 banden) | 4, samen ~100 s |
 * | Eén artikel in de korting | 1 |
 * | Geen actie aan | 0 |
 *
 * De leverancier staat 100 verzoeken per minuut toe voor de héle winkel. Dit
 * draait 's nachts en kost daar een fractie van.
 *
 * **Ook artikelen van een geplande actie worden gemeten.** Dat is het hele
 * punt: de "van"-prijs mag de laagste prijs van dertig dagen zijn, dus wie een
 * actie een maand vooruit plant heeft straks dertig dagen volle prijs staan en
 * mag het echte verschil tonen. Een actie die vandaag begint heeft niets.
 */

/** Artikelen per verzoek. GEMETEN: 500 stuks in 25,7 s; 1000 duurt 52 s. */
const PAGE_SIZE = 500;

/**
 * Meer pagina's dan dit halen we niet op per actie — 5.000 artikelen is ruim
 * boven de grootste categorie, en het houdt een verkeerd ingestelde actie
 * ervan af de hele nacht te blijven pompen.
 */
const MAX_PAGES = 10;

/** Acties die binnen dit aantal dagen beginnen tellen al mee */
const PLAN_AHEAD_DAYS = REFERENCE_DAYS + 5;

export const PRICE_JOB = "prices";

export interface SnapshotResult {
  /** Overgeslagen omdat er vandaag al gemeten is */
  skipped: boolean;
  rules: number;
  parts: number;
  requests: number;
  pruned: number;
  errors: string[];
  ms: number;
}

async function partsForRule(
  rule: DiscountRule,
  count: { requests: number },
): Promise<Part[]> {
  if (!rule.family) return [];

  if (rule.scope === "part") {
    count.requests += 1;
    const part = await loadPartById(rule.family, rule.target);
    return part ? [part] : [];
  }

  // De catalogus van onderdelen hangt aan een gekozen auto en is niet in zijn
  // geheel op te vragen. Een actie op één onderdeel kan wél (hierboven).
  if (usesVehicleCatalog(rule.family)) return [];

  const provider = getCatalogProvider();
  const found: Part[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    count.requests += 1;
    const batch = await provider.getParts({
      family: rule.family,
      categorySlug: rule.scope === "category" ? rule.target : undefined,
      limit: PAGE_SIZE,
      page,
    });
    found.push(...batch);
    // Minder dan een volle pagina terug betekent: dit was de laatste
    if (batch.length < PAGE_SIZE) break;
  }
  return found;
}

/**
 * Meten en wegschrijven. Draait hooguit één keer per dag: de eerste die de dag
 * claimt mag, de rest krijgt `skipped` terug.
 *
 * `force` slaat die claim over — dat is de knop in het beheerpaneel, voor wie
 * wil zien dat het werkt zonder een dag te wachten.
 */
export async function runPriceSnapshot(
  options: { force?: boolean } = {},
): Promise<SnapshotResult> {
  const begin = Date.now();
  const empty: SnapshotResult = {
    skipped: true,
    rules: 0,
    parts: 0,
    requests: 0,
    pruned: 0,
    errors: [],
    ms: 0,
  };

  if (!options.force && !(await claimJob(PRICE_JOB))) return empty;

  const errors: string[] = [];
  const count = { requests: 0 };
  const prices = new Map<string, number>();

  const horizon = new Date(Date.now() + PLAN_AHEAD_DAYS * 86_400_000);
  const rules = await rulesToMeasure(horizon);

  for (const rule of rules) {
    try {
      for (const part of await partsForRule(rule, count)) {
        // Wat de klant vandaag zou betalen, inclusief een lopende actie: dát
        // is de prijs die de wet als referentie kent.
        prices.set(part.id, part.priceCents);
      }
    } catch (error) {
      // Eén actie die struikelt mag de rest niet meenemen
      errors.push(
        `${rule.scope}:${rule.target} — ${error instanceof Error ? error.message : "onbekende fout"}`,
      );
    }
  }

  const entries = [...prices].map(([partId, priceCents]) => ({
    partId,
    priceCents,
  }));
  await recordPrices(entries);
  const pruned = await prunePrices();
  forgetReferenceCache();

  const result: SnapshotResult = {
    skipped: false,
    rules: rules.length,
    parts: entries.length,
    requests: count.requests,
    pruned,
    errors,
    ms: Date.now() - begin,
  };

  await finishJob(PRICE_JOB, result);
  return result;
}
