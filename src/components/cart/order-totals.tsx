"use client";

import { useTranslations } from "next-intl";
import { formatPriceCents } from "@/lib/format";
import { vatPortionCents } from "@/lib/pricing";
import { calculateShipping } from "@/lib/shipping";

/**
 * Totaaloverzicht: subtotaal, verzendkosten en eindbedrag. Eén component
 * voor winkelwagen én checkout, zodat de klant overal hetzelfde ziet.
 */
export function OrderTotals({ subtotalCents }: { subtotalCents: number }) {
  const t = useTranslations("totals");
  const shipping = calculateShipping(subtotalCents);
  const totalCents = subtotalCents + shipping.costCents;

  return (
    <div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>{t("subtotal")}</dt>
          <dd className="tabular-nums">{formatPriceCents(subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("shipping")}</dt>
          <dd className="tabular-nums">
            {shipping.isFree ? (
              <span className="font-semibold">{t("freeShipping")}</span>
            ) : (
              formatPriceCents(shipping.costCents)
            )}
          </dd>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-base">
          <dt className="font-bold">{t("total")}</dt>
          <dd className="font-bold tabular-nums">
            {formatPriceCents(totalCents)}
          </dd>
        </div>
      </dl>

      {/* Btw expliciet benoemen: verplicht bij consumentenprijzen */}
      <p className="mt-1 text-xs text-muted">
        {t("vatIncluded", {
          amount: formatPriceCents(vatPortionCents(totalCents)),
        })}
      </p>

      {!shipping.isFree && shipping.remainingForFreeCents > 0 && (
        <p className="mt-3 rounded-md bg-surface p-3 text-sm">
          {t("remainingForFree", {
            amount: formatPriceCents(shipping.remainingForFreeCents),
          })}
        </p>
      )}
    </div>
  );
}
