"use server";

import { lookupCartParts } from "@/components/cart/actions";
import { isValidCartItem } from "@/lib/cart/cart";
import type { CartItem } from "@/lib/cart/types";
import {
  checkCode,
  codeBaseCents,
  type CodeRejection,
  normalizeCode,
} from "@/lib/discounts/codes";

/**
 * De kortingscode keuren terwijl de klant nog aan het invullen is.
 *
 * Dit is een vooruitblik, geen toezegging: bij `startPayment` wordt hij opnieuw
 * gekeurd met de wagen zoals hij dán is. Zo kan de klant hier niet iets
 * afdwingen door de wagen achteraf aan te passen, en ziet hij toch meteen of
 * zijn code klopt in plaats van pas op de betaalknop.
 */

export type CodePreview =
  | { ok: true; code: string; percent: number; discountCents: number }
  | { ok: false; reason: CodeRejection; minSpendCents?: number };

export async function previewDiscountCode(
  rawCode: unknown,
  rawItems: unknown,
  rawEmail: unknown,
): Promise<CodePreview> {
  const code = normalizeCode(typeof rawCode === "string" ? rawCode : "");
  if (!code) return { ok: false, reason: "unknown" };

  if (!Array.isArray(rawItems)) return { ok: false, reason: "onlyDiscounted" };
  const items = rawItems.filter((item): item is CartItem =>
    isValidCartItem(item),
  );
  if (items.length === 0) return { ok: false, reason: "onlyDiscounted" };

  // Prijzen komen uit de catalogus, niet uit wat de browser meestuurde
  const parts = await lookupCartParts(items);
  const byId = new Map(parts.map((part) => [part.id, part]));
  const lines = items.flatMap((item) => {
    const part = byId.get(item.partId);
    return part
      ? [
          {
            priceCents: part.priceCents,
            quantity: item.quantity,
            discountPercent: part.discountPercent,
          },
        ]
      : [];
  });

  // Het mailadres komt van de klant zelf en dient alleen om "één keer per
  // klant" nu al te kunnen melden. Is het er niet, dan blijft die controle
  // staan tot het afrekenen.
  const email = typeof rawEmail === "string" && rawEmail.includes("@")
    ? rawEmail
    : undefined;

  const check = await checkCode({
    code,
    email,
    baseGrossCents: codeBaseCents(lines),
  });

  if (!check.ok) {
    return check.minSpendCents === undefined
      ? { ok: false, reason: check.reason }
      : { ok: false, reason: check.reason, minSpendCents: check.minSpendCents };
  }

  return {
    ok: true,
    code: check.code.code,
    percent: check.code.percent,
    discountCents: check.discountGrossCents,
  };
}
