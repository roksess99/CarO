"use server";

import { revalidatePath } from "next/cache";
import {
  disableAdmin,
  findAdminByEmail,
  setAdminRole,
} from "@/lib/admin/admins";
import { logAction } from "@/lib/admin/audit";
import { inviteAdmin } from "@/lib/admin/invites";
import { isRole } from "@/lib/admin/roles";
import { requirePermission } from "@/lib/admin/session";

/**
 * Beheerders uitnodigen, hun rol wijzigen en toegang intrekken.
 *
 * Elke actie roept `requirePermission("beheerders")` zelf aan. Een layout
 * beschermt wat de bezoeker ziet, maar een Server Action is een eigen ingang:
 * die draait ook als er nooit een pagina geopend is, en een `<form>` is met de
 * hand na te bouwen. De controle hoort dus híer.
 *
 * Dit is het gevaarlijkste scherm van het paneel: wie hier mag komen kan
 * rechten uitdelen en daarmee elk ander recht. Vandaar dat `beheerders`
 * alleen bij de eigenaar hoort (`lib/admin/roles.ts`).
 */

export type InviteResult =
  | { error: string }
  | { link: string; mailed: boolean }
  | undefined;

export async function sendInvite(
  _previous: InviteResult,
  formData: FormData,
): Promise<InviteResult> {
  const admin = await requirePermission("beheerders");
  const email = String(formData.get("email") ?? "").trim();
  const role = formData.get("role");

  if (!email.includes("@") || email.length > 190) {
    return { error: "Vul een geldig mailadres in." };
  }

  // Geen terugval op een standaardrol: een onleesbare waarde is een fout in
  // het formulier, en dan is "dan maar eigenaar" het verkeerde antwoord.
  if (!isRole(role)) {
    return { error: "Kies een rol." };
  }

  if (await findAdminByEmail(email)) {
    return { error: "Dit adres is al beheerder." };
  }

  const { link, mailed } = await inviteAdmin({
    email,
    role,
    invitedBy: admin.id,
  });
  await logAction({
    adminId: admin.id,
    action: "beheerder.uitgenodigd",
    subject: email,
    detail: { role },
  });

  revalidatePath("/beheer/beheerders");
  return { link, mailed };
}

export type RoleResult = { error: string } | { ok: true } | undefined;

/**
 * De rol van iemand anders wijzigen.
 *
 * Jezelf overslaan we bewust: de eigenaar die zichzelf tot boekhouder maakt
 * sluit zichzelf uit dit scherm, en dan kan hij het niet meer terugdraaien.
 * `setAdminRole()` bewaakt daarnaast dat de láátste eigenaar blijft staan.
 */
export async function changeRole(
  _previous: RoleResult,
  formData: FormData,
): Promise<RoleResult> {
  const admin = await requirePermission("beheerders");
  const id = Number(formData.get("id"));
  const role = formData.get("role");

  if (!Number.isInteger(id)) return { error: "Onbekende beheerder." };
  if (!isRole(role)) return { error: "Onbekende rol." };
  if (id === admin.id) {
    return { error: "Je eigen rol kun je hier niet wijzigen." };
  }

  const outcome = await setAdminRole(id, role);
  if (outcome === "laatste-eigenaar") {
    return {
      error: "Dit is de laatste eigenaar; er moet er altijd één overblijven.",
    };
  }
  if (outcome === "onbekend") {
    return { error: "Die beheerder bestaat niet." };
  }

  await logAction({
    adminId: admin.id,
    action: "beheerder.rol-gewijzigd",
    detail: { id, role },
  });

  revalidatePath("/beheer/beheerders");
  return { ok: true };
}

export type DisableResult = { error: string } | { ok: true } | undefined;

export async function revokeAdmin(
  _previous: DisableResult,
  formData: FormData,
): Promise<DisableResult> {
  const admin = await requirePermission("beheerders");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Onbekende beheerder." };

  if (id === admin.id) {
    return { error: "Je kunt jezelf niet uitschakelen." };
  }

  const outcome = await disableAdmin(id);
  if (outcome === "laatste") {
    return { error: "Dit is de laatste beheerder; die kan er niet uit." };
  }
  if (outcome === "laatste-eigenaar") {
    return {
      error:
        "Dit is de laatste eigenaar. Maak eerst iemand anders eigenaar, anders kan niemand meer rollen uitdelen.",
    };
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
