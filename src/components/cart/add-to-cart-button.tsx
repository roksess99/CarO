"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { addToCart } from "@/components/cart/use-cart";
import type { Part } from "@/lib/catalog/types";

export function AddToCartButton({ part }: { part: Part }) {
  const t = useTranslations("cart");
  const [announced, setAnnounced] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disabled = part.availability === "out-of-stock";

  function handleClick() {
    addToCart(part.id);
    setAnnounced(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setAnnounced(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="mt-2 rounded-md bg-caro-orange px-3 py-2 text-sm font-semibold text-caro-ink disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
    >
      {announced ? t("added") : t("addToCart")}
      {/* Feedback ook voor screenreaders, niet alleen visueel */}
      <span className="sr-only" role="status" aria-live="polite">
        {announced ? t("addedAnnouncement", { name: part.name }) : ""}
      </span>
    </button>
  );
}
