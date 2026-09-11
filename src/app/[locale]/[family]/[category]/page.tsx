import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BrandTiles } from "@/components/brand-tiles";
import { JsonLd } from "@/components/json-ld";
import { ProductFilters } from "@/components/product-filters";
import { ProductGrid } from "@/components/product-grid";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { PartsCategoryPage } from "@/components/parts-category-page";
import { TyreSizePicker } from "@/components/tyres/tyre-size-picker";
import { WheelSizePicker } from "@/components/wheels/wheel-size-picker";
import {
  filterTyres,
  formatTyreSize,
  parseTyreSeason,
  parseTyreSize,
  tyreSearchTerm,
} from "@/lib/catalog/tyre-size";
import {
  familyFromSlug,
  familySlug,
  usesVehicleCatalog,
} from "@/lib/catalog/families";
import {
  countActiveFilters,
  FILTER_PARAM,
  parseFilterParam,
  toFilterParam,
} from "@/lib/catalog/filter-params";
import {
  formatWheelSelection,
  hasWheelSelection,
  parseWheelSelection,
  wheelSelectionToFilters,
} from "@/lib/catalog/wheel-size";
import { localizeCategories } from "@/lib/catalog/localized-categories";
import { getCatalogProvider } from "@/lib/catalog/provider";
import {
  groupIdFromSlug,
  groupNameFromSlug,
  partGroupById,
} from "@/lib/catalog/wearparts-provider";
import {
  breadcrumbJsonLd,
  localizedMetadata,
  socialMetadata,
} from "@/lib/site";

type Props = {
  params: Promise<{ locale: string; family: string; category: string }>;
  searchParams: Promise<{
    f?: string | string[];
    toon?: string;
    auto?: string;
    alles?: string;
    breedte?: string;
    hoogte?: string;
    diameter?: string;
    seizoen?: string;
    steekcirkel?: string;
  }>;
};

/** Producten per stap. Meer laden telt hier telkens bij op. */
const PAGE_SIZE = 20;

/**
 * Hoeveel banden we ophalen als er op maat gezocht wordt binnen één
 * categorie. Ruimer dan de familiepagina (30): daar tellen alle treffers
 * mee, hier valt eerst alles af dat in een andere bandencategorie hoort.
 */
const TYRE_CATEGORY_FETCH_SIZE = 120;

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale, family: familyParam, category: slug } = await params;
  const family = familyFromSlug(familyParam, locale);
  if (!family) return {};
  const t = await getTranslations({ locale, namespace: "category" });

  const localizedHref = (targetLocale: string) =>
    getPathname({
      locale: targetLocale as Locale,
      href: {
        pathname: "/[family]/[category]",
        params: { family: familySlug(family, targetLocale), category: slug },
      },
    });

  const meta = (name: string, description: string) => ({
    title: `${name} — CarO`,
    description,
    ...localizedMetadata(locale, localizedHref),
    ...socialMetadata({
      locale,
      title: `${name} — CarO`,
      description,
      // Bewust zonder `?auto=`: de canonical is de schone URL, één pagina per
      // categorie in plaats van één per auto (zie app/robots.ts).
      path: localizedHref(locale),
    }),
  });

  // Onderdelen staan niet in `provider.getCategories()` — hun boom hangt aan
  // een auto (docs/api/WEARPARTS.md). Daardoor viel deze functie hier vroeger
  // uit op `{}` en kregen álle onderdelenpagina's, veruit de meeste van de
  // shop, geen titel, canonical, hreflang of Open Graph. GEMETEN 2026-09-09:
  // nul <title>-tags op /nl/onderdelen/oliefilter-543.
  if (usesVehicleCatalog(family)) {
    const groupId = groupIdFromSlug(slug);
    if (groupId === null) return {};
    const { auto } = await searchParams;
    const carId = /^[0-9]+$/.test(auto ?? "") ? Number(auto) : null;
    // Met een auto in de URL is de echte naam gratis: de pagina zelf haalt
    // dezelfde gecachte boom op. Zonder auto draaien we de slug terug.
    const name =
      (carId ? (await partGroupById(carId, groupId))?.name : null) ??
      groupNameFromSlug(slug);
    if (!name) return {};
    return meta(name, t("metaDescriptionParts", { category: name }));
  }

  const categories = await localizeCategories(
    await getCatalogProvider().getCategories(family),
  );
  const category = categories.find((c) => c.slug === slug);
  if (!category) return {};

  return meta(
    category.name,
    t("metaDescription", { category: category.name }),
  );
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, family: familyParam, category: slug } = await params;
  setRequestLocale(locale);
  const family = familyFromSlug(familyParam, locale);
  if (!family) notFound();

  const query = await searchParams;

  // Onderdelen hebben een eigen catalogus met een eigen boom en een
  // verplichte auto (docs/api/WEARPARTS.md); die pagina staat apart.
  if (usesVehicleCatalog(family)) {
    const auto = query.auto;
    const requestedParts = Number(query.toon);
    return (
      <PartsCategoryPage
        family={family}
        familySlugParam={familyParam}
        categorySlug={slug}
        carId={/^[0-9]+$/.test(auto ?? "") ? Number(auto) : null}
        limit={
          Number.isInteger(requestedParts) && requestedParts > 0
            ? Math.min(requestedParts, 200)
            : 20
        }
        showAllTypes={query.alles === "1"}
        selected={parseFilterParam(query[FILTER_PARAM])}
      />
    );
  }

  const provider = getCatalogProvider();

  // De categorielijst is nodig om de slug te keuren, maar de filters en de
  // producten hangen alleen van de slug zélf af. Ze wachtten hier eerder op
  // elkaar: eerst de lijst ophalen, dán pas beginnen met de rest. Nu start
  // alles tegelijk en scheelt dat één heenweg naar de leverancier op élke
  // categoriepagina.
  //
  // Bij een onbekende slug is dat werk voor niets, maar dat is precies de
  // pagina die niemand opvraagt — en het antwoord blijft een echte 404.
  const categoriesPromise = provider
    .getCategories(family)
    .then(localizeCategories);
  const selected = parseFilterParam(query[FILTER_PARAM]);
  const activeCount = countActiveFilters(selected);

  // "Meer laden" verhoogt het aantal in de URL. Bewust geen knop met state:
  // zo blijft de lijst deelbaar, werkt terugnavigeren en is er geen
  // JavaScript nodig — net als bij de filters.
  const requested = Number(query.toon);
  const limit =
    Number.isInteger(requested) && requested > 0
      ? Math.min(requested, PAGE_SIZE * 10)
      : PAGE_SIZE;

  const t = await getTranslations("category");
  const tFilters = await getTranslations("filters");
  const tFamily = await getTranslations("family");
  const tTyres = await getTranslations("tyres");
  const tWheels = await getTranslations("wheels");

  // Banden hebben binnen een categorie nóg een ingang: de maat op de flank.
  // Die stond alleen op de familiepagina, terwijl de klant die via
  // "Offroad" of "Transporter" binnenkomt precies dezelfde vraag heeft.
  const tyreFamily = family === "banden";
  const tyreSize = tyreFamily
    ? parseTyreSize({
        width: query.breedte,
        height: query.hoogte,
        diameter: query.diameter,
      })
    : null;
  const tyreSeason = parseTyreSeason(query.seizoen);

  // Velgen krijgen dezelfde behandeling als banden: de maat die op de auto
  // staat als ingang, in plaats van 59 leveranciersteksten in de zijbalk.
  const wheelFamily = family === "velgen";
  const wheelSelection = wheelFamily
    ? parseWheelSelection(query)
    : {};

  // Filters en producten parallel: beide raken dezelfde gecachte API-call.
  // Bij een gekozen velgmaat moeten we wel eerst het filterblok hebben — de
  // keuze "15 inch" bestaat daar als zeven losse teksten en die moeten mee
  // in de productquery. Dat wachten geldt alléén voor die ene situatie.
  const filterGroupsPromise = provider.getFilters(family, slug);

  const [filterGroups, parts] = await Promise.all([
    filterGroupsPromise,
    tyreSize
      ? // Met een maat is de zoekopdracht leidend. /items accepteert search
        // óf parentNodeId, nooit allebei (tyre24-provider.ts), dus zoeken we
        // op de maat over de hele bandenarea en houden we daarna over wat in
        // déze categorie valt. Ruimer ophalen dan we tonen, want de treffers
        // verdelen zich over Auto/SUV, Offroad, Transporter en de rest.
        provider
          .getParts({
            family,
            search: tyreSearchTerm(tyreSize, tyreSeason),
            limit: TYRE_CATEGORY_FETCH_SIZE,
          })
          .then((found) =>
            filterTyres(found, tyreSize, tyreSeason)
              .filter((part) => part.categorySlug === slug)
              .slice(0, limit),
          )
      : hasWheelSelection(wheelSelection)
        ? filterGroupsPromise.then((groups) =>
            provider.getParts({
              family,
              categorySlug: slug,
              filters: {
                ...selected,
                ...wheelSelectionToFilters(groups, wheelSelection),
              },
              limit,
            }),
          )
        : provider.getParts({
            family,
            categorySlug: slug,
            filters: selected,
            limit,
          }),
  ]);

  const categories = await categoriesPromise;
  // Hernoemde categorie-URL's vangt de proxy af met een 308 (proxy.ts),
  // dus hier blijft alleen de echte onzin over.
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  // Kruimelpad voor de zoekresultaten van Google, met dezelfde stappen als
  // de zichtbare <nav> hieronder.
  const breadcrumbs = breadcrumbJsonLd([
    { name: t("breadcrumbHome"), path: `/${locale}` },
    {
      name: tFamily(`${family}.title`),
      path: getPathname({
        locale: locale as Locale,
        href: { pathname: "/[family]", params: { family: familyParam } },
      }),
    },
    {
      name: category.name,
      path: getPathname({
        locale: locale as Locale,
        href: {
          pathname: "/[family]/[category]",
          params: { family: familyParam, category: slug },
        },
      }),
    },
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
      <JsonLd data={breadcrumbs} />

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

      {/* Korte inleiding: zonder tekst is dit voor een zoekmachine alleen een
          raster met prijzen, en dan valt niet af te lezen waar de pagina
          over gaat. */}
      <p className="mt-3 max-w-2xl text-muted">
        {t("intro", {
          category: category.name,
          family: tFamily(`${family}.title`).toLowerCase(),
        })}
      </p>

      {/* Zustercategorieën. Bij banden is dit het verschil tussen Auto/SUV,
          Offroad en Transporter — zonder deze rij kan de klant alleen via
          het menu wisselen. */}
      {categories.length > 1 && (
        <nav aria-label={t("siblingsAria")} className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {categories.map((sibling) => {
              const current = sibling.slug === slug;
              return (
                <li key={sibling.slug}>
                  <Link
                    href={{
                      pathname: "/[family]/[category]",
                      params: { family: familyParam, category: sibling.slug },
                    }}
                    aria-current={current ? "page" : undefined}
                    className={`inline-flex rounded-md border px-3 py-1.5 text-sm ${
                      current
                        ? "border-caro-orange bg-surface font-semibold"
                        : "border-border text-muted hover:border-caro-orange hover:text-foreground"
                    }`}
                  >
                    {sibling.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {/* De maatkiezer boven de filters: wie banden koopt begint bij de maat
          op zijn flank, niet bij een merk. Het formulier post terug naar
          deze categorie, zodat "Offroad" ook Offroad blijft. */}
      {tyreFamily && (
        <TyreSizePicker
          action={getPathname({
            locale: locale as Locale,
            href: {
              pathname: "/[family]/[category]",
              params: { family: familyParam, category: slug },
            },
          })}
          size={tyreSize}
          season={tyreSeason}
        />
      )}

      {/* Velgen: dezelfde plek als de bandenmaatkiezer. De opties komen uit
          het filterblok van déze categorie, dus alleen maten die er echt
          zijn staan in de lijst. */}
      {wheelFamily && (
        <WheelSizePicker
          action={getPathname({
            locale: locale as Locale,
            href: {
              pathname: "/[family]/[category]",
              params: { family: familyParam, category: slug },
            },
          })}
          groups={filterGroups}
          selection={wheelSelection}
        />
      )}

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        {/* Met een maat in de URL zijn de merk- en laadindexfilters niet meer
            van toepassing: die horen bij de categorielijst, en de lijst komt
            nu uit een zoekopdracht op maat. Ze tonen zou knoppen opleveren
            die niets doen. */}
        {!tyreSize && filterGroups.length > 0 && (
          <>
            {/* Mobiel: uitklapbaar, zodat de producten bovenaan blijven staan */}
            <details className="rounded-lg border border-border lg:hidden">
              <summary className="cursor-pointer px-4 py-3 font-semibold">
                {tFilters("toggle")}
                {activeCount > 0 && (
                  <span className="ms-2 rounded-full bg-caro-orange px-2 py-0.5 text-xs text-caro-ink tabular-nums">
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
          {/* Merk boven de producten en over de volle breedte: in de 256px
              brede zijbalk werden namen als "Alfa Romeo" afgekapt tot
              "Alfa R…", en merk is waar de meeste klanten op filteren. */}
          {!tyreSize && (
            <BrandTiles
              groups={filterGroups}
              selected={selected}
              family={familyParam}
              category={slug}
            />
          )}

          <p className="text-sm text-muted">
            {tyreSize
              ? tTyres("resultsInCategory", {
                  size: formatTyreSize(tyreSize),
                  count: parts.length,
                })
              : hasWheelSelection(wheelSelection)
                ? tWheels("resultsForSize", {
                    size: formatWheelSelection(wheelSelection),
                    count: parts.length,
                  })
                : tFilters("resultCount", { count: parts.length })}
          </p>
          <div className="mt-4">
            <ProductGrid parts={parts} />
          </div>

          {/* Even veel treffers als gevraagd? Dan is er waarschijnlijk meer.
              De leverancier geeft geen totaal mee, dus dit is het eerlijkste
              signaal dat we hebben. */}
          {parts.length >= limit && (
            <div className="mt-8 flex justify-center">
              <Link
                href={{
                  pathname: "/[family]/[category]",
                  params: { family: familyParam, category: slug },
                  query: tyreSize
                    ? {
                        // Met een maat draagt de URL de maat, niet de filters
                        breedte: String(tyreSize.width),
                        hoogte: String(tyreSize.height),
                        diameter: String(tyreSize.diameter),
                        ...(tyreSeason ? { seizoen: tyreSeason } : {}),
                        toon: String(limit + PAGE_SIZE),
                      }
                    : {
                        ...(activeCount > 0
                          ? { [FILTER_PARAM]: toFilterParam(selected) }
                          : {}),
                        toon: String(limit + PAGE_SIZE),
                      },
                }}
                className="rounded-md border border-border px-6 py-3 font-semibold hover:border-caro-orange hover:bg-surface"
              >
                {tFilters("loadMore", { count: PAGE_SIZE })}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
