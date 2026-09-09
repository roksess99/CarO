"use client";

import { useTranslations } from "next-intl";
import { useCart } from "@/components/cart/use-cart";
import { countItems } from "@/lib/cart/cart";
import { Link } from "@/i18n/navigation";

export function CartButton() {
  const t = useTranslations("cart");
  const count = countItems(useCart());

  return (
    <Link
      href="/cart"
      aria-label={t("buttonAria", { count })}
      className="relative inline-flex size-10 items-center justify-center rounded-md border border-border text-foreground hover:bg-surface"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="17.5" cy="20" r="1.5" />
        <path d="M2 3h2.5l2.6 12.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L20.5 8H6" />
      </svg>
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -end-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-caro-orange px-1 text-xs leading-none font-semibold text-caro-ink ring-2 ring-background tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
