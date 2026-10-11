import { headers } from "next/headers";
import { callerKey, withinLimit } from "@/lib/rate-limit";
import { bumpMany } from "@/lib/stats/store";
import { cleanLabel, isStatMetric } from "@/lib/stats/types";

/**
 * Het ontvangstadres van de eigen tellers.
 *
 * Wat hier binnenkomt is één woord uit een vaste lijst plus een kort label.
 * Geen IP-adres, geen sleutel, geen identificatie van de bezoeker — zie
 * `db/migrations/0010_stats.sql` voor waarom dat zo is gebouwd.
 *
 * **Het antwoord is altijd 204, ook bij onzin.** Een telader die vertelt wat
 * hij accepteert is een telader die iemand gaat vullen; en de browser doet er
 * toch niets mee, want hij stuurt dit met `sendBeacon` en kijkt niet of het
 * aankwam.
 */
export const dynamic = "force-dynamic";

/** Ruim voor een mens die doorklikt, krap voor een script */
const LIMIT = { bucket: "stats", max: 120, windowMs: 60_000 };

/** Wat zich als bot aankondigt tellen we niet mee; de rest vangt sendBeacon al af */
const BOT = /bot|crawler|spider|crawling|preview|headless|monitor|curl|wget/i;

const geen = () => new Response(null, { status: 204 });

export async function POST(request: Request): Promise<Response> {
  const list = await headers();
  if (BOT.test(list.get("user-agent") ?? "")) return geen();

  // Het adres van de bezoeker wordt alleen gebruikt om te remmen en nergens
  // bewaard — zelfde afspraak als bij het contactformulier.
  if (!withinLimit(await callerKey(), LIMIT)) return geen();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return geen();
  }
  if (typeof body !== "object" || body === null) return geen();

  // Twee vormen, en dat is geen slordigheid maar een deploy-eis: de browser
  // van iemand die de winkel al open had staan stuurt nog de oude losse vorm
  // door, en die tellingen horen gewoon mee te tellen. De lijst is sinds
  // 2026-10-11 wat de winkel zelf stuurt.
  const raw: unknown[] = Array.isArray(body) ? body : [body];

  // **De snelheidsrem telt verzoeken, niet gebeurtenissen.** Zonder deze
  // grens zou één POST met duizend elementen duizend databaseregels ophogen
  // en de rem gewoon passeren — precies het gat dat je maakt door te
  // bundelen. Vier is ruim: de eerste pagina van een bezoek levert er drie.
  const events = raw.slice(0, 4).flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const { e, l } = item as { e?: unknown; l?: unknown };
    return isStatMetric(e) ? [{ metric: e, label: cleanLabel(l) }] : [];
  });
  if (events.length === 0) return geen();

  await bumpMany(events);
  return geen();
}
