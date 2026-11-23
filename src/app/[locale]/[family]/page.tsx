import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GroupList } from "@/components/catalog/group-list";
import { FaqList } from "@/components/faq-list";
import { ProductFilters } from "@/components/product-filters";
import { ProductGrid } from "@/components/product-grid";
import { TyreBrandFilter } from "@/components/tyres/tyre-brand-filter";
import { PopularTyreSizes } from "@/components/tyres/popular-tyre-sizes";
import { TyreSizePicker } from "@/components/tyres/tyre-size-picker";
import { SelectedCarInUrl } from "@/components/vehicle/use-selected-car";
import { getPathname, Link } from "@/i18n/navigation";
import { guideByKey, guideSlug } from "@/lib/guides";
import type { Locale } from "@/i18n/routing";
import {
  familyFromSlug,
  familySlug,
  PRODUCT_FAMILIES,
  type ProductFamily,
  usesVehicleCatalog,
} from "@/lib/catalog/families";
import { brandFacets, matchesBrand } from "@/lib/catalog/brand-facets";
import {
  countActiveFilters,
  FILTER_PARAM,
  parseFilterParam,
} from "@/lib/catalog/filter-params";
import { localizeCategories } from "@/lib/catalog/localized-categories";
import { getCatalogProvider } from "@/lib/catalog/provider";
import type { SelectedFilters } from "@/lib/catalog/types";
import {
  filterSeason,
  filterTyres,
  formatTyreSize,
  isSeasonLanding,
  seasonSearchTerm,
  parseTyreSeason,
  parseTyreSize,
  type TyreSeason,
  TYRE_FETCH_SIZE,
  type TyreSize,
  tyreSearchTerm,
} from "@/lib/catalog/tyre-size";
import {
  partGroupsWithCounts,
  popularPartGroups,
  searchParts,
} from "@/lib/catalog/wearparts-provider";
import { formatPriceCents } from "@/lib/format";
import { tyreSizeQuery } from "@/lib/catalog/popular-tyre-sizes";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping";
import { SITE_NAME, localizedMetadata, socialMetadata } from "@/lib/site";

type Props = {
  params: Promise<{ locale: string; family: string }>;
  searchParams: Promise<{
    oen?: string | string[];
    auto?: string;
    breedte?: string;
    hoogte?: string;
    diameter?: string;
    seizoen?: string;
    /** Het gekozen merk bij een zoekopdracht op bandenmaat */
    merk?: string;
    /** De filters van de leverancier, zie lib/catalog/filter-params.ts */
    [FILTER_PARAM]?: string | string[];
  }>;
};

/** Artikelen per zoekopdracht of categorie */
const PAGE_SIZE = 20;

/** Vragen per familie, in vaste volgorde (teksten in messages/) */
const FAQ_KEYS = ["q1", "q2", "q3"] as const;

// Banden halen we ruimer op dan we tonen (`TYRE_FETCH_SIZE`, 120). De
// zoekfunctie van de leverancier is op de maat verrassend nauwkeurig
// (gemeten: 60 van de 60 treffers in de gevraagde maat), maar wij rekenen het
// na op het maatblok van het artikel — die marge vangt op wat daarbij afvalt.
// Sinds 2026-10-12 honderdtwintig in plaats van dertig: het merkfilter telt
// over de treffers zelf. Het getal staat in `lib/catalog/tyre-size.ts`, zodat
// deze pagina, de categoriepagina en de homepage één antwoord uit de cache
// delen.

/**
 * Artikelen op de familiepagina van banden, velgen en toebehoren.
 *
 * Twintig, en dat getal is geen smaak: `getParts` zonder categorie valt terug
 * op de eerste categorie met aanbod (tyre24-provider.ts) en komt daarmee uit
 * op precies de URL die `getFilters` en het warmrondje ook ophalen
 * (`parentNodeId=<eerste>&limit=20`). Filters én producten op deze pagina
 * kosten zo samen één verzoek in plaats van twee.
 */
const FAMILY_GRID_SIZE = 20;

// Next geeft de locale van de bovenliggende route mee, zodat we per taal
// alleen de juiste familieslugs genereren (nl → onderdelen/banden,
// en → parts/tyres) en geen 404-pagina's voorrenderen.
export function generateStaticParams({ params }: { params: { locale: string } }) {
  return PRODUCT_FAMILIES.map((family) => ({
    family: familySlug(family, params.locale),
  }));
}

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale, family: slug } = await params;
  const family = familyFromSlug(slug, locale);
  if (!family) return {};
  const t = await getTranslations({ locale, namespace: "family" });

  const localizedHref = (targetLocale: Locale) =>
    getPathname({
      locale: targetLocale,
      href: {
        pathname: "/[family]",
        params: { family: familySlug(family, targetLocale) },
      },
    });
  // Een bandenmaat is een eigen pagina: "205/55 R16 banden" is waar mensen
  // op zoeken. Hij krijgt daarom een eigen titel en een canonical mét de
  // maat. Seizoen en merk tellen niet mee — dat zijn varianten van deze
  // maatpagina, en `merk=` staat in robots.txt op disallow.
  const query = await searchParams;
  const size =
    family === "banden"
      ? parseTyreSize({
          width: query.breedte,
          height: query.hoogte,
          diameter: query.diameter,
        })
      : null;
  if (size) {
    const label = formatTyreSize(size);
    const withSize = (path: string) =>
      `${path}?${new URLSearchParams(tyreSizeQuery(size))}`;
    const sizeTitle = `${t("sizeMetaTitle", { size: label })} — ${SITE_NAME}`;
    const sizeDescription = t("sizeMetaDescription", {
      size: label,
      site: SITE_NAME,
      amount: formatPriceCents(FREE_SHIPPING_THRESHOLD_CENTS),
    });
    return {
      title: sizeTitle,
      description: sizeDescription,
      ...localizedMetadata(locale, (l) => withSize(localizedHref(l))),
      ...socialMetadata({
        locale,
        title: sizeTitle,
        description: sizeDescription,
        path: withSize(localizedHref(locale as Locale)),
      }),
    };
  }

  // Een seizoen zónder maat is ook een eigen pagina: "winterbanden" is waar
  // mensen in het najaar op zoeken. Canonical mét het seizoen. Met een maat
  // erbij blijft het seizoen een variant van de maatpagina (hierboven).
  const season = family === "banden" ? parseTyreSeason(query.seizoen) : null;
  if (isSeasonLanding(season)) {
    const withSeason = (path: string) => `${path}?seizoen=${season}`;
    const seasonTitle = `${t(`season.${season}.metaTitle`)} — ${SITE_NAME}`;
    const seasonDescription = t(`season.${season}.metaDescription`, {
      site: SITE_NAME,
      amount: formatPriceCents(FREE_SHIPPING_THRESHOLD_CENTS),
    });
    return {
      title: seasonTitle,
      description: seasonDescription,
      ...localizedMetadata(locale, (l) => withSeason(localizedHref(l))),
      ...socialMetadata({
        locale,
        title: seasonTitle,
        description: seasonDescription,
        path: withSeason(localizedHref(locale as Locale)),
      }),
    };
  }

  // Een titel met wat de klant typt ("banden kopen") in plaats van alleen de
  // familienaam. GEMETEN 2026-11-23: `<title>Banden — CaroParts</title>`.
  const title = `${t(`${family}.metaTitle`)} — ${SITE_NAME}`;
  const description = t(`${family}.metaDescription`, {
    site: SITE_NAME,
    amount: formatPriceCents(FREE_SHIPPING_THRESHOLD_CENTS),
  });

  return {
    title,
    description,
    ...localizedMetadata(locale, localizedHref),
    ...socialMetadata({
      locale,
      title,
      description,
      path: localizedHref(locale as Locale),
    }),
  };
}

/**
 * Plaatshouder voor een blok dat nog bij de leverancier ligt.
 *
 * Er hing hier eerder een `loading.tsx` om de hele familietak. Die kostte
 * twee dingen: de kop, de bandenmaatkiezer en de uitlegtekst hebben niets van
 * de API nodig en konden meteen zichtbaar zijn, én zolang zo'n Suspense-grens
 * erboven hangt is de HTML met status 200 al onderweg — dan kan een
 * `notFound()` verderop geen echte 404 meer worden.
 */
function GridFallback({ rows = 8 }: { rows?: number }) {
  return (
    <div className="mt-10" aria-busy="true">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="animate-pulse rounded-lg border border-border">
            <div className="aspect-4/3 rounded-t-lg bg-surface" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-1/2 rounded bg-surface" />
              <div className="h-4 w-3/4 rounded bg-surface" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupsFallback() {
  return (
    <div
      className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-xl border border-border bg-surface"
        />
      ))}
    </div>
  );
}

/**
 * Banden in de gekozen maat, met het merkfilter erboven.
 *
 * **Dat filter stond hier niet, en dat was de klacht van de eigenaar
 * (2026-10-12):** wie op /nl/banden een maat invulde kreeg honderd banden
 * zonder een knop om ze mee terug te brengen, terwijl dezelfde zoekopdracht
 * binnen Auto/SUV er wel een had. De filters van de leverancier horen bij een
 * categorie en vervallen bij een maatzoekopdracht (@docs/DECISIONS.md #28),
 * dus hier geldt dezelfde oplossing als daar: de merken worden geteld over de
 * treffers zelf, met echte aantallen.
 */
async function TyreResults({
  family,
  familySlugParam,
  size,
  season,
  brand,
}: {
  family: ProductFamily;
  familySlugParam: string;
  size: TyreSize;
  season: TyreSeason | null;
  brand: string | null;
}) {
  const tTyres = await getTranslations("tyres");
  const found = filterTyres(
    await getCatalogProvider().getParts({
      family,
      search: tyreSearchTerm(size, season),
      limit: TYRE_FETCH_SIZE,
    }),
    size,
    season,
  );
  // Eerst tellen, dan filteren: anders gaan de aantallen achter de merken
  // over de banden die na het merkfilter overblijven, en dat is per definitie
  // alleen het gekozen merk.
  const facets = brandFacets(found);
  const tyres = (
    brand ? found.filter((part) => matchesBrand(part, brand)) : found
  ).slice(0, PAGE_SIZE);

  // Zonder deze drie in elke merklink valt de maat uit de URL en staat de
  // klant terug op de kale familiepagina.
  const sizeQuery: Record<string, string> = {
    breedte: String(size.width),
    hoogte: String(size.height),
    diameter: String(size.diameter),
    ...(season ? { seizoen: season } : {}),
  };

  return (
    <section className="mt-10">
      <h2 className="text-2xl">
        {tTyres("results", { size: formatTyreSize(size) })}
      </h2>
      <div className="mt-6">
        <TyreBrandFilter
          facets={facets}
          active={brand}
          family={familySlugParam}
          query={sizeQuery}
        />
      </div>
      {tyres.length === 0 ? (
        <p className="max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
          {tTyres("noResults", { size: formatTyreSize(size) })}
        </p>
      ) : (
        <ProductGrid parts={tyres} />
      )}
    </section>
  );
}

/**
 * Banden van één seizoen, zonder maat: de inhoud van `/nl/banden?seizoen=winter`.
 *
 * Zelfde opbouw als `TyreResults` hierboven — merkfilter over de treffers,
 * dan het raster — maar met het seizoenswoord als zoekterm. Wie een maat
 * kiest in de kiezer erboven houdt het seizoen (de kiezer krijgt het mee) en
 * komt op de maatpagina met `seizoen=winter` erin.
 */
async function SeasonResults({
  family,
  familySlugParam,
  season,
  brand,
}: {
  family: ProductFamily;
  familySlugParam: string;
  season: TyreSeason;
  brand: string | null;
}) {
  const tTyres = await getTranslations("tyres");
  const found = filterSeason(
    await getCatalogProvider().getParts({
      family,
      search: seasonSearchTerm(season),
      limit: TYRE_FETCH_SIZE,
    }),
    season,
  );
  const facets = brandFacets(found);
  const tyres = (
    brand ? found.filter((part) => matchesBrand(part, brand)) : found
  ).slice(0, PAGE_SIZE);

  return (
    <section className="mt-10">
      <h2 className="text-2xl">{tTyres(`seasonResults.${season}`)}</h2>
      <div className="mt-6">
        <TyreBrandFilter
          facets={facets}
          active={brand}
          family={familySlugParam}
          query={{ seizoen: season }}
        />
      </div>
      {tyres.length === 0 ? (
        <p className="max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
          {tTyres(`seasonNoResults.${season}`)}
        </p>
      ) : (
        <ProductGrid parts={tyres} />
      )}
    </section>
  );
}

/**
 * Categorieën met iconen, voor de gekozen auto.
 *
 * Met aantallen, zodat hoofdgroepen zonder één artikel voor deze auto niet in
 * het raster komen (zie partGroupsWithCounts).
 */
async function PartGroups({
  carId,
  familySlugParam,
}: {
  carId: number;
  familySlugParam: string;
}) {
  const t = await getTranslations("family");
  // Parallel: beide lezen dezelfde gecachte boom, alleen de tellingen
  // verschillen.
  const [popular, groups] = await Promise.all([
    popularPartGroups(carId),
    partGroupsWithCounts(carId),
  ]);
  if (groups.length === 0 && popular.length === 0) return null;

  return (
    <>
      {/* Bovenaan de gangbare onderhoudsdelen, daaronder pas de volledige
          boom. Alfabetisch begint het rooster bij "Aandrijfassen" en
          "Airconditioning", terwijl negen van de tien klanten voor een
          filter, remblokken of olie komen (lib/catalog/quick-links.ts). */}
      {popular.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl">{t("popularTitle")}</h2>
          <div className="mt-6">
            <GroupList
              groups={popular}
              familySlugParam={familySlugParam}
              carId={carId}
              compact
            />
          </div>
        </section>
      )}

      {groups.length > 0 && (
        <section className="mt-10">
          <h2 className="text-2xl">{t("groupsTitle")}</h2>
          <div className="mt-6">
            <GroupList
              groups={groups}
              familySlugParam={familySlugParam}
              carId={carId}
            />
          </div>
        </section>
      )}
    </>
  );
}

/** Zoeken op naam of OE-nummer binnen de onderdelencatalogus */
async function PartsSearchResults({
  family,
  term,
  carId,
}: {
  family: ProductFamily;
  term: string;
  carId: number | null;
}) {
  const t = await getTranslations("family");

  // De gekozen auto gaat mee in de zoekopdracht: zonder dat doorzoekt de
  // leverancier de hele catalogus en komen er onderdelen boven die niet eens
  // op deze auto passen.
  const { parts } = await searchParts(term, PAGE_SIZE, 0, carId ?? undefined);

  // GEMETEN 2026-09-06: area 3 doorzoekt uitsluitend OE-nummers. Zoeken op
  // "OELFILTER" of "VOLKSWAGEN" geeft nul treffers, óók al heet het artikel
  // letterlijk zo. De andere families zijn wél op naam doorzoekbaar, dus
  // vangen we een naam-zoekopdracht daar op in plaats van de klant met een
  // lege pagina achter te laten.
  const provider = getCatalogProvider();
  const elsewhere =
    parts.length === 0
      ? (
          await Promise.all(
            PRODUCT_FAMILIES.filter((other) => other !== family).map((other) =>
              provider.getParts({ family: other, search: term, limit: 4 }),
            ),
          )
        ).flat()
      : [];

  if (parts.length === 0) {
    return (
      <div className="mt-10">
        <p className="max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
          {t("oenNoResults", { term })}
        </p>
        {elsewhere.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl">{t("oenElsewhere", { term })}</h2>
            <div className="mt-6">
              <ProductGrid parts={elsewhere} />
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="mt-10">
      <h2 className="text-2xl">{t("oenResults", { term })}</h2>
      <div className="mt-6">
        <ProductGrid parts={parts} />
      </div>
    </div>
  );
}

/**
 * Categorieknoppen, filters en de artikelen - voor de families zonder auto.
 *
 * **De filters stonden hier niet**, en dat was de tweede helft van de klacht
 * van 2026-10-12: op /nl/banden was er geen merk- of laadindexfilter te
 * bekennen tot de klant eerst Auto/SUV, Offroad of Transporter aanklikte.
 *
 * Ze horen hier wel thuis, want het rijtje eronder kwam altijd al uit een
 * enkele categorie: `getParts` zonder categorie valt terug op de eerste met
 * aanbod (tyre24-provider.ts). De filters komen nu uit diezelfde categorie,
 * dus ze filteren precies wat eronder staat en beloven niets over de rest van
 * de familie - daarvoor staan de categorieknoppen erboven.
 *
 * **Het kost geen extra verzoek.** `getFilters` vraagt
 * `items?parentNodeId=<eerste>&limit=20`, en met FAMILY_GRID_SIZE op twintig
 * is dat letterlijk dezelfde URL als die van de artikelen zelf. Next haalt
 * hem een keer op, en het warmrondje heeft hem na een deploy al staan.
 */
async function CategoryBrowse({
  family,
  familySlugParam,
  showFeatured,
  selected,
}: {
  family: ProductFamily;
  familySlugParam: string;
  showFeatured: boolean;
  selected: SelectedFilters;
}) {
  const t = await getTranslations("family");
  const tFilters = await getTranslations("filters");
  const provider = getCatalogProvider();
  const categories = await provider
    .getCategories(family)
    .then(localizeCategories);

  if (categories.length === 0) {
    // Eerlijke lege staat: geen verzonnen producten als er geen bron is
    return (
      <p className="mt-10 max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
        {t(`${family}.empty`)}
      </p>
    );
  }

  // Dezelfde categorie die `getParts` hieronder zelf zou kiezen.
  const primary = categories[0];
  const [filterGroups, parts] =
    showFeatured && primary
      ? await Promise.all([
          provider.getFilters(family, primary.slug),
          provider.getParts({
            family,
            filters: selected,
            limit: FAMILY_GRID_SIZE,
          }),
        ])
      : [[], []];

  const activeCount = countActiveFilters(selected);
  const filters = (
    <ProductFilters
      groups={filterGroups}
      selected={selected}
      family={familySlugParam}
    />
  );

  return (
    <>
      <nav aria-label={t("categoriesAria")} className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={{
                  pathname: "/[family]/[category]",
                  params: { family: familySlugParam, category: category.slug },
                }}
                className="inline-block rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface"
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bij een gekozen bandenmaat staan de treffers al boven; een tweede
          lijst eronder leidt daar alleen van af. */}
      {showFeatured && (
        <div className="mt-12 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          {filterGroups.length > 0 && (
            <>
              {/* Mobiel uitklapbaar, zodat de producten bovenaan blijven */}
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

              <aside className="hidden w-64 shrink-0 lg:block">{filters}</aside>
            </>
          )}

          <div className="min-w-0 flex-1">
            {/* Geen merkenrij in tegels meer: het merkfilter staat in het
                paneel hiernaast en stond hier een tweede keer
                (@docs/DECISIONS.md #28). */}
            <h2 className="text-2xl">
              {activeCount > 0 ? t("filteredTitle") : t("featuredTitle")}
            </h2>
            <p className="mt-2 text-sm text-muted">
              {tFilters("resultCount", { count: parts.length })}
            </p>

            {parts.length === 0 ? (
              <p className="mt-6 max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
                {activeCount > 0 ? tFilters("noResults") : t(`${family}.empty`)}
              </p>
            ) : (
              <div className="mt-6">
                <ProductGrid parts={parts} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default async function FamilyPage({ params, searchParams }: Props) {
  const { locale, family: slug } = await params;
  setRequestLocale(locale);
  // De layout keurde de slug al; dit vangnet sluit het type af.
  const family = familyFromSlug(slug, locale);
  if (!family) notFound();

  const t = await getTranslations("family");
  const familyName = t(`${family}.title`);
  const tGuides = await getTranslations("guides");

  const query = await searchParams;
  const { oen, auto, breedte, hoogte, diameter, seizoen } = query;
  const searchTerm = (Array.isArray(oen) ? oen[0] : oen)?.trim();

  // De filters van de leverancier staan sinds 2026-10-12 ook op deze pagina
  // en niet pas op de categoriepagina; zie CategoryBrowse hierboven.
  const selected = parseFilterParam(query[FILTER_PARAM]);

  // Banden hebben een eigen ingang: de klant zoekt op de maat die op zijn
  // band staat, niet op een categorie.
  const tyreFamily = family === "banden";
  const tyreSize = tyreFamily
    ? parseTyreSize({ width: breedte, height: hoogte, diameter })
    : null;
  const tyreSeason = parseTyreSeason(seizoen);
  // Een seizoen zonder maat is een eigen pagina ("Winterbanden"), maar alleen
  // voor de seizoenen in SEASON_LANDINGS — zie tyre-size.ts.
  const seasonLanding =
    tyreFamily && !tyreSize && isSeasonLanding(tyreSeason) ? tyreSeason : null;
  // Het merk telt alleen bij een zoekopdracht op maat of seizoen: anders komt
  // de lijst uit een categorie en loopt het merk via `selected` hierboven.
  const tyreBrand =
    (tyreSize || seasonLanding) && query.merk ? query.merk : null;

  // Onderdelen komen uit de Wearparts-API: zoeken op naam kan altijd,
  // bladeren pas als er een auto gekozen is (docs/api/WEARPARTS.md).
  const vehicleCatalog = usesVehicleCatalog(family);
  const carId = /^[0-9]+$/.test(auto ?? "") ? Number(auto) : null;

  const formAction = getPathname({
    locale: locale as Locale,
    href: { pathname: "/[family]", params: { family: slug } },
  });

  return (
    <div className="site-container py-12 md:py-16">
      <p className="eyebrow text-sm">{t("eyebrow")}</p>
      <h1 className="mt-3 text-3xl md:text-4xl">
        {tyreSize
          ? t("sizeHeading", { size: formatTyreSize(tyreSize) })
          : seasonLanding
            ? t(`season.${seasonLanding}.heading`)
            : familyName}
      </h1>
      <p className="mt-4 max-w-xl text-muted">
        {tyreSize
          ? t("sizeIntro", { size: formatTyreSize(tyreSize) })
          : seasonLanding
            ? t(`season.${seasonLanding}.intro`)
            : t(`${family}.intro`)}
      </p>
      {/* De winterpagina en de gids over winterbanden wijzen naar elkaar
          (#37): wie twijfelt of hij ze nodig heeft, leest daar verder. */}
      {seasonLanding === "winter" && (
        <p className="mt-3 text-sm">
          <Link
            href={{
              pathname: "/guides/[guide]",
              params: {
                guide: guideSlug(guideByKey("winterTyres"), locale),
              },
            }}
            className="font-semibold underline decoration-caro-orange decoration-2 underline-offset-4"
          >
            {tGuides("winterTyres.title")} ›
          </Link>
        </p>
      )}

      {/* Banden: eerst de maat, dan pas categorieën. Wie banden koopt weet
          welke maat hij nodig heeft en niets anders. */}
      {tyreFamily && (
        <TyreSizePicker
          action={formAction}
          size={tyreSize}
          season={tyreSeason}
        />
      )}

      {/* Gangbare maten als gewone links, onder de kiezer. Ook mét een
          gekozen maat: van daaruit naar de volgende maat is één klik, en
          de maatpagina's linken zo onderling. */}
      {tyreFamily && (
        <div className="mt-8">
          <PopularTyreSizes />
        </div>
      )}

      {tyreSize && (
        <Suspense fallback={<GridFallback />}>
          <TyreResults
            family={family}
            familySlugParam={slug}
            size={tyreSize}
            season={tyreSeason}
            brand={tyreBrand}
          />
        </Suspense>
      )}

      {seasonLanding && (
        <Suspense fallback={<GridFallback />}>
          <SeasonResults
            family={family}
            familySlugParam={slug}
            season={seasonLanding}
            brand={tyreBrand}
          />
        </Suspense>
      )}

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

          {/* De boom hangt aan de auto: zonder gekozen voertuig kan de
              leverancier hem niet leveren, dus dan tonen we een uitnodiging
              in plaats van een lege rij. */}
          {carId ? (
            <Suspense fallback={<GroupsFallback />}>
              <PartGroups carId={carId} familySlugParam={slug} />
            </Suspense>
          ) : (
            <>
              <SelectedCarInUrl active />
              <p className="mt-8 max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
                {t("chooseCarToBrowse")}
              </p>
            </>
          )}

          {searchTerm && (
            <Suspense fallback={<GridFallback />}>
              <PartsSearchResults
                family={family}
                term={searchTerm}
                carId={carId}
              />
            </Suspense>
          )}
        </>
      ) : (
        <Suspense fallback={<GridFallback />}>
          <CategoryBrowse
            family={family}
            familySlugParam={slug}
            showFeatured={!tyreSize && !seasonLanding}
            selected={selected}
          />
        </Suspense>
      )}

      {/* Uitleg en vragen onderaan, na de producten. Een familiepagina
          bestaat verder uit namen en prijzen; zonder lopende tekst kan een
          zoekmachine niet zien waarvoor deze pagina bedoeld is. Onderaan,
          zodat de klant die weet wat hij zoekt er niet langs hoeft te
          scrollen.

          Bewust géén FAQPage-markering hier: die hoort bij een pagina wáár de
          vragen de hoofdinhoud zijn, en dat is /veelgestelde-vragen. Als
          gewone tekst leest een zoekmachine dit prima. */}
      <section className="mt-16 max-w-3xl border-t border-border pt-8">
        <h2 className="text-xl">
          {t("aboutTitle", { family: familyName.toLowerCase() })}
        </h2>
        <p className="mt-3 text-muted">{t(`${family}.about`)}</p>

        <h2 className="mt-10 text-xl">
          {t("faqTitle", { family: familyName.toLowerCase() })}
        </h2>
        <div className="mt-4">
          <FaqList
            items={FAQ_KEYS.map((key) => ({
              key,
              question: t(`${family}.faq.${key}.question`),
              answer: t(`${family}.faq.${key}.answer`),
            }))}
          />
        </div>
        <p className="mt-4 text-sm">
          <Link
            href="/faq"
            className="underline underline-offset-4 text-muted hover:text-foreground"
          >
            {t("faqMore")}
          </Link>
        </p>
      </section>
    </div>
  );
}
