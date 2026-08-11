import { useLocale, useTranslations } from "next-intl";
import { AvailabilityBadge } from "@/components/availability-badge";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ProductImagePlaceholder } from "@/components/product-image-placeholder";
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
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-border transition-colors hover:border-caro-orange">
      <Link href={href} tabIndex={-1} aria-hidden="true">
        {/* Placeholder zolang Tyre24 geen bruikbare foto-URL's levert
            (docs/api/TYRE24.md) */}
        <ProductImagePlaceholder
          label={t("noImage")}
          className="aspect-4/3 opacity-60 transition-opacity group-hover:opacity-100"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="eyebrow text-xs">{part.brand}</p>
        <h3 className="text-sm">
          <Link href={href} className="hover:underline">
            {part.name}
          </Link>
        </h3>
        {part.oeNumber && (
          <p className="text-xs text-muted tabular-nums">
            {t("oeLabel")}: {part.oeNumber}
          </p>
        )}

        <p className="mt-3">
          <span className="text-lg font-bold tabular-nums">
            {formatPriceCents(part.priceCents)}
          </span>{" "}
          <span className="text-xs text-muted">{t("inclVat")}</span>
        </p>

        <div className="mt-2">
          <AvailabilityBadge availability={part.availability} />
        </div>

        {/* mt-auto: knoppen op één lijn ook als titels verschillend lang zijn */}
        <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
          <Link
            href={href}
            aria-label={t("viewAria", { name: part.name })}
            className="inline-flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface"
          >
            {t("view")}
          </Link>
          <AddToCartButton part={part} variant="compact" />
        </div>
      </div>
    </article>
  );
}
