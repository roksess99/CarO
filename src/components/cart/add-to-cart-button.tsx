"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { addToCart } from "@/components/cart/use-cart";
import type { Part } from "@/lib/catalog/types";

export function AddToCartButton({
  part,
  /**
   * `compact` is de snelle actie op een productkaart: plus-icoon vóór de
   * tekst, zodat de knop op één rij naast "Bekijken" past en toch meteen
   * leesbaar blijft. Een icoon zonder tekst zou raden worden.
   */
  variant = "default",
  className = "",
}: {
  part: Part;
  variant?: "default" | "compact";
  className?: string;
}) {
  const t = useTranslations("cart");
  const [announced, setAnnounced] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disabled = part.availability === "out-of-stock";

  function handleClick() {
    addToCart(part);
    setAnnounced(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setAnnounced(false), 2000);
  }

  const size = variant === "compact" ? "px-3 py-2 text-sm" : "px-4 py-2.5";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md bg-caro-orange font-semibold text-caro-ink disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted ${size} ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {announced ? <path d="m4 12.5 5 5L20 6.5" /> : <path d="M12 5v14M5 12h14" />}
      </svg>
      {announced ? t("added") : t("addToCart")}
      {/* Feedback ook voor screenreaders, niet alleen visueel */}
      <span className="sr-only" role="status" aria-live="polite">
        {announced ? t("addedAnnouncement", { name: part.name }) : ""}
      </span>
    </button>
  );
}
