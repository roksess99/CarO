"use server";

import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/admin/audit";
import { requirePermission } from "@/lib/admin/session";
import {
  categoryOptions,
  isKnownCategory,
} from "@/lib/admin/catalog-options";
import {
  PRODUCT_FAMILIES,
  type ProductFamily,
} from "@/lib/catalog/families";
import { loadPartById, loadPartBySlug } from "@/lib/catalog/lookup";
import { forgetOffers } from "@/lib/discounts/offers";
import { runPriceSnapshot } from "@/lib/prices/snapshot";
import {
  createRule,
  type DiscountScope,
  findRule,
  forgetDiscountCache,
  stopRule,
} from "@/lib/discounts/rules";

export type RuleResult = { error: string } | { ok: string } | undefined;

const SCOPES: DiscountScope[] = ["family", "category", "part"];

/** 00:00 van de opgegeven dag, of 23:59:59 als het een einddatum is */
function parseDay(value: string, endOfDay: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59" : "00:00:00"}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Artikel opzoeken uit wat de beheerder invulde: een artikelnummer, of de
 * link van de productpagina. Dat laatste is wat iemand doet die het artikel
 * net in de winkel bekeek, en het scheelt overtypen.
 */
async function findPart(family: ProductFamily, input: string) {
  const segment = input.includes("/")
    ? (input.split(/[?#]/)[0].split("/").filter(Boolean).pop() ?? "")
    : input;
  if (!segment) return null;
  return (
    (await loadPartById(family, segment)) ??
    (await loadPartBySlug(family, segment))
  );
}

export async function addRule(
  _previous: RuleResult,
  formData: FormData,
): Promise<RuleResult> {
  const admin = await requirePermission("kortingen");

  const label = String(formData.get("label") ?? "").trim();
  const family = String(formData.get("family") ?? "") as ProductFamily;
  const scope = String(formData.get("scope") ?? "") as DiscountScope;
  const percent = Number(formData.get("percent"));

  if (!label) return { error: "Geef de actie een naam, voor jezelf." };
  if (!PRODUCT_FAMILIES.includes(family)) {
    return { error: "Kies een productgroep." };
  }
  if (!SCOPES.includes(scope)) return { error: "Kies waar de korting op geldt." };
  if (!Number.isInteger(percent) || percent < 1 || percent > 70) {
    return { error: "Het percentage moet tussen 1 en 70 liggen." };
  }

  const chosen = String(formData.get("target") ?? "").trim();
  let target = family as string;
  let found = "";

  if (scope === "category") {
    const options = await categoryOptions();
    if (!isKnownCategory(options, family, chosen)) {
      return { error: "Die categorie bestaat niet in deze productgroep." };
    }
    target = chosen;
  }

  if (scope === "part") {
    if (!chosen) return { error: "Vul het artikelnummer in." };
    // Het artikel wordt echt opgezocht. Een tikfout levert dan een melding op
    // in plaats van een actie die het stil niet doet — dat laatste is niet van
    // een geldige regel te onderscheiden zodra hij eenmaal in de lijst staat.
    const part = await findPart(family, chosen);
    if (!part) {
      return {
        error: "Dat artikel vind ik niet in deze productgroep. Klopt het nummer?",
      };
    }
    target = part.id;
    found = part.name;
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
    family,
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
  forgetOffers();
  revalidatePath("/beheer/kortingen");
  return {
    ok: found ? `De actie staat aan op: ${found}` : "De actie staat aan.",
  };
}

export async function endRule(
  _previous: RuleResult,
  formData: FormData,
): Promise<RuleResult> {
  const admin = await requirePermission("kortingen");
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
  forgetOffers();
  revalidatePath("/beheer/kortingen");
  return { ok: "De actie is gestopt." };
}

export type MeasureResult = { error: string } | { ok: string } | undefined;

/**
 * De prijsmeting nu draaien, vanuit het paneel.
 *
 * Met `force`, dus ook als hij vandaag al gedraaid heeft: dit is de knop van
 * "ik wil zien dát het werkt". De uitkomst zegt hoeveel artikelen en hoeveel
 * verzoeken het kostte, want dat is precies waar de twijfel over ging.
 */
export async function measureNow(): Promise<MeasureResult> {
  const admin = await requirePermission("kortingen");

  try {
    const result = await runPriceSnapshot({ force: true });
    await logAction({
      adminId: admin.id,
      action: "prijsmeting.handmatig",
      detail: { ...result },
    });
    revalidatePath("/beheer/kortingen");

    if (result.parts === 0) {
      return {
        ok: "Niets te meten: er loopt geen actie en er staat er geen gepland.",
      };
    }
    return {
      ok: `${result.parts} artikelen gemeten in ${result.requests} verzoeken, ${Math.round(result.ms / 1000)} seconden.`,
    };
  } catch (error) {
    console.error("Handmatige prijsmeting mislukt:", error);
    return { error: "De meting is niet gelukt. Kijk in de serverlog." };
  }
}
