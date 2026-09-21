import { createHash, randomBytes } from "node:crypto";
import { execute, query, queryOne, transaction } from "@/lib/db/client";
import { hashPassword } from "./password";
import { isRole, type Role } from "./roles";
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
  role: Role;
  passwordHash: string;
  totpSecret: Buffer | null;
  totpConfirmedAt: Date | null;
  disabledAt: Date | null;
}

interface AdminRow {
  id: number;
  email: string;
  role: string;
  password_hash: string;
  totp_secret: Buffer | null;
  totp_confirmed_at: Date | null;
  disabled_at: Date | null;
}

function readRole(value: unknown): Role {
  if (isRole(value)) return value;
  console.error(
    `Beheerder zonder leesbare rol (${String(value)}) — teruggevallen op marketing`,
  );
  return "marketing";
}

function toAdmin(row: AdminRow): Admin {
  return {
    id: row.id,
    email: row.email,
    // Onbekende waarde uit de database? Dan de minste rechten, niet de meeste.
    // Een kapotte rij hoort niemand tot eigenaar te maken.
    //
    // Maar wél luid. GEVONDEN 2026-09-21: `findAdminById` haalde `role`
    // helemaal niet op (de kolommen staan met de hand in de SELECT), en omdat
    // `queryOne<AdminRow>` een cast is en geen controle, zag TypeScript dat
    // niet. Iedereen werd stilletjes marketing — inclusief de eigenaar. Een
    // stille terugval verbergt precies de fout die hij hoort af te vangen.
    role: readRole(row.role),
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
    `SELECT id, email, role, password_hash, totp_secret, totp_confirmed_at, disabled_at
       FROM admins WHERE email = ?`,
    [emailKey(email)],
  );
  return row ? toAdmin(row) : null;
}

export async function findAdminById(id: number): Promise<Admin | null> {
  const row = await queryOne<AdminRow>(
    `SELECT id, email, role, password_hash, totp_secret, totp_confirmed_at, disabled_at
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
  /** Verplicht: de kolom heeft geen standaardwaarde, zie migratie 0007 */
  role: Role;
  totpSecret: Buffer;
  totpConfirmed: boolean;
}): Promise<{ id: number; recoveryCodes: string[] }> {
  const passwordHash = await hashPassword(options.password);
  const sealed = sealSecret(options.totpSecret);
  const codes = Array.from({ length: 8 }, () => newRecoveryCode());
  const now = new Date();

  const id = await transaction(async (tx) => {
    const [result] = await tx.execute(
      `INSERT INTO admins (email, role, password_hash, totp_secret, totp_confirmed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        emailKey(options.email),
        options.role,
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
  role: Role;
  lastLoginAt: Date | null;
  disabledAt: Date | null;
}

export async function listAdmins(): Promise<AdminListItem[]> {
  const rows = await query<{
    id: number;
    email: string;
    role: string;
    last_login_at: Date | null;
    disabled_at: Date | null;
  }>(
    `SELECT id, email, role, last_login_at, disabled_at FROM admins ORDER BY email`,
  );

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: readRole(row.role),
    lastLoginAt: row.last_login_at,
    disabledAt: row.disabled_at,
  }));
}

/** Hoeveel actieve eigenaren er zijn. Onder de één mag het paneel nooit komen. */
export async function countActiveOwners(): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM admins
      WHERE role = 'eigenaar' AND disabled_at IS NULL`,
  );
  return Number(row?.n ?? 0);
}

/**
 * De rol van iemand anders wijzigen.
 *
 * **Weigert het wegnemen van de laatste eigenaar.** Zonder die controle kan de
 * eigenaar zichzelf per ongeluk tot boekhouder maken, en dan is er niemand
 * meer die rollen kan uitdelen — het paneel is dan alleen nog met toegang tot
 * de database te repareren. Zelfde gedachte als bij `disableAdmin()`.
 */
export async function setAdminRole(
  adminId: number,
  role: Role,
): Promise<"ok" | "laatste-eigenaar" | "onbekend"> {
  const huidig = await findAdminById(adminId);
  if (!huidig) return "onbekend";
  if (huidig.role === role) return "ok";

  if (huidig.role === "eigenaar" && (await countActiveOwners()) <= 1) {
    return "laatste-eigenaar";
  }

  const result = await execute(`UPDATE admins SET role = ? WHERE id = ?`, [
    role,
    adminId,
  ]);
  if (result.affectedRows !== 1) return "onbekend";

  // Lopende sessies houden geen rol vast — `currentAdmin()` leest de rij elke
  // keer opnieuw — dus een wijziging geldt meteen, ook in een open tabblad.
  return "ok";
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
): Promise<"ok" | "laatste" | "laatste-eigenaar" | "onbekend"> {
  if ((await countAdmins()) <= 1) return "laatste";

  // Ook met drie beheerders erbij: zonder eigenaar kan niemand nog rollen
  // uitdelen of prijzen wijzigen. Een marketingmedewerker en een boekhouder
  // samen krijgen het paneel niet meer open voor de rest.
  const doelwit = await findAdminById(adminId);
  if (doelwit?.role === "eigenaar" && (await countActiveOwners()) <= 1) {
    return "laatste-eigenaar";
  }
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
