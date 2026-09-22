import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { execute, queryOne } from "@/lib/db/client";
import { type Admin, findAdminById, sha256 } from "./admins";
import { can, type Permission } from "./roles";

/**
 * Sessies van het beheerpaneel.
 *
 * De cookie draagt een willekeurig teken van 32 bytes; in de database staat
 * alleen de afdruk ervan. Wie de database leest kan er dus niet mee inloggen.
 *
 * **Uitloggen is een rij verwijderen.** Dat is het verschil met een
 * ondertekend teken dat zichzelf bewijst: een gestolen cookie blijft daarbij
 * geldig tot hij verloopt, en daar kun je niets tegen doen. Nu wel — ook op
 * afstand, vanaf een ander apparaat.
 */

const COOKIE = "caro_admin";

/**
 * Twaalf uur, en hij schuift mee zolang je bezig bent. Elke paginaweergave de
 * database laten schrijven is zonde, dus dat gebeurt pas als de sessie een uur
 * oud is.
 */
const LIFETIME_MS = 12 * 60 * 60 * 1000;
const REFRESH_AFTER_MS = 60 * 60 * 1000;

interface SessionRow {
  admin_id: number;
  expires_at: Date;
  last_seen_at: Date;
}

export async function createSession(adminId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + LIFETIME_MS);

  await execute(
    `INSERT INTO admin_sessions (token_hash, admin_id, created_at, last_seen_at, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [sha256(token), adminId, now, now, expires],
  );

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    // Lokaal draait de winkel op http; daar zou `secure` de cookie weggooien.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // Alleen meesturen naar het paneel zelf, niet naar de hele winkel.
    path: "/beheer",
    expires,
  });
}

/**
 * De ingelogde beheerder, of `null`.
 *
 * Roep dit aan in élke actie die iets doet, niet alleen in de layout. Een
 * layout beschermt wat de bezoeker ziet, maar een Server Action is een eigen
 * ingang: die draait ook als er nooit een pagina geopend is.
 */
export async function currentAdmin(): Promise<Admin | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const row = await queryOne<SessionRow>(
    `SELECT admin_id, expires_at, last_seen_at FROM admin_sessions WHERE token_hash = ?`,
    [sha256(token)],
  );
  if (!row) return null;

  const now = new Date();
  if (row.expires_at.getTime() <= now.getTime()) {
    await execute(`DELETE FROM admin_sessions WHERE token_hash = ?`, [
      sha256(token),
    ]);
    return null;
  }

  const admin = await findAdminById(row.admin_id);
  // Toegang ingetrokken terwijl er nog een sessie liep: meteen ongeldig.
  if (!admin || admin.disabledAt) return null;

  if (now.getTime() - row.last_seen_at.getTime() > REFRESH_AFTER_MS) {
    await execute(
      `UPDATE admin_sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?`,
      [now, new Date(now.getTime() + LIFETIME_MS), sha256(token)],
    );
  }

  return admin;
}

/**
 * Zoals `currentAdmin()`, maar stuurt naar de inlogpagina in plaats van
 * `null` terug te geven. Voor pagina's die zonder beheerder nergens over gaan.
 */
export async function requireAdmin(): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect("/beheer/login");
  return admin;
}

/**
 * Zoals `requireAdmin()`, maar eist ook een recht.
 *
 * **Roep dit aan in de pagina én in elke Server Action van dat scherm.** Een
 * pagina afschermen is niet genoeg: een actie is een eigen ingang die ook
 * draait als de pagina nooit geopend is, en een `<form>` is met de hand na te
 * bouwen. Dat gold al voor `requireAdmin()` en geldt hier net zo hard — het
 * verschil is dat een rechtencontrole die je vergeet er van buitenaf
 * hetzelfde uitziet als eentje die werkt.
 *
 * Wie het recht mist gaat naar het dashboard met een uitleg, niet naar de
 * inlogpagina: hij ís ingelogd, hij hoort hier alleen niet. Doorsturen naar
 * inloggen zou hem laten denken dat zijn sessie verlopen was.
 */
export async function requirePermission(
  permission: Permission,
): Promise<Admin> {
  const admin = await requireAdmin();
  if (!can(admin.role, permission)) {
    redirect(`/beheer?geen-toegang=${permission}`);
  }
  return admin;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await execute(`DELETE FROM admin_sessions WHERE token_hash = ?`, [
      sha256(token),
    ]);
  }
  jar.delete({ name: COOKIE, path: "/beheer" });
}

/** Verlopen sessies opruimen. Losse klus, geen werk voor een inlogpoging. */
export async function purgeExpiredSessions(): Promise<number> {
  const result = await execute(
    `DELETE FROM admin_sessions WHERE expires_at <= ?`,
    [new Date()],
  );
  return result.affectedRows;
}
