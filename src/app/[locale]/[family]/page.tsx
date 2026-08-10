import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductGrid } from "@/components/product-grid";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  familyFromSlug,
  familyHasSource,
  familySlug,
  PRODUCT_FAMILIES,
} from "@/lib/catalog/families";
import { getCatalogProvider } from "@/lib/catalog/provider";

type Props = {
  params: Promise<{ locale: string; family: string }>;
  searchParams: Promise<{ oen?: string | string[] }>;
};

// TODO: echte domeinnaam zodra hosting vaststaat (docs/DECISIONS.md #2)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Next geeft de locale van de bovenliggende route mee, zodat we per taal
// alleen de juiste familieslugs genereren (nl → onderdelen/banden,
// en → parts/tyres) en geen 404-pagina's voorrenderen.
export function generateStaticParams({ params }: { params: { locale: string } }) {
  return PRODUCT_FAMILIES.map((family) => ({
    family: familySlug(family, params.locale),
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, family: slug } = await params;
  const family = familyFromSlug(slug, locale);
  if (!family) return {};
  const t = await getTranslations({ locale, namespace: "family" });

  const href = { pathname: "/[family]", params: { family: slug } } as const;
  return {
    title: `${t(`${family}.title`)} — CarO`,
    description: t(`${family}.intro`),
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: getPathname({ locale: locale as Locale, href }),
      languages: {
        nl: getPathname({
          locale: "nl",
          href: { pathname: "/[family]", params: { family: familySlug(family, "nl") } },
        }),
        en: getPathname({
          locale: "en",
          href: { pathname: "/[family]", params: { family: familySlug(family, "en") } },
        }),
      },
    },
  };
}

export default async function FamilyPage({ params, searchParams }: Props) {
  const { locale, family: slug } = await params;
  setRequestLocale(locale);
  const family = familyFromSlug(slug, locale);
  if (!family) notFound();

  const t = await getTranslations("family");
  const provider = getCatalogProvider();
  const categories = await provider.getCategories(family);

  const { oen } = await searchParams;
  const searchTerm = (Array.isArray(oen) ? oen[0] : oen)?.trim();

  // Zonder categorieën maar mét bron: alleen doorzoekbaar op OE-nummer
  // (Tyre24 area 3). Dan tonen we een zoekformulier i.p.v. een grid.
  const searchOnly = categories.length === 0 && familyHasSource(family);
  const parts = searchOnly
    ? searchTerm
      ? await provider.getParts({ family, search: searchTerm })
      : []
    : await provider.getParts({ family, limit: 8 });

  const formAction = getPathname({
    locale: locale as Locale,
    href: { pathname: "/[family]", params: { family: slug } },
  });

  return (
    <div className="site-container py-12 md:py-16">
      <p className="eyebrow text-sm">{t("eyebrow")}</p>
      <h1 className="mt-3 text-3xl md:text-4xl">{t(`${family}.title`)}</h1>
      <p className="mt-4 max-w-xl text-muted">{t(`${family}.intro`)}</p>

      {searchOnly ? (
        <>
          {/* Gewoon een GET-formulier: werkt zonder JavaScript en het
              resultaat is deelbaar via de URL */}
          <form action={formAction} className="mt-8 max-w-lg">
            <label htmlFor="oen" className="mb-2 block text-sm font-medium">
              {t("oenLabel")}
            </label>
            <div className="flex flex-wrap items-start gap-3">
              <input
                id="oen"
                name="oen"
                defaultValue={searchTerm ?? ""}
                placeholder={t("oenPlaceholder")}
                autoComplete="off"
                spellCheck={false}
                className="w-56 rounded-md border border-border bg-background px-3 py-2 font-medium tabular-nums"
              />
              <button
                type="submit"
                className="rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink"
              >
                {t("oenSubmit")}
              </button>
            </div>
            <p className="mt-2 text-sm text-muted">{t("oenHint")}</p>
          </form>

          <div className="mt-10">
            {!searchTerm ? null : parts.length === 0 ? (
              <p className="max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
                {t("oenNoResults", { term: searchTerm })}
              </p>
            ) : (
              <>
                <h2 className="text-2xl">
                  {t("oenResults", { term: searchTerm })}
                </h2>
                <div className="mt-6">
                  <ProductGrid parts={parts} />
                </div>
              </>
            )}
          </div>
        </>
      ) : categories.length === 0 ? (
        // Eerlijke lege staat: geen verzonnen producten als er geen bron is
        <p className="mt-10 max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
          {t(`${family}.empty`)}
        </p>
      ) : (
        <>
          <nav aria-label={t("categoriesAria")} className="mt-8">
            <ul className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={{
                      pathname: "/[family]/[category]",
                      params: { family: slug, category: category.slug },
                    }}
                    className="inline-block rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Alleen tonen als er echt iets is: de eerste categorie van een
              familie kan leeg zijn of (bij Tyre24) een 500 geven */}
          {parts.length > 0 && (
            <>
              <h2 className="mt-12 text-2xl">{t("featuredTitle")}</h2>
              <div className="mt-6">
                <ProductGrid parts={parts} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
