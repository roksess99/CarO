"use client";

import { useTranslations } from "next-intl";
import { useCart } from "@/components/cart/use-cart";
import { subtotalCents } from "@/lib/cart/cart";
import type { Part } from "@/lib/catalog/types";
import { formatPriceCents } from "@/lib/format";
import { Link } from "@/i18n/navigation";

// Compact, alleen-lezen overzicht voor de checkout. De wagen leeft
// client-side; de server-page geeft de catalogus mee voor de lookup.
export function OrderSummary({ parts }: { parts: Part[] }) {
  const t = useTranslations("checkout");
  const cart = useCart();

  const partById = new Map(parts.map((p) => [p.id, p]));
  const entries = cart.items.flatMap((item) => {
    const part = partById.get(item.partId);
    return part ? [{ item, part }] : [];
  });

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
    entries.map(({ item, part }) => ({
      quantity: item.quantity,
      priceCents: part.priceCents,
    })),
  );

  return (
    <div className="rounded-lg border border-border p-6">
      <h2 className="text-lg">{t("summaryTitle")}</h2>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {entries.map(({ item, part }) => (
          <li key={part.id} className="flex items-baseline justify-between gap-4 py-3 text-sm">
            <span>
              {part.name}{" "}
              <span className="text-muted tabular-nums">× {item.quantity}</span>
            </span>
            <span className="font-medium tabular-nums">
              {formatPriceCents(part.priceCents * item.quantity)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 flex justify-between text-sm">
        <dt>{t("subtotal")}</dt>
        <dd className="font-bold tabular-nums">{formatPriceCents(subtotal)}</dd>
      </dl>
      <p className="mt-1 text-xs text-muted">{t("inclVat")}</p>
      {/* Verplicht vóór de laatste checkoutstap (CLAUDE.md, NL-recht) */}
      <p className="mt-4 text-sm text-muted">{t("shippingNote")}</p>
      <p className="mt-2 text-sm text-muted">{t("withdrawalNote")}</p>
      <Link
        href="/cart"
        className="mt-4 inline-block text-sm text-muted underline underline-offset-4 hover:text-foreground"
      >
        {t("backToCart")}
      </Link>
    </div>
  );
}
