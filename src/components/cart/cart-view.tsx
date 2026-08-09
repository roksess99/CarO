"use client";

import { useTranslations } from "next-intl";
import { CaroMark } from "@/components/brand/caro-mark";
import { removeFromCart, setCartQuantity } from "@/components/cart/use-cart";
import { useCartParts } from "@/components/cart/use-cart-parts";
import { subtotalCents } from "@/lib/cart/cart";
import { MAX_QUANTITY } from "@/lib/cart/types";
import { formatPriceCents } from "@/lib/format";
import { Link } from "@/i18n/navigation";

// De wagen leeft in localStorage; useCartParts zoekt de artikelen op via
// een Server Action (op id, niet door een catalogus te doorzoeken).
export function CartView() {
  const t = useTranslations("cart");
  const { entries, loading } = useCartParts();

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="flex gap-4 py-4">
            <div className="size-20 animate-pulse rounded-md bg-surface" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-surface" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-surface" />
              <div className="h-8 w-32 animate-pulse rounded bg-surface" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div>
        <p className="text-muted">{t("empty")}</p>
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

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
      <ul className="flex-1 divide-y divide-border border-y border-border">
        {entries.map(({ part, quantity }) => (
          <li key={part.id} className="flex gap-4 py-4">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-md bg-surface">
              <CaroMark variant="line" className="size-6 opacity-30" />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <p className="eyebrow text-xs">{part.brand}</p>
              <h2 className="text-sm">{part.name}</h2>
              <p className="text-xs text-muted tabular-nums">{part.oeNumber}</p>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <div
                  className="inline-flex items-center rounded-md border border-border"
                  role="group"
                  aria-label={t("quantityFor", { name: part.name })}
                >
                  <button
                    type="button"
                    aria-label={t("decrease", { name: part.name })}
                    disabled={quantity <= 1}
                    onClick={() => setCartQuantity(part.id, quantity - 1)}
                    className="size-8 text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:text-muted"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-medium tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={t("increase", { name: part.name })}
                    disabled={quantity >= MAX_QUANTITY}
                    onClick={() => setCartQuantity(part.id, quantity + 1)}
                    className="size-8 text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:text-muted"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(part.id)}
                  className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
                >
                  {t("remove")}
                  <span className="sr-only"> — {part.name}</span>
                </button>
              </div>
            </div>
            <p className="text-sm font-bold tabular-nums">
              {formatPriceCents(part.priceCents * quantity)}
            </p>
          </li>
        ))}
      </ul>

      <aside className="w-full rounded-lg border border-border p-6 lg:max-w-sm">
        <h2 className="text-lg">{t("summaryTitle")}</h2>
        <dl className="mt-4 flex justify-between text-sm">
          <dt>{t("subtotal")}</dt>
          <dd className="font-bold tabular-nums">
            {formatPriceCents(subtotal)}
          </dd>
        </dl>
        <p className="mt-1 text-xs text-muted">{t("inclVat")}</p>
        {/* Verplicht vóór de laatste checkoutstap (CLAUDE.md, NL-recht) */}
        <p className="mt-4 text-sm text-muted">{t("shippingNote")}</p>
        <p className="mt-2 text-sm text-muted">{t("withdrawalNote")}</p>
        <Link
          href="/checkout"
          className="mt-6 block w-full rounded-md bg-caro-orange px-6 py-3 text-center font-semibold text-caro-ink"
        >
          {t("checkout")}
        </Link>
      </aside>
    </div>
  );
}
