import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryGrid } from "@/components/home/category-grid";
import { Hero } from "@/components/home/hero";
import { ProductGrid } from "@/components/product-grid";
import { Link } from "@/i18n/navigation";
import {
  familySlug,
  PRODUCT_FAMILIES,
  type ProductFamily,
} from "@/lib/catalog/families";
import { getCatalogProvider } from "@/lib/catalog/provider";
import { localizedMetadata } from "@/lib/site";

type Props = {
  params: Promise<{ locale: string }>;
};

/** Familie waarvan we op de homepage producten uitlichten */
const FEATURED_FAMILY: ProductFamily = "banden";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    ...localizedMetadata(locale, (l) => `/${l}`),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tFamily = await getTranslations("family");

  // Alleen één familie ophalen voor de uitgelichte rij: zes productsecties
  // zou zes keer de API raken en de pagina onnodig lang maken.
  const featured = await getCatalogProvider().getParts({
    family: FEATURED_FAMILY,
    limit: 4,
  });

  return (
    <>
      <Hero />

      <CategoryGrid />

      {/* Tegel per familie: het hele assortiment in één oogopslag */}
      <section className="site-container pb-16 md:pb-24">
        <h2 className="text-2xl">{tFamily("menuTitle")}</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCT_FAMILIES.map((family) => (
            <li key={family}>
              <Link
                href={{
                  pathname: "/[family]",
                  params: { family: familySlug(family, locale) },
                }}
                className="flex h-full flex-col rounded-lg border border-border p-5 transition-colors hover:border-caro-orange hover:bg-surface"
              >
                <span className="text-lg font-bold">
                  {tFamily(`${family}.title`)}
                </span>
                <span className="mt-2 text-sm text-muted">
                  {tFamily(`${family}.intro`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {featured.length > 0 && (
        <section className="site-container pb-16 md:pb-24">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-2xl">
              {tFamily(`${FEATURED_FAMILY}.title`)}
            </h2>
            <Link
              href={{
                pathname: "/[family]",
                params: { family: familySlug(FEATURED_FAMILY, locale) },
              }}
              className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface"
            >
              {tFamily("viewAll")}
            </Link>
          </div>
          <div className="mt-6">
            <ProductGrid parts={featured} />
          </div>
        </section>
      )}
    </>
  );
}
