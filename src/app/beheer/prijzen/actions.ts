"use server";

import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/admin/audit";
import { categoryOptions, isKnownCategory } from "@/lib/admin/catalog-options";
import { isKnownPartKind, partKindName } from "@/lib/admin/part-kinds";
import { requirePermission } from "@/lib/admin/session";
import { PRODUCT_FAMILIES, type ProductFamily } from "@/lib/catalog/families";
import { loadPartById, loadPartBySlug } from "@/lib/catalog/lookup";
import { forgetOffers } from "@/lib/discounts/offers";
import {
  createPriceRule,
  findPriceRule,
  forgetMarkupCache,
  type PriceScope,
  stopPriceRule,
} from "@/lib/prices/markup";

export type PriceRuleResult = { error: string } | { ok: string } | undefined;

const SCOPES: PriceScope[] = ["shop", "family", "category", "kind", "part"];

/**
 * Bovengrens op de opslag. Niet omdat 500% niet zou kunnen rekenen, maar
 * omdat een typefout (1000 in plaats van 100) anders stilletjes de hele
 * winkel onverkoopbaar maakt. Ter ijking: de adviesprijs van de leverancier
 * ligt gemeten 66–85% boven de inkoop.
 */
const MAX_MARKUP = 300;

/** Zelfde hulp als bij de kortingen: een nummer óf een geplakte productlink */
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

export async function addPriceRule(
  _previous: PriceRuleResult,
  formData: FormData,
): Promise<PriceRuleResult> {
  const admin = await requirePermission("prijzen");

  const scope = String(formData.get("scope") ?? "") as PriceScope;
  if (!SCOPES.includes(scope)) return { error: "Kies waar de prijs op geldt." };

  const markupPercent = Number(
    String(formData.get("markup") ?? "").replace(",", "."),
  );
  if (
    !Number.isFinite(markupPercent) ||
    markupPercent < 0 ||
    markupPercent > MAX_MARKUP
  ) {
    return {
      error: `De opslag moet tussen 0 en ${MAX_MARKUP} procent liggen.`,
    };
  }

  const family = String(formData.get("family") ?? "") as ProductFamily;
  if (scope !== "shop" && !PRODUCT_FAMILIES.includes(family)) {
    return { error: "Kies een productgroep." };
  }

  const chosen = String(formData.get("target") ?? "").trim();
  let target = "";
  let what = "de hele winkel";

  if (scope === "family") {
    what = family;
  }

  if (scope === "category") {
    if (family === "onderdelen") {
      // Zie lib/prices/markup.ts: de categorie van een onderdeel komt uit de
      // URL en ontbreekt bij een zoekresultaat. Bij een prijs is dat erger dan
      // bij een korting — het afrekenen zou een ander bedrag uitrekenen.
      return {
        error:
          "Bij onderdelen kan een prijs niet op een categorie. Kies “Soort onderdeel”.",
      };
    }
    const options = await categoryOptions();
    if (!isKnownCategory(options, family, chosen)) {
      return { error: "Die categorie bestaat niet in deze productgroep." };
    }
    target = chosen;
    what = chosen;
  }

  if (scope === "kind") {
    if (family !== "onderdelen") {
      return { error: "Een soort onderdeel bestaat alleen bij Onderdelen." };
    }
    if (!isKnownPartKind(chosen)) return { error: "Kies een soort onderdeel." };
    target = chosen;
    what = partKindName(chosen) ?? chosen;
  }

  if (scope === "part") {
    if (!chosen) return { error: "Vul het artikelnummer in." };
    // Het artikel wordt echt opgezocht. Een tikfout levert dan een melding op
    // in plaats van een regel die stil niets doet.
    const part = await findPart(family, chosen);
    if (!part) {
      return {
        error: "Geen artikel met dat nummer gevonden in deze productgroep.",
      };
    }
    target = part.id;
    what = part.name;
  }

  const label =
    String(formData.get("label") ?? "").trim() ||
    `${markupPercent}% op ${what}`;

  const id = await createPriceRule({
    label,
    scope,
    family: scope === "shop" ? "" : family,
    target,
    markupPercent,
    createdBy: admin.id,
  });

  forgetMarkupCache();
  // De aanbiedingenlijst draagt prijzen in zich; die is nu achterhaald.
  forgetOffers();
  await logAction({
    adminId: admin.id,
    action: "prijsregel.toegevoegd",
    detail: { id, scope, family, target, markupPercent },
  });

  revalidatePath("/beheer/prijzen");
  return { ok: `Opgeslagen: ${markupPercent}% opslag op ${what}.` };
}

export async function endPriceRule(
  _previous: PriceRuleResult,
  formData: FormData,
): Promise<PriceRuleResult> {
  const admin = await requirePermission("prijzen");
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Onbekende regel." };

  const rule = await findPriceRule(id);
  if (!rule) return { error: "Die regel bestaat niet meer." };
  if (!(await stopPriceRule(id))) return { error: "Die regel liep al niet meer." };

  forgetMarkupCache();
  forgetOffers();
  await logAction({
    adminId: admin.id,
    action: "prijsregel.gestopt",
    detail: { id, label: rule.label },
  });

  revalidatePath("/beheer/prijzen");
  return { ok: `"${rule.label}" is gestopt.` };
}
