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
      <div className="flex flex-wrap items-center gap-4">
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
            className="size-10 text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:text-muted"
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
            className="size-10 text-foreground hover:bg-surface disabled:cursor-not-allowed disabled:text-muted"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled}
          className="flex-1 rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
        >
          {announced ? t("added") : t("addToCart")}
        </button>
      </div>

      {/* Feedback ook voor screenreaders, niet alleen visueel */}
      <p className="sr-only" role="status" aria-live="polite">
        {announced ? t("addedAnnouncement", { name: part.name }) : ""}
      </p>
    </div>
  );
}
