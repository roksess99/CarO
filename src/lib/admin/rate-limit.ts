/**
 * Pogingen tellen, zodat wachtwoorden niet af te raden zijn.
 *
 * In het geheugen van het proces, bewust. Een tabel erbij zou een schrijfactie
 * per inlogpoging kosten en precies de aanval goedkoop maken die hij moet
 * tegenhouden. De winkel draait op één server, dus één geheugen is genoeg —
 * komen er ooit meer, dan moet dit mee.
 *
 * Wat het níet is: bescherming tegen een botnet met duizend IP-adressen. Het
 * houdt de gewone gokker tegen en maakt het raden van één wachtwoord te traag
 * om de moeite waard te zijn. De echte verdediging is scrypt plus de tweede
 * stap.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Geeft terug of de poging mag. Zo niet, ook over hoeveel seconden het weer
 * mag — dat is eerlijker tegen de beheerder die zijn wachtwoord verkeerd
 * typte dan een dichte deur zonder uitleg.
 */
export function attemptAllowed(key: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();

  // Verlopen emmers opruimen. Bij dit volume is langslopen goedkoper dan een
  // timer die blijft draaien.
  for (const [id, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(id);
  }

  const bucket = buckets.get(key);
  if (!bucket) return { allowed: true, retryAfterSeconds: 0 };
  if (bucket.count < MAX_ATTEMPTS) return { allowed: true, retryAfterSeconds: 0 };

  return {
    allowed: false,
    retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/** Na een mislukte poging. Een geslaagde poging wist de teller. */
export function recordFailure(key: string): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.count += 1;
}

export function clearAttempts(key: string): void {
  buckets.delete(key);
}
