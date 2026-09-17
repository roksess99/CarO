import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Wachtwoorden hashen met scrypt uit Node zelf.
 *
 * **Waarom geen bcrypt of argon2.** Allebei zijn native modules die bij het
 * installeren gecompileerd worden. Deze winkel draait op gedeelde hosting waar
 * de deploy al een keer omviel op een module die niet goed meekwam
 * (@swc/helpers, zie pnpm-workspace.yaml); een wachtwoordbibliotheek die
 * alleen op de bouwmachine werkt en niet op de server is precies het soort
 * probleem dat je pas merkt als niemand meer kan inloggen. scrypt zit in
 * `node:crypto`, is ontworpen voor wachtwoorden en heeft geen installatiestap.
 *
 * **De parameters.** N=32768, r=8, p=1 kost ongeveer 33 MB geheugen en een
 * tiende seconde per poging. Dat is de bedoeling: het maakt gokken duur.
 * Node's standaard `maxmem` is 32 MB en zou hier dus net afketsen, vandaar dat
 * hij expliciet omhoog gaat — zonder die regel werkt dit op geen enkele
 * machine.
 *
 * **Het formaat draagt zijn eigen instellingen.** Zo kan N later omhoog zonder
 * dat bestaande wachtwoorden onbruikbaar worden: de hash zegt zelf waarmee hij
 * gemaakt is.
 */

/**
 * `promisify(scrypt)` verliest de overload met instellingen, en juist die
 * hebben we nodig voor `maxmem`. Vandaar met de hand.
 */
function scryptAsync(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number; maxmem: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

const N = 32_768;
const R = 8;
const P = 1;
const KEY_LENGTH = 32;
const MAXMEM = 64 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });

  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");

  let key: Buffer;
  try {
    key = await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: MAXMEM,
    });
  } catch {
    // Onzinnige parameters in de opgeslagen hash; nooit toelaten
    return false;
  }

  // Lengtes gelijk houden: timingSafeEqual gooit een fout als ze verschillen,
  // en dat verschil zou zelf al iets verklappen.
  if (key.length !== expected.length) return false;
  return timingSafeEqual(key, expected);
}

/**
 * Minimale eisen. Bewust geen hoofdletter-cijfer-teken-regels: die leveren
 * `Wachtwoord1!` op. Lengte is wat telt.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < 12) return "Minimaal twaalf tekens.";
  if (password.length > 200) return "Maximaal tweehonderd tekens.";
  return null;
}
