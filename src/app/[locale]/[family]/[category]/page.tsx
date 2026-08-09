import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductGrid } from "@/components/product-grid";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { familyFromSlug, familySlug } from "@/lib/catalog/families";
import { getCatalogProvider } from "@/lib/catalog/provider";

type Props = {
  params: Promise<{ locale: string; family: string; category: string }>;
  searchParams: Promise<{ merk?: string | string[] }>;
};

// TODO: echte domeinnaam zodra hosting vaststaat (docs/DECISIONS.md #2)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: localizedHref(locale),
      languages: { nl: localizedHref("nl"), en: localizedHref("en") },
    },
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

  const { merk } = await searchParams;
  const activeBrand = Array.isArray(merk) ? merk[0] : merk;

  const t = await getTranslations("category");
  const tFamily = await getTranslations("family");
  // Ongefilterd voor de merkchips; gefilterd voor het grid
  const allParts = await provider.getParts({ family, categorySlug: slug });
  const parts = activeBrand
    ? await provider.getParts({ family, categorySlug: slug, brand: activeBrand })
    : allParts;
  const brands = [...new Set(allParts.map((p) => p.brand))].sort();

  const chipBase = "rounded-md border border-border px-3 py-1 text-sm";
  const chipActive = `${chipBase} font-semibold text-foreground underline decoration-caro-orange decoration-2 underline-offset-4`;
  const chipInactive = `${chipBase} text-muted hover:text-foreground`;

  return (
    <div className="site-container py-8 md:py-12">
      {/* Kruimelpad maakt de familie overal zichtbaar */}
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

      {brands.length > 1 && (
        <nav aria-label={t("brandFilterLabel")} className="mt-6">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href={{
                  pathname: "/[family]/[category]",
                  params: { family: familyParam, category: slug },
                }}
                aria-current={!activeBrand ? "true" : undefined}
                className={!activeBrand ? chipActive : chipInactive}
              >
                {t("allBrands")}
              </Link>
            </li>
            {brands.map((brand) => (
              <li key={brand}>
                <Link
                  href={{
                    pathname: "/[family]/[category]",
                    params: { family: familyParam, category: slug },
                    query: { merk: brand },
                  }}
                  aria-current={brand === activeBrand ? "true" : undefined}
                  className={brand === activeBrand ? chipActive : chipInactive}
                >
                  {brand}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="mt-8">
        <ProductGrid parts={parts} />
      </div>
    </div>
  );
}
