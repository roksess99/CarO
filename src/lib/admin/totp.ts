import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * Tweestapsverificatie met een code uit een app (TOTP, RFC 6238).
 *
 * **Dit kost niets.** Het is een open standaard: een HMAC over de tijd, en
 * die rekensom zit in `node:crypto`. Geen dienst, geen abonnement, geen
 * account bij een derde. Google Authenticator, 1Password, Authy en Bitwarden
 * spreken allemaal dezelfde taal (docs/DECISIONS.md #12).
 *
 * **Het geheim gaat versleuteld de database in.** Anders staat het gewoon
 * tussen de rest en kan iedereen met leestoegang zelf codes maken — dan is de
 * tweede stap geen tweede stap meer. De sleutel daarvoor is `ADMIN_TOTP_KEY`
 * in .env; die hoort dus níet in dezelfde back-up als de database.
 *
 * **SHA-1 is hier geen fout.** RFC 6238 schrijft het voor en elke
 * authenticator-app gaat ervan uit. De aanval op SHA-1 gaat over botsingen bij
 * handtekeningen, niet over HMAC met een geheime sleutel van 160 bits.
 */

/** Seconden per code. Dertig is wat elke app verwacht. */
const STEP_SECONDS = 30;
const DIGITS = 6;

/**
 * Hoeveel stappen terug en vooruit een code nog geldig is. Eén stap betekent
 * dat een klok die een halve minuut voorloopt nog werkt — dat gebeurt, en een
 * beheerder die niet meer binnenkomt is erger dan dertig seconden extra.
 */
const WINDOW = 1;

// ---------------------------------------------------------------------------
// Base32, want dat is wat authenticator-apps lezen (RFC 4648, zonder opvulling)
// ---------------------------------------------------------------------------

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function toBase32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function fromBase32(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// ---------------------------------------------------------------------------
// De code zelf
// ---------------------------------------------------------------------------

/** Twintig bytes: de lengte die RFC 4226 aanraadt voor HMAC-SHA1 */
export function newTotpSecret(): Buffer {
  return randomBytes(20);
}

function codeForCounter(secret: Buffer, counter: number): string {
  const message = Buffer.alloc(8);
  // Tellers passen ruim binnen 32 bits tot ergens in het jaar 6000; de bovenste
  // vier bytes blijven nul.
  message.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  message.writeUInt32BE(counter >>> 0, 4);

  const digest = createHmac("sha1", secret).update(message).digest();
  // Dynamic truncation uit RFC 4226: de laatste vier bits wijzen aan wáár in
  // de digest de vier bytes staan die de code worden.
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];

  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

/** De code die de app nu toont. Alleen nodig om onszelf te controleren. */
export function currentCode(secret: Buffer, now: Date = new Date()): string {
  return codeForCounter(secret, Math.floor(now.getTime() / 1000 / STEP_SECONDS));
}

export function verifyCode(
  secret: Buffer,
  input: string,
  now: Date = new Date(),
): boolean {
  const cleaned = input.replace(/\D/g, "");
  if (cleaned.length !== DIGITS) return false;

  const counter = Math.floor(now.getTime() / 1000 / STEP_SECONDS);
  const given = Buffer.from(cleaned);

  let match = false;
  for (let step = -WINDOW; step <= WINDOW; step += 1) {
    const candidate = Buffer.from(codeForCounter(secret, counter + step));
    // Niet vroegtijdig stoppen: doorlopen houdt de looptijd gelijk, ongeacht
    // wélke stap klopte.
    if (timingSafeEqual(candidate, given)) match = true;
  }
  return match;
}

/**
 * De tekst die in een authenticator-app gaat. Apps lezen hem uit een QR-code,
 * maar handmatig invoeren kan ook — daarvoor is `toBase32(secret)` genoeg.
 */
export function otpauthUri(secret: Buffer, email: string): string {
  const label = encodeURIComponent(`CarO:${email}`);
  const params = new URLSearchParams({
    secret: toBase32(secret),
    issuer: "CarO",
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Het geheim veilig opbergen
// ---------------------------------------------------------------------------

function encryptionKey(): Buffer {
  const raw = process.env.ADMIN_TOTP_KEY;
  if (!raw) {
    throw new Error(
      "ADMIN_TOTP_KEY ontbreekt — zonder die sleutel kunnen 2FA-geheimen niet veilig bewaard worden",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ADMIN_TOTP_KEY moet 32 bytes zijn (base64 van randomBytes(32))");
  }
  return key;
}

/** AES-256-GCM. Opslagvorm: iv (12) + authenticatietag (16) + versleutelde tekst. */
export function sealSecret(secret: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(secret), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}

export function openSecret(sealed: Buffer): Buffer {
  const iv = sealed.subarray(0, 12);
  const tag = sealed.subarray(12, 28);
  const body = sealed.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  // Is er aan de gegevens geknoeid, dan gooit `final()` — en dat is precies
  // wat je wilt: liever een fout dan een geheim waar iemand mee gerommeld heeft.
  return Buffer.concat([decipher.update(body), decipher.final()]);
}
