import { headers } from "next/headers";

/**
 * Eenvoudige rem op formulieren die de buitenwereld mag posten.
 *
 * Bewust in het geheugen en niet in de database. De gevolgen daarvan,
 * expliciet: de teller begint opnieuw bij elke herstart, en op meer dan één
 * instantie telt elke instantie apart. Het is een drempel tegen een
 * losgeslagen script, geen sluitende beveiliging — een honeypot vangt de
 * domme bots, dit vangt het herhalen.
 *
 * Elke aanroeper kiest zijn eigen `bucket`, zodat een bezoeker die net een
 * contactbericht stuurde niet zijn retouraanvraag geweigerd ziet.
 */

const HOUR = 60 * 60 * 1000;
const buckets = new Map<string, Map<string, number[]>>();

export interface RateLimit {
  /** Naam van de teller, bv. "contact" of "retour-zoeken" */
  bucket: string;
  max: number;
  windowMs?: number;
}

export function withinLimit(key: string, limit: RateLimit): boolean {
  const windowMs = limit.windowMs ?? HOUR;
  const now = Date.now();

  let recent = buckets.get(limit.bucket);
  if (!recent) {
    recent = new Map();
    buckets.set(limit.bucket, recent);
  }

  const times = (recent.get(key) ?? []).filter((at) => now - at < windowMs);
  if (times.length >= limit.max) {
    recent.set(key, times);
    return false;
  }
  times.push(now);
  recent.set(key, times);

  // De map mag niet oneindig groeien als er dagenlang verkeer op staat
  if (recent.size > 5000) {
    for (const [otherKey, otherTimes] of recent) {
      if (otherTimes.every((at) => now - at >= windowMs)) recent.delete(otherKey);
    }
  }
  return true;
}

/** Het adres van de bezoeker, alleen om te tellen — het wordt niet bewaard */
export async function callerKey(): Promise<string> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || list.get("x-real-ip") || "onbekend";
}
