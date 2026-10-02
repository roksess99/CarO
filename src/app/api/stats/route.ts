import { headers } from "next/headers";
import { callerKey, withinLimit } from "@/lib/rate-limit";
import { bump } from "@/lib/stats/store";
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

  const { e, l } = body as { e?: unknown; l?: unknown };
  if (!isStatMetric(e)) return geen();

  await bump(e, cleanLabel(l));
  return geen();
}
