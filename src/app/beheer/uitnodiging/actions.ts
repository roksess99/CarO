"use server";

import { createAdmin } from "@/lib/admin/admins";
import { logAction } from "@/lib/admin/audit";
import { findPendingInvite, markInviteAccepted } from "@/lib/admin/invites";
import { passwordProblem } from "@/lib/admin/password";
import { fromBase32, verifyCode } from "@/lib/admin/totp";

/**
 * Een uitnodiging aannemen.
 *
 * Geen `requireAdmin()` hier — dat is het hele punt: de bezoeker heeft nog
 * geen account. Het teken uit de link is wat hem toelaat, en dat wordt bij
 * elke stap opnieuw gecontroleerd.
 */

export type AcceptResult =
  | { error: string }
  | { codes: string[]; email: string }
  | undefined;

export async function acceptInvite(
  _previous: AcceptResult,
  formData: FormData,
): Promise<AcceptResult> {
  const token = String(formData.get("token") ?? "");
  const invite = await findPendingInvite(token);
  if (!invite) {
    return {
      error:
        "Deze uitnodiging is verlopen of al gebruikt. Vraag om een nieuwe.",
    };
  }

  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  const code = String(formData.get("code") ?? "");

  if (password !== repeat) return { error: "De twee wachtwoorden verschillen." };
  const problem = passwordProblem(password);
  if (problem) return { error: problem };

  const secret = fromBase32(String(formData.get("secret") ?? ""));
  if (secret.length < 16) {
    return { error: "De instelcode is zoek. Ververs de pagina." };
  }
  if (!verifyCode(secret, code)) {
    return {
      error:
        "Die code klopt niet. Staat de tijd op je telefoon goed, en heb je de nieuwste code?",
    };
  }

  // Eerst de uitnodiging afstrepen. Lukt dat niet, dan was iemand anders net
  // sneller met dezelfde link en mag er geen tweede account uitrollen.
  if (!(await markInviteAccepted(invite.id))) {
    return { error: "Deze uitnodiging is zojuist al gebruikt." };
  }

  try {
    const { id, recoveryCodes } = await createAdmin({
      email: invite.email,
      password,
      totpSecret: secret,
      totpConfirmed: true,
    });

    await logAction({
      adminId: id,
      action: "beheerder.aangemaakt",
      subject: invite.email,
    });

    return { codes: recoveryCodes, email: invite.email };
  } catch {
    // Vrijwel altijd: het mailadres is intussen al beheerder geworden. De
    // uitnodiging is nu op, maar dat geeft niet — er ís een account.
    return {
      error:
        "Er bestaat al een beheerder met dit mailadres. Probeer in te loggen.",
    };
  }
}
