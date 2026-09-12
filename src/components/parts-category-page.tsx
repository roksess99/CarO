import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { GroupList } from "@/components/catalog/group-list";
import { JsonLd } from "@/components/json-ld";
import { LoadMore } from "@/components/load-more";
import { ProductGrid } from "@/components/product-grid";
import { SelectedCarInUrl } from "@/components/vehicle/use-selected-car";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { ProductFamily } from "@/lib/catalog/families";
import {
  groupIdFromSlug,
  partGroupById,
  partLeafGroups,
  partsInGroup,
} from "@/lib/catalog/wearparts-provider";
import { breadcrumbJsonLd } from "@/lib/site";

/** Artikelen per stap; "meer laden" telt hier telkens bij op */
const PAGE_SIZE = 20;

/**
 * Categoriepagina voor onderdelen.
 *
 * Apart van de gewone categoriepagina omdat de Wearparts-API anders werkt:
 * de categorieboom hangt aan een TecDoc-voertuig, dus zonder `auto` in de
 * URL valt er niets te tonen. De boom is bovendien dieper dan bij banden —
 * "Remsysteem" heeft subgroepen als "Remschijf" en "Remblokken".
 */
export async function PartsCategoryPage({
  family,
  familySlugParam,
  categorySlug,
  carId,
  limit,
  showAllTypes,
}: {
  family: ProductFamily;
  familySlugParam: string;
  categorySlug: string;
  carId: number | null;
  limit: number;
  /** Ook de bijbehorende schroefjes en ringen tonen, niet alleen het product */
  showAllTypes: boolean;
}) {
  const t = await getTranslations("category");
  const tFamily = await getTranslations("family");
  const tFilters = await getTranslations("filters");
  const locale = (await getLocale()) as Locale;

  const groupId = groupIdFromSlug(categorySlug);
  if (groupId === null) notFound();

  if (!carId) {
    return (
      <div className="site-container py-8 md:py-12">
        <SelectedCarInUrl active />
        <h1 className="mt-6 text-3xl md:text-4xl">
          {tFamily("onderdelen.title")}
        </h1>
        <p className="mt-8 max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
          {tFamily("chooseCarToBrowse")}
        </p>
        <Link
          href={{ pathname: "/[family]", params: { family: familySlugParam } }}
          className="mt-6 inline-flex rounded-md bg-caro-orange px-5 py-2.5 font-semibold text-caro-ink"
        >
          {tFamily("viewAll")}
        </Link>
      </div>
    );
  }

  // De groep zelf kan op elk niveau zitten ("Remsysteem" of "Remblok"), dus
  // zoeken we hem op in de hele boom in plaats van alleen bij de hoofdgroepen.
  //
  // `partLeafGroups` slaat de tussenniveaus over en geeft meteen de eindgroepen
  // die artikelen hébben. Voorheen stond hier `partGroups(carId, groupId)`:
  // één niveau dieper, inclusief lege takken. Een klant klikte zo vier keer om
  // bij een artikel te komen, of belandde op een lege pagina.
  const [current, sections] = await Promise.all([
    partGroupById(carId, groupId),
    partLeafGroups(carId, groupId),
  ]);
  if (!current) notFound();
  const name = current.name;

  // Artikelen horen bij een eindgroep. Een groep met subgroepen kun je niet
  // bevragen — GEMETEN: /articles geeft daar HTTP 500 op — dus dan tonen we
  // de eindgroepen, en als die er geen van allen zijn een eerlijke melding.
  const showArticles = !current.hasChildren;

  // Standaard alleen het soort waar de groep over gaat. GEMETEN: "Oliefilter"
  // bevat 125 artikelen waarvan 65 echte filters; de afsluitschroeven en
  // afdichtringen stonden bovenaan, zodat je veertien rijen moest scrollen
  // voor het eerste filter. Wie ze tóch zoekt klikt "alles tonen".
  const typeFilter =
    showAllTypes || !current.defaultGenericArticleId
      ? undefined
      : current.defaultGenericArticleId;

  const { parts, total } = showArticles
    ? await partsInGroup({
        carId,
        categoryId: groupId,
        categorySlug,
        categoryName: name,
        genericArticleId: typeFilter,
        limit,
      })
    : { parts: [], total: 0 };

  const query = { auto: String(carId) };

  // Zelfde stappen als het zichtbare kruimelpad hieronder. De paden dragen
  // geen `?auto=`: dat is de auto van déze bezoeker, niet van de pagina.
  const breadcrumbs = breadcrumbJsonLd([
    { name: t("breadcrumbHome"), path: `/${locale}` },
    {
      name: tFamily(`${family}.title`),
      path: getPathname({
        locale,
        href: { pathname: "/[family]", params: { family: familySlugParam } },
      }),
    },
    {
      name,
      path: getPathname({
        locale,
        href: {
          pathname: "/[family]/[category]",
          params: { family: familySlugParam, category: categorySlug },
        },
      }),
    },
  ]);

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
              href={{
                pathname: "/[family]",
                params: { family: familySlugParam },
                query,
              }}
              className="hover:text-foreground"
            >
              {tFamily(`${family}.title`)}
            </Link>
          </li>
        </ol>
      </nav>

      <h1 className="mt-6 text-3xl md:text-4xl">{name}</h1>

      {/* Korte inleiding: een pagina met alleen een raster van artikelen zegt
          een zoekmachine niets over waar hij over gaat. */}
      <p className="mt-3 max-w-2xl text-muted">
        {t("introParts", { category: name })}
      </p>

      {sections.length > 0 && (
        <nav aria-label={t("siblingsAria")} className="mt-6 space-y-8">
          {sections.map((section) => (
            <div key={section.title || "root"}>
              {/* Kop alleen als de eindgroepen onder een tussengroep hingen;
                  hangen ze direct onder deze categorie, dan staat de <h1> er
                  al boven en zou een kop hem verdubbelen. */}
              {section.title && (
                <h2 className="mb-3 text-sm font-semibold text-muted">
                  {section.title}
                </h2>
              )}
              <GroupList
                groups={section.groups}
                familySlugParam={familySlugParam}
                carId={carId}
              />
            </div>
          ))}
        </nav>
      )}

      {!showArticles && sections.length === 0 && (
        <p className="mt-8 max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
          {t("noParts")}
        </p>
      )}

      {showArticles &&
        (parts.length === 0 ? (
          // Deze groep hoort niet meer in een lijst te staan (lege groepen
          // filteren we weg), maar een oude link of een bladwijzer komt hier
          // nog uit. Dan liever een wegwijzer dan "0 resultaten".
          <p className="mt-8 max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
            {t("noParts")}
          </p>
        ) : (
          <>
            <p className="mt-8 flex flex-wrap items-baseline gap-x-3 text-sm text-muted">
              <span>{tFilters("resultCount", { count: parts.length })}</span>
              {/* Alleen aanbieden als er écht iets verborgen is */}
              {typeFilter && (
                <Link
                  href={{
                    pathname: "/[family]/[category]",
                    params: {
                      family: familySlugParam,
                      category: categorySlug,
                    },
                    query: { ...query, alles: "1" },
                  }}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {t("showAllTypes")}
                </Link>
              )}
              {showAllTypes && current.defaultGenericArticleId && (
                <Link
                  href={{
                    pathname: "/[family]/[category]",
                    params: {
                      family: familySlugParam,
                      category: categorySlug,
                    },
                    query,
                  }}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {t("onlyThisType", { type: name })}
                </Link>
              )}
            </p>
            <div className="mt-4">
              <ProductGrid parts={parts} />
            </div>
          </>
        ))}

      {parts.length < total && (
        <LoadMore
          href={{
            pathname: "/[family]/[category]",
            params: { family: familySlugParam, category: categorySlug },
            query: { ...query, toon: String(limit + PAGE_SIZE) },
          }}
          label={tFilters("loadMore", { count: PAGE_SIZE })}
          busyLabel={tFilters("loadMoreBusy")}
        />
      )}
    </div>
  );
}
