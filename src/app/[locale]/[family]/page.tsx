import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Image from "next/image";
import { ProductGrid } from "@/components/product-grid";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  familyFromSlug,
  familySlug,
  PRODUCT_FAMILIES,
  usesVehicleCatalog,
} from "@/lib/catalog/families";
import { localizeCategories } from "@/lib/catalog/localized-categories";
import { getCatalogProvider } from "@/lib/catalog/provider";
import {
  groupSlug,
  partGroups,
  searchParts,
} from "@/lib/catalog/wearparts-provider";
import { localizedMetadata } from "@/lib/site";

type Props = {
  params: Promise<{ locale: string; family: string }>;
  searchParams: Promise<{ oen?: string | string[]; auto?: string }>;
};

/** Artikelen per zoekopdracht of categorie */
const PAGE_SIZE = 20;

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

  return {
    title: `${t(`${family}.title`)} — CarO`,
    description: t(`${family}.intro`),
    ...localizedMetadata(locale, (l) =>
      getPathname({
        locale: l,
        href: { pathname: "/[family]", params: { family: familySlug(family, l) } },
      }),
    ),
  };
}

export default async function FamilyPage({ params, searchParams }: Props) {
  const { locale, family: slug } = await params;
  setRequestLocale(locale);
  const family = familyFromSlug(slug, locale);
  if (!family) notFound();

  const t = await getTranslations("family");
  const provider = getCatalogProvider();
  const categories = await localizeCategories(
    await provider.getCategories(family),
  );

  const { oen, auto } = await searchParams;
  const searchTerm = (Array.isArray(oen) ? oen[0] : oen)?.trim();

  // Onderdelen komen uit de Wearparts-API: zoeken op naam kan altijd,
  // bladeren pas als er een auto gekozen is (docs/api/WEARPARTS.md).
  const vehicleCatalog = usesVehicleCatalog(family);
  const carId = /^[0-9]+$/.test(auto ?? "") ? Number(auto) : null;

  const searchResult =
    vehicleCatalog && searchTerm
      ? await searchParts(searchTerm, PAGE_SIZE)
      : { parts: [], total: 0 };
  const groups = vehicleCatalog && carId ? await partGroups(carId) : [];

  const parts = vehicleCatalog
    ? searchResult.parts
    : await provider.getParts({ family, limit: 8 });

  // GEMETEN 2026-09-06: area 3 doorzoekt uitsluitend OE-nummers. Zoeken op
  // "OELFILTER" of "VOLKSWAGEN" geeft nul treffers, óók al heet het artikel
  // letterlijk zo. De andere families zijn wél op naam doorzoekbaar, dus
  // vangen we een naam-zoekopdracht daar op in plaats van de klant met een
  // lege pagina achter te laten.
  const elsewhere =
    vehicleCatalog && searchTerm && parts.length === 0
      ? (
          await Promise.all(
            PRODUCT_FAMILIES.filter((other) => other !== family).map((other) =>
              provider.getParts({ family: other, search: searchTerm, limit: 4 }),
            ),
          )
        ).flat()
      : [];

  const formAction = getPathname({
    locale: locale as Locale,
    href: { pathname: "/[family]", params: { family: slug } },
  });

  return (
    <div className="site-container py-12 md:py-16">
      <p className="eyebrow text-sm">{t("eyebrow")}</p>
      <h1 className="mt-3 text-3xl md:text-4xl">{t(`${family}.title`)}</h1>
      <p className="mt-4 max-w-xl text-muted">{t(`${family}.intro`)}</p>

      {vehicleCatalog ? (
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
                className="w-72 max-w-full rounded-md border border-border bg-background px-3 py-2 font-medium"
              />
              <button
                type="submit"
                className="rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink"
              >
                {t("oenSubmit")}
              </button>
            </div>
            {carId && <input type="hidden" name="auto" value={carId} />}
            <p className="mt-2 text-sm text-muted">{t("oenHint")}</p>
          </form>

          {/* Categorieën met iconen. De boom hangt aan de auto: zonder
              gekozen voertuig kan de leverancier hem niet leveren, dus dan
              tonen we een uitnodiging in plaats van een lege rij. */}
          {carId ? (
            groups.length > 0 && (
              <section className="mt-10">
                <h2 className="text-2xl">{t("groupsTitle")}</h2>
                <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {groups.map((group) => (
                    <li key={group.id}>
                      <Link
                        href={{
                          pathname: "/[family]/[category]",
                          params: { family: slug, category: groupSlug(group) },
                          query: { auto: String(carId) },
                        }}
                        className="flex h-full items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-caro-orange hover:bg-surface"
                      >
                        {group.iconUrl && (
                          <Image
                            src={group.iconUrl}
                            alt=""
                            width={40}
                            height={40}
                            className="size-10 shrink-0 rounded bg-white object-contain p-1"
                          />
                        )}
                        <span className="text-sm font-semibold">{group.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          ) : (
            <p className="mt-8 max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
              {t("chooseCarToBrowse")}
            </p>
          )}

          <div className="mt-10">
            {!searchTerm ? null : parts.length === 0 ? (
              <>
                <p className="max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
                  {t("oenNoResults", { term: searchTerm })}
                </p>
                {elsewhere.length > 0 && (
                  <section className="mt-10">
                    <h2 className="text-2xl">
                      {t("oenElsewhere", { term: searchTerm })}
                    </h2>
                    <div className="mt-6">
                      <ProductGrid parts={elsewhere} />
                    </div>
                  </section>
                )}
              </>
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
