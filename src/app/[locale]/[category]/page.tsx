import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductGrid } from "@/components/product-grid";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCatalogProvider } from "@/lib/catalog/provider";

type Props = {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<{ merk?: string | string[] }>;
};

// TODO: echte domeinnaam zodra hosting vaststaat (docs/DECISIONS.md #2)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateStaticParams() {
  const categories = await getCatalogProvider().getCategories();
  return categories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category: slug } = await params;
  const categories = await getCatalogProvider().getCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return {};
  const t = await getTranslations({ locale, namespace: "category" });

  const href = {
    pathname: "/[category]",
    params: { category: slug },
  } as const;

  return {
    title: `${category.name} — CarO`,
    description: t("metaDescription", { category: category.name }),
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: getPathname({ locale: locale as Locale, href }),
      languages: {
        nl: getPathname({ locale: "nl", href }),
        en: getPathname({ locale: "en", href }),
      },
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, category: slug } = await params;
  setRequestLocale(locale);

  const provider = getCatalogProvider();
  const categories = await provider.getCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const { merk } = await searchParams;
  const activeBrand = Array.isArray(merk) ? merk[0] : merk;

  const t = await getTranslations("category");
  // Ongefilterd voor de merkchips; gefilterd voor het grid
  const allParts = await provider.getParts({ categorySlug: slug });
  const parts = activeBrand
    ? await provider.getParts({ categorySlug: slug, brand: activeBrand })
    : allParts;
  const brands = [...new Set(allParts.map((p) => p.brand))].sort();

  const chipBase = "rounded-md border border-border px-3 py-1 text-sm";
  const chipActive = `${chipBase} font-semibold text-foreground underline decoration-caro-orange decoration-2 underline-offset-4`;
  const chipInactive = `${chipBase} text-muted hover:text-foreground`;

  return (
    <div className="site-container py-12 md:py-16">
      <h1 className="text-3xl md:text-4xl">{category.name}</h1>

      {brands.length > 1 && (
        <nav aria-label={t("brandFilterLabel")} className="mt-6">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href={{ pathname: "/[category]", params: { category: slug } }}
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
                    pathname: "/[category]",
                    params: { category: slug },
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
