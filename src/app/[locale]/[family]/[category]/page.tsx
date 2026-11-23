import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { LoadMore } from "@/components/load-more";
import { Pagination } from "@/components/pagination";
import { ProductFilters } from "@/components/product-filters";
import { ProductGrid } from "@/components/product-grid";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { PartsCategoryPage } from "@/components/parts-category-page";
import { TyreBrandFilter } from "@/components/tyres/tyre-brand-filter";
import { TyreSizePicker } from "@/components/tyres/tyre-size-picker";
import { WheelSizePicker } from "@/components/wheels/wheel-size-picker";
import { brandFacets, matchesBrand } from "@/lib/catalog/brand-facets";
import {
  filterTyres,
  formatTyreSize,
  parseTyreSeason,
  parseTyreSize,
  TYRE_FETCH_SIZE,
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
import { formatPriceCents } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping";
import {
  groupIdFromSlug,
  groupNameFromSlug,
  partGroupById,
} from "@/lib/catalog/wearparts-provider";
import {
  SITE_NAME,  breadcrumbJsonLd,
  localizedMetadata,
  socialMetadata,
} from "@/lib/site";

type Props = {
  params: Promise<{ locale: string; family: string; category: string }>;
  searchParams: Promise<{
    f?: string | string[];
    toon?: string;
    /** Eengebaseerd paginanummer, zie components/pagination.tsx */
    pagina?: string;
    auto?: string;
    alles?: string;
    breedte?: string;
    hoogte?: string;
    diameter?: string;
    seizoen?: string;
    merk?: string;
    steekcirkel?: string;
  }>;
};

/** Producten per stap. Meer laden telt hier telkens bij op. */
const PAGE_SIZE = 20;

// Hoeveel banden we ophalen als er op maat gezocht wordt binnen één
// categorie: `TYRE_FETCH_SIZE` uit `lib/catalog/tyre-size.ts`, hetzelfde getal
// als de familiepagina en de homepage. Hier valt daarna eerst alles af dat in
// een andere bandencategorie hoort.

/**
 * Hoe ver de genummerde pagina's gaan: vijftig keer twintig is duizend
 * artikelen per categorie.
 *
 * De grens is er voor de rekening, niet voor de klant. Elke pagina is één
 * eigen verzoek bij de leverancier (`limit=20&page=N`), en een crawler die
 * alles afloopt kost dus een verzoek per pagina. Auto / SUV telt er zo'n
 * 1.600 (@docs/DECISIONS.md #14); de rest van de categorie blijft voor de
 * klant bereikbaar via filters en "meer laden".
 */
const MAX_PAGES = 50;

/**
 * `?pagina=` als getal, of 1. Alles wat geen geheel getal binnen de grens is
 * telt als de eerste pagina: een bijgewerkte URL hoort een bruikbare pagina
 * te geven, en de canonical wijst dan naar de schone URL.
 */
function pageFromParam(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= MAX_PAGES ? page : 1;
}

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

  // Pagina 2 en verder zijn eigen pagina's met eigen artikelen, dus ook een
  // eigen canonical. Wezen ze naar pagina 1, dan zou Google de artikelen
  // erop als duplicaat wegzetten — en die zijn juist de reden dat ze bestaan.
  const { pagina } = await searchParams;
  const page = usesVehicleCatalog(family) ? 1 : pageFromParam(pagina);
  const withPage = (path: string) =>
    page > 1 ? `${path}?pagina=${page}` : path;

  const meta = (name: string, description: string) => {
    const title = [
      t("metaTitle", { name }),
      ...(page > 1 ? [t("pagination.metaPage", { page })] : []),
      SITE_NAME,
    ].join(" — ");
    return {
      title,
      description,
      ...localizedMetadata(locale, (l) => withPage(localizedHref(l))),
      ...socialMetadata({
        locale,
        title,
        description,
        // Bewust zonder `?auto=`: de canonical is de schone URL, één pagina
        // per categorie in plaats van één per auto (zie app/robots.ts).
        path: withPage(localizedHref(locale)),
      }),
    };
  };

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

  const tFamily = await getTranslations({ locale, namespace: "family" });
  const heading = categoryHeading(
    category.name,
    family,
    tFamily(`${family}.title`),
    (name) => t(`headingWithFamily.${family}`, { category: name }),
  );
  return meta(
    heading,
    t(`metaDescriptionFamily.${family}`, {
      category: heading,
      site: SITE_NAME,
      amount: formatPriceCents(FREE_SHIPPING_THRESHOLD_CENTS),
    }),
  );
}

/**
 * De kop van een categorie, met de familie erbij waar die ontbreekt.
 *
 * "Auto / SUV" zegt binnen de bandenpagina genoeg, maar als titel in Google
 * staat hij los, en dan zoekt niemand op "auto / suv". GEMETEN 2026-11-23:
 * `<title>Auto / SUV — CaroParts</title>`. Nu wordt dat "Auto / SUV-banden".
 *
 * Zit de familie al in de naam ("Kleine banden", "Staalvelgen"), dan blijft
 * de naam staan — anders komt er "Kleine banden-banden". Bij toebehoren komt
 * er niets bij: "Accu's en acculaders" is al wat de klant zoekt.
 */
function categoryHeading(
  name: string,
  family: string,
  familyTitle: string,
  withFamily: (category: string) => string,
): string {
  if (family !== "banden" && family !== "velgen") return name;
  // Eerste vier letters van de familienaam: band/tyre, velg/whee. Genoeg om
  // "Kleine banden" en "Staalvelgen" te herkennen, zonder woordenlijst.
  const stem = familyTitle.toLowerCase().slice(0, 4);
  if (name.toLowerCase().includes(stem)) return name;
  return withFamily(name);
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
        filters={parseFilterParam(query[FILTER_PARAM])}
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

  // Genummerde pagina's alleen bij de kale categorielijst. Met een maat, een
  // velgkeuze of een filter is het een variant (en staat de URL in
  // robots.txt op disallow), en "meer laden" telt vanaf pagina 1 op — die
  // twee door elkaar zouden artikelen dubbel tonen.
  const browsing =
    !tyreSize && !hasWheelSelection(wheelSelection) && activeCount === 0;
  const page = browsing && !query.toon ? pageFromParam(query.pagina) : 1;

  // Filters en producten parallel: beide raken dezelfde gecachte API-call.
  // Bij een gekozen velgmaat moeten we wel eerst het filterblok hebben — de
  // keuze "15 inch" bestaat daar als zeven losse teksten en die moeten mee
  // in de productquery. Dat wachten geldt alléén voor die ene situatie.
  const filterGroupsPromise = provider.getFilters(family, slug);

  const [filterGroups, found] = await Promise.all([
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
            limit: TYRE_FETCH_SIZE,
          })
          .then((found) =>
            // Niet meteen afkappen: het merkfilter hieronder telt over de
            // héle lijst, anders zouden de aantallen achter de merken alleen
            // over de eerste twintig gaan.
            filterTyres(found, tyreSize, tyreSeason).filter(
              (part) => part.categorySlug === slug,
            ),
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
            page: page - 1,
          }),
  ]);

  // Een pagina voorbij het eind bestaat niet. Zonder deze regel gaf
  // `?pagina=49` een lege lijst met status 200 — een soft 404 per
  // verzonnen nummer.
  if (page > 1 && found.length === 0) notFound();

  // Het merkfilter hoort bij de maatzoekopdracht: daar vervallen de filters
  // van de leverancier (die horen bij een categorie) en bleef er niets over om
  // 200 banden mee terug te brengen. De merken komen daarom uit de treffers
  // zelf, met echte aantallen (lib/catalog/brand-facets.ts).
  const tyreBrands = tyreSize ? brandFacets(found) : [];
  const tyreBrand = tyreSize && query.merk ? query.merk : null;
  const parts = (
    tyreBrand ? found.filter((part) => matchesBrand(part, tyreBrand)) : found
  ).slice(0, limit);

  // Wat er in élke link op deze pagina mee moet zolang er een maat staat:
  // zonder deze drie valt de zoekopdracht weg en staat de klant terug in de
  // ongefilterde categorie.
  const tyreSizeQuery: Record<string, string> = tyreSize
    ? {
        breedte: String(tyreSize.width),
        hoogte: String(tyreSize.height),
        diameter: String(tyreSize.diameter),
        ...(tyreSeason ? { seizoen: tyreSeason } : {}),
        ...(tyreBrand ? { merk: tyreBrand } : {}),
      }
    : {};

  const categories = await categoriesPromise;
  // Hernoemde categorie-URL's vangt de proxy af met een 308 (proxy.ts),
  // dus hier blijft alleen de echte onzin over.
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  // Zelfde kop als in de <title> (zie generateMetadata): "Auto / SUV-banden"
  // in plaats van een kaal "Auto / SUV".
  const heading = categoryHeading(
    category.name,
    family,
    tFamily(`${family}.title`),
    (name) => t(`headingWithFamily.${family}`, { category: name }),
  );

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
      name: heading,
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

      <h1 className="mt-6 text-3xl md:text-4xl">{heading}</h1>

      {/* Korte inleiding: zonder tekst is dit voor een zoekmachine alleen een
          raster met prijzen, en dan valt niet af te lezen waar de pagina
          over gaat. */}
      <p className="mt-3 max-w-2xl text-muted">
        {t(`introFamily.${family}`, { category: heading })}
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
          {/* Hier stond tot 2026-11-01 een merkenrij in tegels, bovenop het
              merkfilter in het paneel hiernaast. Twee keer hetzelfde filter
              op één pagina, gemeld door de eigenaar — de uitklapbare blijft
              (@docs/DECISIONS.md #28).

              Bij een maatzoekopdracht is dit géén dubbeling: dan vervalt het
              filterblok van de categorie en worden de merken over de treffers
              zelf geteld. */}
          {tyreSize && (
            <TyreBrandFilter
              facets={tyreBrands}
              active={tyreBrand}
              family={familyParam}
              category={slug}
              query={tyreSizeQuery}
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
          {page === 1 && parts.length >= limit && (
            <LoadMore
              href={{
                pathname: "/[family]/[category]",
                params: { family: familyParam, category: slug },
                query: tyreSize
                  ? {
                      // Met een maat draagt de URL de maat, niet de filters
                      ...tyreSizeQuery,
                      toon: String(limit + PAGE_SIZE),
                    }
                  : {
                      ...(activeCount > 0
                        ? { [FILTER_PARAM]: toFilterParam(selected) }
                        : {}),
                      toon: String(limit + PAGE_SIZE),
                    },
              }}
              label={tFilters("loadMore", { count: PAGE_SIZE })}
              busyLabel={tFilters("loadMoreBusy")}
            />
          )}

          {/* De weg voor de crawler naar artikel 21 en verder; "meer laden"
              hierboven staat op disallow. Op pagina 1 staan ze allebei:
              de knop voor wie wil doorscrollen, de nummers voor wie (of wat)
              een vaste pagina zoekt. */}
          {browsing && !query.toon && (
            <Pagination
              current={page}
              hasNext={parts.length >= PAGE_SIZE && page < MAX_PAGES}
              hrefFor={(target) => ({
                pathname: "/[family]/[category]",
                params: { family: familyParam, category: slug },
                query: target > 1 ? { pagina: String(target) } : {},
              })}
              labels={{
                nav: t("pagination.nav"),
                previous: t("pagination.previous"),
                next: t("pagination.next"),
                page: (target) => t("pagination.page", { page: target }),
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
