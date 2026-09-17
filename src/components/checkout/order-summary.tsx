"use client";

import { useTranslations } from "next-intl";
import { OrderTotals } from "@/components/cart/order-totals";
import { useCartParts } from "@/components/cart/use-cart-parts";
import { DiscountCodeField } from "@/components/checkout/discount-code-field";
import { useAppliedCode } from "@/components/checkout/use-discount-code";
import { DiscountBadge } from "@/components/discount-badge";
import { codeBaseCents, codeDiscountCents } from "@/lib/discounts/code-base";
import { subtotalCents } from "@/lib/cart/cart";
import { formatPriceCents } from "@/lib/format";
import { Link } from "@/i18n/navigation";

// Compact, alleen-lezen overzicht voor de checkout. Zelfde bron als de
// winkelwagen: artikelen worden op id opgezocht via de Server Action.
export function OrderSummary() {
  const t = useTranslations("checkout");
  const { entries, loading } = useCartParts();
  const applied = useAppliedCode();

  if (loading) {
    return (
      <div className="rounded-lg border border-border p-6" aria-busy="true">
        <div className="h-6 w-32 animate-pulse rounded bg-surface" />
        <div className="mt-4 space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-surface" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div>
        <p className="text-muted">{t("emptyCart")}</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink"
        >
          {t("emptyCta")}
        </Link>
      </div>
    );
  }

  const subtotal = subtotalCents(
    entries.map(({ part, quantity }) => ({
      quantity,
      priceCents: part.priceCents,
    })),
  );

  // Het kortingsbedrag wordt hier opnieuw uitgerekend uit de wagen zoals hij nu
  // is, met dezelfde regels als de server: alleen over artikelen zonder eigen
  // actie, en naar beneden afgerond. Een onthouden bedrag zou verouderen zodra
  // de klant nog iets toevoegt.
  const codeBase = codeBaseCents(
    entries.map(({ part, quantity }) => ({
      priceCents: part.priceCents,
      quantity,
      discountPercent: part.discountPercent,
    })),
  );
  const discountCents = applied ? codeDiscountCents(codeBase, applied.percent) : 0;

  return (
    <div className="rounded-lg border border-border p-6">
      <h2 className="text-lg">{t("summaryTitle")}</h2>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {entries.map(({ part, quantity }) => (
          <li
            key={part.id}
            className="flex items-baseline justify-between gap-4 py-3 text-sm"
          >
            <span>
              {part.name}{" "}
              <span className="text-muted tabular-nums">× {quantity}</span>{" "}
              <DiscountBadge
                percent={part.discountPercent}
                className="align-middle text-xs"
              />
            </span>
            <span className="font-medium tabular-nums">
              {formatPriceCents(part.priceCents * quantity)}
            </span>
          </li>
        ))}
      </ul>
      <DiscountCodeField />

      <div className="mt-4">
        <OrderTotals
          subtotalCents={subtotal}
          discount={
            applied && discountCents > 0
              ? {
                  code: applied.code,
                  percent: applied.percent,
                  cents: discountCents,
                }
              : undefined
          }
        />
      </div>
      {/* Verplicht vóór de laatste checkoutstap (CLAUDE.md, NL-recht) */}
      <p className="mt-4 text-sm text-muted">{t("withdrawalNote")}</p>
      <Link
        href="/cart"
        className="mt-4 inline-block text-sm text-muted underline underline-offset-4 hover:text-foreground"
      >
        {t("backToCart")}
      </Link>
    </div>
  );
}
