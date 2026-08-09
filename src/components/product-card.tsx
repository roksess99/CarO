import { useLocale, useTranslations } from "next-intl";
import { CaroMark } from "@/components/brand/caro-mark";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Link } from "@/i18n/navigation";
import { familySlug } from "@/lib/catalog/families";
import type { Part } from "@/lib/catalog/types";
import { formatPriceCents } from "@/lib/format";

export function ProductCard({ part }: { part: Part }) {
  const t = useTranslations("product");
  const locale = useLocale();
  const href = {
    pathname: "/[family]/[category]/[part]",
    params: {
      family: familySlug(part.family, locale),
      category: part.categorySlug,
      part: part.slug,
    },
  } as const;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border">
      <Link href={href} tabIndex={-1} aria-hidden="true">
        {/* Placeholder tot er echte productfoto's zijn (fase 3) */}
        <div className="flex aspect-4/3 items-center justify-center bg-surface">
          <CaroMark variant="line" className="size-8 opacity-30" />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="eyebrow text-xs">{part.brand}</p>
        <h3 className="text-sm">
          <Link href={href} className="hover:underline">
            {part.name}
          </Link>
        </h3>
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
        {/* mt-auto: knoppen op één lijn ook als titels verschillend lang zijn */}
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <Link
            href={href}
            aria-label={t("viewAria", { name: part.name })}
            className="rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface"
          >
            {t("view")}
          </Link>
          <AddToCartButton part={part} />
        </div>
      </div>
    </article>
  );
}
