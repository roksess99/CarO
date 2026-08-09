import { useLocale, useTranslations } from "next-intl";
import { CaroMark } from "@/components/brand/caro-mark";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Link } from "@/i18n/navigation";
import { familySlug } from "@/lib/catalog/families";
import type { Part } from "@/lib/catalog/types";
import { formatPriceCents } from "@/lib/format";

const DOT_CLASS = {
  "in-stock": "bg-green-600 dark:bg-green-500",
  ordered: "bg-amber-500",
  "out-of-stock": "bg-muted",
} as const;

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
        <div className="flex aspect-4/3 items-center justify-center bg-surface">
          <CaroMark
            variant="line"
            className="size-8 opacity-30 transition-opacity group-hover:opacity-50"
          />
        </div>
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

        {/* Stip + tekst: voorraad nooit alleen met kleur communiceren (WCAG) */}
        <p className="flex items-center gap-1.5 text-xs">
          <span
            aria-hidden="true"
            className={`size-2 shrink-0 rounded-full ${DOT_CLASS[part.availability]}`}
          />
          <span
            className={
              part.availability === "out-of-stock"
                ? "text-muted"
                : "font-medium"
            }
          >
            {t(`availability.${part.availability}`)}
          </span>
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
