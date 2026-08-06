import { useTranslations } from "next-intl";
import { CaroMark } from "@/components/brand/caro-mark";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import type { Part } from "@/lib/catalog/types";
import { formatPriceCents } from "@/lib/format";

export function ProductCard({ part }: { part: Part }) {
  const t = useTranslations("product");

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border">
      {/* Placeholder tot er echte productfoto's zijn (fase 3) */}
      <div className="flex aspect-4/3 items-center justify-center bg-surface">
        <CaroMark variant="line" className="size-8 opacity-30" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="eyebrow text-xs">{part.brand}</p>
        <h3 className="text-sm">{part.name}</h3>
        <p className="text-xs text-muted tabular-nums">
          {t("oeLabel")}: {part.oeNumber}
        </p>
        <p className="mt-2">
          <span className="text-base font-bold tabular-nums">
            {formatPriceCents(part.priceCents)}
          </span>{" "}
          <span className="text-xs text-muted">{t("inclVat")}</span>
        </p>
        <p
          className={
            part.availability === "out-of-stock"
              ? "text-xs text-muted"
              : "text-xs font-medium"
          }
        >
          {t(`availability.${part.availability}`)}
        </p>
        <AddToCartButton part={part} />
      </div>
    </article>
  );
}
