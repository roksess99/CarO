"use server";

import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/session";
import {
  createCode,
  findCode,
  findCodeById,
  normalizeCode,
  stopCode,
} from "@/lib/discounts/codes";

export type CodeResult = { error: string } | { ok: string } | undefined;

/** 00:00 van de opgegeven dag, of 23:59:59 als het een einddatum is */
function parseDay(value: string, endOfDay: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "12,50" en "12.50" en "1250" — de beheerder typt het bedrag in euro's */
function euroToCents(value: string): number | null {
  const cleaned = value.trim().replace(",", ".");
  if (cleaned === "") return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export async function addCode(
  _previous: CodeResult,
  formData: FormData,
): Promise<CodeResult> {
  const admin = await requireAdmin();

  const code = normalizeCode(String(formData.get("code") ?? ""));
  const percent = Number(formData.get("percent"));
  const minSpendCents = euroToCents(String(formData.get("minSpend") ?? ""));
  const maxUsesRaw = String(formData.get("maxUses") ?? "").trim();
  const oncePerCustomer = formData.get("oncePerCustomer") === "on";

  // Alleen letters en cijfers: een code met een spatie of een streepje wordt
  // door de klant anders overgetypt dan hij bedoeld was.
  if (!/^[A-Z0-9]{3,32}$/.test(code)) {
    return { error: "Een code bestaat uit 3 tot 32 letters en cijfers." };
  }
  if (!Number.isInteger(percent) || percent < 1 || percent > 70) {
    return { error: "Het percentage moet tussen 1 en 70 liggen." };
  }
  if (minSpendCents === null) {
    return { error: "Vul het minimumbedrag in als bijvoorbeeld 50 of 49,95." };
  }

  let maxUses: number | null = null;
  if (maxUsesRaw !== "") {
    const parsed = Number(maxUsesRaw);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return { error: "Laat het maximum leeg, of vul een aantal vanaf 1 in." };
    }
    maxUses = parsed;
  }

  const startsAt = parseDay(String(formData.get("startsAt") ?? ""), false);
  const endsAt = parseDay(String(formData.get("endsAt") ?? ""), true);
  if (!startsAt || !endsAt) return { error: "Vul een begin- en einddatum in." };
  if (endsAt <= startsAt) {
    return { error: "De einddatum moet na de begindatum liggen." };
  }

  // De code is uniek in de database; dat nu melden leest beter dan een
  // foutmelding uit MySQL.
  if (await findCode(code)) {
    return { error: `De code ${code} bestaat al.` };
  }

  const id = await createCode({
    code,
    percent,
    minSpendCents,
    startsAt,
    endsAt,
    maxUses,
    oncePerCustomer,
    createdBy: admin.id,
  });

  await logAction({
    adminId: admin.id,
    action: "kortingscode.aangemaakt",
    subject: code,
    detail: { id, percent, minSpendCents, maxUses, oncePerCustomer },
  });

  revalidatePath("/beheer/kortingscodes");
  return { ok: `De code ${code} staat klaar.` };
}

export async function endCode(
  _previous: CodeResult,
  formData: FormData,
): Promise<CodeResult> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Onbekende code." };

  const code = await findCodeById(id);
  if (!code) return { error: "Die code bestaat niet." };
  if (!(await stopCode(id))) return { error: "Die code lag al stil." };

  await logAction({
    adminId: admin.id,
    action: "kortingscode.gestopt",
    subject: code.code,
    detail: { id, usedCount: code.usedCount },
  });

  revalidatePath("/beheer/kortingscodes");
  return { ok: "De code is gestopt." };
}
