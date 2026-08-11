import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductFilters } from "@/components/product-filters";
import { ProductGrid } from "@/components/product-grid";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { familyFromSlug, familySlug } from "@/lib/catalog/families";
import {
  countActiveFilters,
  FILTER_PARAM,
  parseFilterParam,
} from "@/lib/catalog/filter-params";
import { getCatalogProvider } from "@/lib/catalog/provider";
import { localizedMetadata } from "@/lib/site";

type Props = {
  params: Promise<{ locale: string; family: string; category: string }>;
  searchParams: Promise<{ f?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, family: familyParam, category: slug } = await params;
  const family = familyFromSlug(familyParam, locale);
  if (!family) return {};
  const categories = await getCatalogProvider().getCategories(family);
  const category = categories.find((c) => c.slug === slug);
  if (!category) return {};
  const t = await getTranslations({ locale, namespace: "category" });

  const localizedHref = (targetLocale: string) =>
    getPathname({
      locale: targetLocale as Locale,
      href: {
        pathname: "/[family]/[category]",
        params: { family: familySlug(family, targetLocale), category: slug },
      },
    });

  return {
    title: `${category.name} — CarO`,
    description: t("metaDescription", { category: category.name }),
    ...localizedMetadata(locale, localizedHref),
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, family: familyParam, category: slug } = await params;
  setRequestLocale(locale);
  const family = familyFromSlug(familyParam, locale);
  if (!family) notFound();

  const provider = getCatalogProvider();
  const categories = await provider.getCategories(family);
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const selected = parseFilterParam((await searchParams)[FILTER_PARAM]);
  const activeCount = countActiveFilters(selected);

  const t = await getTranslations("category");
  const tFilters = await getTranslations("filters");
  const tFamily = await getTranslations("family");

  // Filters en producten parallel: beide raken dezelfde gecachte API-call
  const [filterGroups, parts] = await Promise.all([
    provider.getFilters(family, slug),
    provider.getParts({ family, categorySlug: slug, filters: selected }),
  ]);

  const filters = (
    <ProductFilters
      groups={filterGroups}
      selected={selected}
      family={familyParam}
      category={slug}
    />
  );

  return (
    <div className="site-container py-8 md:py-12">
      <nav aria-label={t("breadcrumbAria")}>
        <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <li>
            <Link href="/" className="hover:text-foreground">
              {t("breadcrumbHome")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={{ pathname: "/[family]", params: { family: familyParam } }}
              className="hover:text-foreground"
            >
              {tFamily(`${family}.title`)}
            </Link>
          </li>
        </ol>
      </nav>

      <h1 className="mt-6 text-3xl md:text-4xl">{category.name}</h1>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        {filterGroups.length > 0 && (
          <>
            {/* Mobiel: uitklapbaar, zodat de producten bovenaan blijven staan */}
            <details className="rounded-lg border border-border lg:hidden">
              <summary className="cursor-pointer px-4 py-3 font-semibold">
                {tFilters("toggle")}
                {activeCount > 0 && (
                  <span className="ml-2 rounded-full bg-caro-orange px-2 py-0.5 text-xs text-caro-ink tabular-nums">
                    {activeCount}
                  </span>
                )}
              </summary>
              <div className="border-t border-border p-4">{filters}</div>
            </details>

            {/* Desktop: vaste zijbalk naast het grid */}
            <aside className="hidden w-64 shrink-0 lg:block">{filters}</aside>
          </>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">
            {tFilters("resultCount", { count: parts.length })}
          </p>
          <div className="mt-4">
            <ProductGrid parts={parts} />
          </div>
        </div>
      </div>
    </div>
  );
}
