import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GroupList } from "@/components/catalog/group-list";
import { FaqList } from "@/components/faq-list";
import { ProductGrid } from "@/components/product-grid";
import { TyreSizePicker } from "@/components/tyres/tyre-size-picker";
import { SelectedCarInUrl } from "@/components/vehicle/use-selected-car";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  familyFromSlug,
  familySlug,
  PRODUCT_FAMILIES,
  type ProductFamily,
  usesVehicleCatalog,
} from "@/lib/catalog/families";
import { localizeCategories } from "@/lib/catalog/localized-categories";
import { getCatalogProvider } from "@/lib/catalog/provider";
import {
  filterTyres,
  formatTyreSize,
  parseTyreSeason,
  parseTyreSize,
  type TyreSeason,
  type TyreSize,
  tyreSearchTerm,
} from "@/lib/catalog/tyre-size";
import {
  partGroupsWithCounts,
  popularPartGroups,
  searchParts,
} from "@/lib/catalog/wearparts-provider";
import { localizedMetadata, socialMetadata } from "@/lib/site";

type Props = {
  params: Promise<{ locale: string; family: string }>;
  searchParams: Promise<{
    oen?: string | string[];
    auto?: string;
    breedte?: string;
    hoogte?: string;
    diameter?: string;
    seizoen?: string;
  }>;
};

/** Artikelen per zoekopdracht of categorie */
const PAGE_SIZE = 20;

/** Vragen per familie, in vaste volgorde (teksten in messages/) */
const FAQ_KEYS = ["q1", "q2", "q3"] as const;

/**
 * Banden halen we iets ruimer op dan we tonen. De zoekfunctie van de
 * leverancier is op de maat verrassend nauwkeurig (gemeten: 60 van de 60
 * treffers in de gevraagde maat), maar wij rekenen het na op het maatblok
 * van het artikel — die marge vangt op wat daarbij afvalt.
 */
const TYRE_FETCH_SIZE = 30;

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

  const localizedHref = (targetLocale: Locale) =>
    getPathname({
      locale: targetLocale,
      href: {
        pathname: "/[family]",
        params: { family: familySlug(family, targetLocale) },
      },
    });
  const title = `${t(`${family}.title`)} — CarO`;

  return {
    title,
    description: t(`${family}.intro`),
    ...localizedMetadata(locale, localizedHref),
    ...socialMetadata({
      locale,
      title,
      description: t(`${family}.intro`),
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

/** Banden in de gekozen maat */
async function TyreResults({
  family,
  size,
  season,
}: {
  family: ProductFamily;
  size: TyreSize;
  season: TyreSeason | null;
}) {
  const tTyres = await getTranslations("tyres");
  const tyres = filterTyres(
    await getCatalogProvider().getParts({
      family,
      search: tyreSearchTerm(size, season),
      limit: TYRE_FETCH_SIZE,
    }),
    size,
    season,
  ).slice(0, PAGE_SIZE);

  return (
    <section className="mt-10">
      <h2 className="text-2xl">
        {tTyres("results", { size: formatTyreSize(size) })}
      </h2>
      {tyres.length === 0 ? (
        <p className="mt-6 max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
          {tTyres("noResults", { size: formatTyreSize(size) })}
        </p>
      ) : (
        <div className="mt-6">
          <ProductGrid parts={tyres} />
        </div>
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

/** Categorieknoppen en een uitgelichte rij, voor de families zonder auto */
async function CategoryBrowse({
  family,
  familySlugParam,
  showFeatured,
}: {
  family: ProductFamily;
  familySlugParam: string;
  showFeatured: boolean;
}) {
  const t = await getTranslations("family");
  const provider = getCatalogProvider();
  const [categories, parts] = await Promise.all([
    provider.getCategories(family).then(localizeCategories),
    provider.getParts({ family, limit: 8 }),
  ]);

  if (categories.length === 0) {
    // Eerlijke lege staat: geen verzonnen producten als er geen bron is
    return (
      <p className="mt-10 max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
        {t(`${family}.empty`)}
      </p>
    );
  }

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

      {/* Alleen tonen als er echt iets is: de eerste categorie van een
          familie kan leeg zijn of (bij Tyre24) een 500 geven. Bij een
          gekozen bandenmaat staan de treffers al boven; een blok
          "veelgekocht" eronder leidt daar alleen van af. */}
      {showFeatured && parts.length > 0 && (
        <>
          <h2 className="mt-12 text-2xl">{t("featuredTitle")}</h2>
          <div className="mt-6">
            <ProductGrid parts={parts} />
          </div>
        </>
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

  const { oen, auto, breedte, hoogte, diameter, seizoen } = await searchParams;
  const searchTerm = (Array.isArray(oen) ? oen[0] : oen)?.trim();

  // Banden hebben een eigen ingang: de klant zoekt op de maat die op zijn
  // band staat, niet op een categorie.
  const tyreFamily = family === "banden";
  const tyreSize = tyreFamily
    ? parseTyreSize({ width: breedte, height: hoogte, diameter })
    : null;
  const tyreSeason = parseTyreSeason(seizoen);

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
      <h1 className="mt-3 text-3xl md:text-4xl">{familyName}</h1>
      <p className="mt-4 max-w-xl text-muted">{t(`${family}.intro`)}</p>

      {/* Banden: eerst de maat, dan pas categorieën. Wie banden koopt weet
          welke maat hij nodig heeft en niets anders. */}
      {tyreFamily && (
        <TyreSizePicker
          action={formAction}
          size={tyreSize}
          season={tyreSeason}
        />
      )}

      {tyreSize && (
        <Suspense fallback={<GridFallback />}>
          <TyreResults family={family} size={tyreSize} season={tyreSeason} />
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
            showFeatured={!tyreSize}
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
