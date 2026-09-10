"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { addToCart } from "@/components/cart/use-cart";
import { MAX_QUANTITY, MIN_QUANTITY } from "@/lib/cart/types";
import type { Part } from "@/lib/catalog/types";

// Winkelwagenknop met aantal, voor de productdetailpagina. De kaart in het
// grid gebruikt de simpele variant (add-to-cart-button.tsx).
export function AddToCartWithQuantity({ part }: { part: Part }) {
  const t = useTranslations("cart");
  const tProduct = useTranslations("product");
  const [quantity, setQuantity] = useState(MIN_QUANTITY);
  const [announced, setAnnounced] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disabled = part.availability === "out-of-stock";

  function handleAdd() {
    addToCart(part, quantity);
    setAnnounced(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setAnnounced(false), 2000);
  }

  return (
    <div>
      {/* De knop is het zwaartepunt van de pagina en moet dat ook zíjn: h-14
          en over de volle breedte, met de aantalkiezer eronder in plaats van
          ernaast. Naast elkaar hielden de twee elkaar in evenwicht — precies
          wat je niet wilt, want negen van de tien klanten bestellen er één. */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-md bg-caro-orange px-6 text-lg font-bold text-caro-ink disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {announced ? (
            <path d="m4 12.5 5 5L20 6.5" />
          ) : (
            <>
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="17.5" cy="20" r="1.5" />
              <path d="M2 3h2.5l2.6 12.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L20.5 8H6" />
            </>
          )}
        </svg>
        {announced ? t("added") : t("addToCart")}
      </button>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-sm text-muted">{tProduct("quantityLabel")}</span>
        <div
          className="inline-flex items-center rounded-md border border-border"
          role="group"
          aria-label={tProduct("quantityLabel")}
        >
          <button
            type="button"
            aria-label={t("decrease", { name: part.name })}
            disabled={disabled || quantity <= MIN_QUANTITY}
            onClick={() => setQuantity((q) => Math.max(MIN_QUANTITY, q - 1))}
            className="size-11 text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:text-muted"
          >
            −
          </button>
          <span className="w-10 text-center font-medium tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            aria-label={t("increase", { name: part.name })}
            disabled={disabled || quantity >= MAX_QUANTITY}
            onClick={() => setQuantity((q) => Math.min(MAX_QUANTITY, q + 1))}
            className="size-11 text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:text-muted"
          >
            +
          </button>
        </div>
      </div>

      {/* Feedback ook voor screenreaders, niet alleen visueel */}
      <p className="sr-only" role="status" aria-live="polite">
        {announced ? t("addedAnnouncement", { name: part.name }) : ""}
      </p>
    </div>
  );
}
