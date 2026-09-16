"use server";

import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/session";
import { PRODUCT_FAMILIES } from "@/lib/catalog/families";
import {
  createRule,
  type DiscountScope,
  findRule,
  forgetDiscountCache,
  stopRule,
} from "@/lib/discounts/rules";

export type RuleResult = { error: string } | { ok: true } | undefined;

const SCOPES: DiscountScope[] = ["family", "category", "part"];

/** 00:00 van de opgegeven dag, of 23:59:59 als het een einddatum is */
function parseDay(value: string, endOfDay: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function addRule(
  _previous: RuleResult,
  formData: FormData,
): Promise<RuleResult> {
  const admin = await requireAdmin();

  const label = String(formData.get("label") ?? "").trim();
  const scope = String(formData.get("scope") ?? "") as DiscountScope;
  const target = String(formData.get("target") ?? "").trim();
  const percent = Number(formData.get("percent"));

  if (!label) return { error: "Geef de actie een naam, voor jezelf." };
  if (!SCOPES.includes(scope)) return { error: "Kies waar de korting op geldt." };
  if (!target) return { error: "Vul in waarop de korting geldt." };
  if (scope === "family" && !PRODUCT_FAMILIES.includes(target as never)) {
    return { error: "Onbekende productgroep." };
  }
  if (!Number.isInteger(percent) || percent < 1 || percent > 70) {
    return { error: "Het percentage moet tussen 1 en 70 liggen." };
  }

  const startsAt = parseDay(String(formData.get("startsAt") ?? ""), false);
  const endsAt = parseDay(String(formData.get("endsAt") ?? ""), true);
  if (!startsAt || !endsAt) return { error: "Vul een begin- en einddatum in." };
  if (endsAt <= startsAt) {
    return { error: "De einddatum moet na de begindatum liggen." };
  }

  const id = await createRule({
    label,
    scope,
    target,
    percent,
    startsAt,
    endsAt,
    createdBy: admin.id,
  });

  await logAction({
    adminId: admin.id,
    action: "korting.aangemaakt",
    subject: `${scope}:${target}`,
    detail: { id, percent, label },
  });

  // Zonder dit duurt het tot een minuut voor de winkel de actie toont, en dan
  // denkt de beheerder dat er iets stuk is.
  forgetDiscountCache();
  revalidatePath("/beheer/kortingen");
  return { ok: true };
}

export async function endRule(
  _previous: RuleResult,
  formData: FormData,
): Promise<RuleResult> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Onbekende actie." };

  const rule = await findRule(id);
  if (!rule) return { error: "Die actie bestaat niet." };
  if (!(await stopRule(id))) return { error: "Die actie liep al niet meer." };

  await logAction({
    adminId: admin.id,
    action: "korting.gestopt",
    subject: `${rule.scope}:${rule.target}`,
    detail: { id, label: rule.label },
  });

  forgetDiscountCache();
  revalidatePath("/beheer/kortingen");
  return { ok: true };
}
