import { randomBytes } from "node:crypto";
import { execute, queryOne } from "@/lib/db/client";
import { sendMail } from "@/lib/mail";
import { SITE_URL } from "@/lib/site";
import { emailKey, sha256 } from "./admins";

/**
 * Een tweede beheerder uitnodigen.
 *
 * De uitnodiging is een link met een willekeurig teken erin; in de database
 * staat alleen de afdruk. Wie de database leest kan er dus geen account mee
 * aanmaken — dezelfde regel als bij sessies.
 *
 * **Achtenveertig uur geldig.** Lang genoeg om een mail te missen en er de
 * volgende dag op te klikken, kort genoeg dat een vergeten uitnodiging in een
 * oude mailbox geen open deur wordt.
 *
 * De uitgenodigde kiest zijn eigen wachtwoord en zet zijn eigen
 * authenticator-app klaar. De uitnodiger ziet dat wachtwoord nooit, en hoeft
 * dus ook nooit een wachtwoord door te bellen.
 */

const LIFETIME_MS = 48 * 60 * 60 * 1000;

export interface PendingInvite {
  id: number;
  email: string;
}

/**
 * Maakt de uitnodiging aan en mailt hem. Geeft de link terug, zodat het paneel
 * hem ook kan tonen — als de mail niet aankomt, is doorbellen dan nog mogelijk.
 */
export async function inviteAdmin(options: {
  email: string;
  invitedBy: number;
}): Promise<{ link: string; mailed: boolean }> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();

  await execute(
    `INSERT INTO admin_invites (email, token_hash, invited_by, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      emailKey(options.email),
      sha256(token),
      options.invitedBy,
      now,
      new Date(now.getTime() + LIFETIME_MS),
    ],
  );

  const link = `${SITE_URL}/beheer/uitnodiging/${token}`;

  let mailed = false;
  try {
    await sendMail({
      to: emailKey(options.email),
      subject: "Je bent uitgenodigd voor het beheer van caroparts.nl",
      text: [
        "Je kunt een beheerdersaccount aanmaken voor de webshop van CarO.",
        "",
        "Open deze link en kies een wachtwoord:",
        link,
        "",
        "De link werkt 48 uur en daarna niet meer.",
        "Je hebt ook een authenticator-app nodig (Google Authenticator,",
        "1Password, Bitwarden); die stel je tijdens het aanmaken in.",
        "",
        "Verwachtte je dit niet? Dan kun je deze mail negeren — zonder de link",
        "gebeurt er niets.",
      ].join("\n"),
    });
    mailed = true;
  } catch {
    // Geen mail is geen reden om de uitnodiging weg te gooien: de link werkt
    // en kan met de hand doorgegeven worden. Het adres komt bewust niet in de
    // logregel — dat is een persoonsgegeven.
    console.error("Uitnodigingsmail kon niet verstuurd worden");
  }

  return { link, mailed };
}

/** De uitnodiging bij een teken uit de URL, mits nog geldig en ongebruikt */
export async function findPendingInvite(
  token: string,
): Promise<PendingInvite | null> {
  const row = await queryOne<{ id: number; email: string }>(
    `SELECT id, email FROM admin_invites
      WHERE token_hash = ? AND accepted_at IS NULL AND expires_at > ?`,
    [sha256(token), new Date()],
  );
  return row ? { id: row.id, email: row.email } : null;
}

/**
 * De uitnodiging afstrepen. Geeft `false` als iemand anders er net mee bezig
 * was — de voorwaarde in de UPDATE is wat een tweede keer gebruiken tegenhoudt.
 */
export async function markInviteAccepted(inviteId: number): Promise<boolean> {
  const result = await execute(
    `UPDATE admin_invites SET accepted_at = ?
      WHERE id = ? AND accepted_at IS NULL`,
    [new Date(), inviteId],
  );
  return result.affectedRows === 1;
}
