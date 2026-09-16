import { createHash, randomBytes } from "node:crypto";
import { execute, query, queryOne, transaction } from "@/lib/db/client";
import { hashPassword } from "./password";
import { sealSecret } from "./totp";

/**
 * Beheerders lezen en aanmaken.
 *
 * Alles wat een sleutel is — een sessieteken, een uitnodigingslink, een
 * herstelcode — gaat als SHA-256-afdruk de database in en nooit als de waarde
 * zelf. Lekt de database, dan kan niemand met de inhoud alsnog inloggen. Dat
 * mag met SHA-256 zonder rekenwerk eromheen, ánders dan bij een wachtwoord:
 * deze waarden zijn 32 willekeurige bytes en niet te raden, dus er valt niets
 * te brute-forcen.
 */

export interface Admin {
  id: number;
  email: string;
  passwordHash: string;
  totpSecret: Buffer | null;
  totpConfirmedAt: Date | null;
  disabledAt: Date | null;
}

interface AdminRow {
  id: number;
  email: string;
  password_hash: string;
  totp_secret: Buffer | null;
  totp_confirmed_at: Date | null;
  disabled_at: Date | null;
}

function toAdmin(row: AdminRow): Admin {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    totpSecret: row.totp_secret,
    totpConfirmedAt: row.totp_confirmed_at,
    disabledAt: row.disabled_at,
  };
}

/** Mailadressen vergelijken we in kleine letters, zonder spaties eromheen */
export function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function findAdminByEmail(email: string): Promise<Admin | null> {
  const row = await queryOne<AdminRow>(
    `SELECT id, email, password_hash, totp_secret, totp_confirmed_at, disabled_at
       FROM admins WHERE email = ?`,
    [emailKey(email)],
  );
  return row ? toAdmin(row) : null;
}

export async function findAdminById(id: number): Promise<Admin | null> {
  const row = await queryOne<AdminRow>(
    `SELECT id, email, password_hash, totp_secret, totp_confirmed_at, disabled_at
       FROM admins WHERE id = ?`,
    [id],
  );
  return row ? toAdmin(row) : null;
}

export async function countAdmins(): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM admins WHERE disabled_at IS NULL`,
  );
  return Number(row?.n ?? 0);
}

export async function markLogin(adminId: number): Promise<void> {
  await execute(`UPDATE admins SET last_login_at = ? WHERE id = ?`, [
    new Date(),
    adminId,
  ]);
}

/**
 * Een beheerder aanmaken, mét zijn herstelcodes, in één transactie.
 *
 * De herstelcodes komen als leesbare tekst terug — dat is het enige moment
 * waarop ze te zien zijn. In de database staat alleen de afdruk, dus ze zijn
 * daarna niet meer op te vragen: kwijt is kwijt, en dan moeten er nieuwe
 * gemaakt worden.
 */
export async function createAdmin(options: {
  email: string;
  password: string;
  totpSecret: Buffer;
  totpConfirmed: boolean;
}): Promise<{ id: number; recoveryCodes: string[] }> {
  const passwordHash = await hashPassword(options.password);
  const sealed = sealSecret(options.totpSecret);
  const codes = Array.from({ length: 8 }, () => newRecoveryCode());
  const now = new Date();

  const id = await transaction(async (tx) => {
    const [result] = await tx.execute(
      `INSERT INTO admins (email, password_hash, totp_secret, totp_confirmed_at, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        emailKey(options.email),
        passwordHash,
        sealed,
        options.totpConfirmed ? now : null,
        now,
      ],
    );
    const adminId = (result as { insertId: number }).insertId;

    for (const code of codes) {
      await tx.execute(
        `INSERT INTO admin_recovery_codes (admin_id, code_hash) VALUES (?, ?)`,
        [adminId, sha256(code)],
      );
    }
    return adminId;
  });

  return { id, recoveryCodes: codes };
}

/**
 * Leesbaar genoeg om over te tikken van papier, en met 40 bits nog ruim
 * ongokbaar. Geen 0/O of 1/I, want die worden verkeerd overgeschreven.
 */
function newRecoveryCode(): string {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = randomBytes(10);
  const text = [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
  return `${text.slice(0, 5)}-${text.slice(5, 10)}`;
}

/**
 * Een herstelcode gebruiken. Geeft `true` als hij klopte én nog niet gebruikt
 * was; in dat geval is hij daarna op.
 */
export async function useRecoveryCode(
  adminId: number,
  code: string,
): Promise<boolean> {
  const hash = sha256(code.trim().toUpperCase());
  // De UPDATE zelf is de controle: alleen een rij die nog niet gebruikt is
  // wordt geraakt. Twee pogingen tegelijk kunnen zo niet allebei slagen.
  const result = await execute(
    `UPDATE admin_recovery_codes SET used_at = ?
      WHERE admin_id = ? AND code_hash = ? AND used_at IS NULL`,
    [new Date(), adminId, hash],
  );
  return result.affectedRows === 1;
}

export async function unusedRecoveryCodeCount(adminId: number): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM admin_recovery_codes
      WHERE admin_id = ? AND used_at IS NULL`,
    [adminId],
  );
  return Number(row?.n ?? 0);
}

export interface AdminListItem {
  id: number;
  email: string;
  lastLoginAt: Date | null;
  disabledAt: Date | null;
}

export async function listAdmins(): Promise<AdminListItem[]> {
  const rows = await query<{
    id: number;
    email: string;
    last_login_at: Date | null;
    disabled_at: Date | null;
  }>(`SELECT id, email, last_login_at, disabled_at FROM admins ORDER BY email`);

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    lastLoginAt: row.last_login_at,
    disabledAt: row.disabled_at,
  }));
}

/**
 * Toegang intrekken. De rij blijft staan, want het logboek verwijst ernaar.
 *
 * Weigert de laatste actieve beheerder: een paneel zonder beheerder is alleen
 * nog met serveratoegang te openen, en dat is geen knop die je per ongeluk
 * moet kunnen indrukken.
 */
export async function disableAdmin(
  adminId: number,
): Promise<"ok" | "laatste" | "onbekend"> {
  if ((await countAdmins()) <= 1) return "laatste";
  const result = await execute(
    `UPDATE admins SET disabled_at = ? WHERE id = ? AND disabled_at IS NULL`,
    [new Date(), adminId],
  );
  if (result.affectedRows !== 1) return "onbekend";

  // Lopende sessies van deze beheerder meteen ongeldig maken. `currentAdmin()`
  // kijkt ook naar disabled_at, maar een rij laten staan die nergens meer voor
  // dient is slordig.
  await execute(`DELETE FROM admin_sessions WHERE admin_id = ?`, [adminId]);
  return "ok";
}
