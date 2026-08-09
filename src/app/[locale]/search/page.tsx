import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductGrid } from "@/components/product-grid";
import { SiteSearch } from "@/components/site-search";
import { Link } from "@/i18n/navigation";
import {
  familySlug,
  PRODUCT_FAMILIES,
  type ProductFamily,
} from "@/lib/catalog/families";
import { getCatalogProvider } from "@/lib/catalog/provider";
import type { Part } from "@/lib/catalog/types";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};

/** Per familie tonen we een beperkt aantal treffers met "toon alles"-link */
const RESULTS_PER_FAMILY = 8;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "search" });
  return {
    title: `${t("title")} — CarO`,
    description: t("metaDescription"),
    // Zoekresultaten horen niet in de index (dunne, oneindige content)
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("search");
  const tFamily = await getTranslations("family");

  const { q } = await searchParams;
  const term = (Array.isArray(q) ? q[0] : q)?.trim();

  const provider = getCatalogProvider();
  // Beide families parallel doorzoeken; een familie zonder bron of zonder
  // treffers valt vanzelf weg uit het resultaat.
  const results: { family: ProductFamily; parts: Part[] }[] = term
    ? await Promise.all(
        PRODUCT_FAMILIES.map(async (family) => ({
          family,
          parts: await provider.getParts({
            family,
            search: term,
            limit: RESULTS_PER_FAMILY,
          }),
        })),
      )
    : [];

  const withHits = results.filter((r) => r.parts.length > 0);
  const totalHits = withHits.reduce((sum, r) => sum + r.parts.length, 0);

  return (
    <div className="site-container py-8 md:py-12">
      <h1 className="text-3xl md:text-4xl">
        {term ? t("resultsFor", { term }) : t("title")}
      </h1>

      {/* Zoekveld ook op de pagina zelf, zodat verfijnen direct kan */}
      <div className="mt-6 max-w-2xl">
        <SiteSearch
          locale={locale}
          id="page-search"
          defaultValue={term}
          autoFocus={!term}
        />
      </div>

      {!term ? (
        <div className="mt-10 max-w-2xl rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg">{t("tipsTitle")}</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li>{t("tipSize")}</li>
            <li>{t("tipOen")}</li>
            <li>{t("tipBrand")}</li>
          </ul>
        </div>
      ) : totalHits === 0 ? (
        <div className="mt-10 max-w-2xl rounded-lg border border-border bg-surface p-6">
          <p className="text-muted">{t("noResults", { term })}</p>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li>{t("tipSize")}</li>
            <li>{t("tipOen")}</li>
            <li>{t("tipBrand")}</li>
          </ul>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {withHits.map(({ family, parts }) => (
            <section key={family}>
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h2 className="text-2xl">{tFamily(`${family}.title`)}</h2>
                <Link
                  href={{
                    pathname: "/[family]",
                    params: { family: familySlug(family, locale) },
                  }}
                  className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
                >
                  {tFamily("viewAll")}
                </Link>
              </div>
              <div className="mt-6">
                <ProductGrid parts={parts} />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
