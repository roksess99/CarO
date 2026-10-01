import type { Part } from "../catalog/types";
import { MAX_QUANTITY } from "./types";

/**
 * Hoeveel de klant er hoogstens van kan bestellen.
 *
 * **Dit is de voorraad van de groothandel wiens prijs op de pagina staat**, en
 * niet van de hele marktplaats. Wie er meer besteld dan die er heeft, koopt de
 * rest bij de volgende groothandel — duurder, terwijl de klant de lage prijs al
 * heeft afgerekend. GEMETEN 2026-10-01 op banden: gemiddeld € 60,36 verschil op
 * een set van vier, en dat verschil betaalt de winkel.
 *
 * `stock` kan ontbreken: de mock-catalogus draagt hem niet, en een adapter die
 * later bijkomt hoeft hem niet te hebben. Dan geldt de oude bovengrens — niets
 * weten is geen reden om de verkoop te blokkeren.
 */
export function maxOrderable(part: Pick<Part, "stock">): number {
  if (part.stock === undefined) return MAX_QUANTITY;
  return Math.max(0, Math.min(part.stock, MAX_QUANTITY));
}
