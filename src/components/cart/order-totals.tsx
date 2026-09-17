"use client";

import { useTranslations } from "next-intl";
import { formatPriceCents } from "@/lib/format";
import { vatPortionCents } from "@/lib/pricing";
import { calculateShipping } from "@/lib/shipping";

/**
 * Totaaloverzicht: subtotaal, verzendkosten en eindbedrag. Eén component
 * voor winkelwagen én checkout, zodat de klant overal hetzelfde ziet.
 */
export function OrderTotals({
  subtotalCents,
  discount,
}: {
  subtotalCents: number;
  /** Een gekeurde kortingscode; het bedrag is hier al uitgerekend */
  discount?: { code: string; percent: number; cents: number };
}) {
  const t = useTranslations("totals");
  // De verzendgrens kijkt naar het bedrag ná de korting — precies zoals de
  // server het straks uitrekent (docs/DECISIONS.md #14). Zou dit hier anders
  // staan, dan belooft het overzicht gratis verzending die de betaalpagina
  // niet geeft.
  const payableCents = subtotalCents - (discount?.cents ?? 0);
  // Met dezelfde uitzondering als op de server: een kleine korting mag de
  // gratis verzending niet wegnemen als de klant daardoor méér zou betalen
  // (order-document.ts). Zou dit hier anders staan, dan wijkt het bedrag op
  // het scherm af van wat er afgeschreven wordt.
  const shippingAfter = calculateShipping(payableCents);
  const shippingBefore = calculateShipping(subtotalCents);
  const shipping =
    payableCents + shippingAfter.costCents >
    subtotalCents + shippingBefore.costCents
      ? shippingBefore
      : shippingAfter;
  const totalCents = payableCents + shipping.costCents;

  return (
    <div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt>{t("subtotal")}</dt>
          <dd className="tabular-nums">{formatPriceCents(subtotalCents)}</dd>
        </div>
        {discount && (
          <div className="flex justify-between">
            <dt>
              {t("codeRow", {
                code: discount.code,
                percent: discount.percent,
              })}
            </dt>
            <dd className="tabular-nums text-caro-ink dark:text-foreground">
              −{formatPriceCents(discount.cents)}
            </dd>
          </div>
        )}
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
