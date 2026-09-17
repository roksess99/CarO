"use server";

import { revalidatePath } from "next/cache";
import { disableAdmin, findAdminByEmail } from "@/lib/admin/admins";
import { logAction } from "@/lib/admin/audit";
import { inviteAdmin } from "@/lib/admin/invites";
import { requireAdmin } from "@/lib/admin/session";

/**
 * Beheerders uitnodigen en toegang intrekken.
 *
 * Elke actie roept `requireAdmin()` zelf aan. Een layout beschermt wat de
 * bezoeker ziet, maar een Server Action is een eigen ingang: die draait ook
 * als er nooit een pagina geopend is. De controle hoort dus híer.
 */

export type InviteResult =
  | { error: string }
  | { link: string; mailed: boolean }
  | undefined;

export async function sendInvite(
  _previous: InviteResult,
  formData: FormData,
): Promise<InviteResult> {
  const admin = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim();

  if (!email.includes("@") || email.length > 190) {
    return { error: "Vul een geldig mailadres in." };
  }

  if (await findAdminByEmail(email)) {
    return { error: "Dit adres is al beheerder." };
  }

  const { link, mailed } = await inviteAdmin({ email, invitedBy: admin.id });
  await logAction({
    adminId: admin.id,
    action: "beheerder.uitgenodigd",
    subject: email,
  });

  revalidatePath("/beheer/beheerders");
  return { link, mailed };
}

export type DisableResult = { error: string } | { ok: true } | undefined;

export async function revokeAdmin(
  _previous: DisableResult,
  formData: FormData,
): Promise<DisableResult> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Onbekende beheerder." };

  if (id === admin.id) {
    return { error: "Je kunt jezelf niet uitschakelen." };
  }

  const outcome = await disableAdmin(id);
  if (outcome === "laatste") {
    return { error: "Dit is de laatste beheerder; die kan er niet uit." };
  }
  if (outcome === "onbekend") {
    return { error: "Die beheerder bestaat niet, of stond al uit." };
  }

  await logAction({
    adminId: admin.id,
    action: "beheerder.uitgeschakeld",
    detail: { id },
  });

  revalidatePath("/beheer/beheerders");
  return { ok: true };
}
