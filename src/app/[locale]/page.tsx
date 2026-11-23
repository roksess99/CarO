import type { Metadata } from "next";
import { type ComponentProps, Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryGrid } from "@/components/home/category-grid";
import { Hero } from "@/components/home/hero";
import { HomeAbout } from "@/components/home/home-about";
import { PopularMakes } from "@/components/home/popular-makes";
import { PopularParts } from "@/components/home/popular-parts";
import { JsonLd } from "@/components/json-ld";
import { ProductGrid } from "@/components/product-grid";
import { ReviewStrip } from "@/components/reviews/review-strip";
import { PopularTyreSizes } from "@/components/tyres/popular-tyre-sizes";
import { Link } from "@/i18n/navigation";
import { familySlug } from "@/lib/catalog/families";
import {
  HOME_TYRE_SIZE,
  tyreSizeQuery,
} from "@/lib/catalog/popular-tyre-sizes";
import { getCatalogProvider } from "@/lib/catalog/provider";
import {
  filterTyres,
  formatTyreSize,
  TYRE_FETCH_SIZE,
  tyreSearchTerm,
} from "@/lib/catalog/tyre-size";
import type { Part } from "@/lib/catalog/types";
import { offerParts } from "@/lib/discounts/offers";
import { formatPriceCents } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping";
import {
  SITE_NAME,
  localizedMetadata,
  organizationJsonLd,
  socialMetadata,
} from "@/lib/site";

type Props = {
  params: Promise<{ locale: string }>;
};

/** Aantal artikelen per productrij: één rij van vier op desktop */
const ROW_SIZE = 4;

/**
 * Hoogstens een dag oud. De seizoenslink onder de bandenmaten volgt de datum
 * (`seasonLinksForDate`), en zonder bovengrens bleef een pagina die geen
 * enkele fetch doet — de mockbuild — staan op de dag van de bouw. Live houdt
 * de cache van de leverancier hem al korter; dit kost dus geen verzoek extra.
 */
export const revalidate = 86400;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  // De naam als parameter en niet in de vertaling: hij staat op één plek
  // (COMPANY.name, zie CLAUDE.md). Hier stond hij nog letterlijk in
  // messages/, de laatste plek waar dat zo was.
  const title = t("metaTitle", { site: SITE_NAME });
  const description = t("metaDescription", {
    amount: formatPriceCents(FREE_SHIPPING_THRESHOLD_CENTS),
  });

  return {
    title,
    description,
    ...localizedMetadata(locale, (l) => `/${l}`),
    ...socialMetadata({
      locale,
      title,
      description,
      path: `/${locale}`,
    }),
  };
}

/** Plaatshouder met dezelfde hoogte als een rij, zodat er niets verspringt */
function RowsFallback() {
  return (
    <div className="site-container pb-16 md:pb-24" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded bg-surface" />
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
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

/**
 * Eén productrij met een kop en een link naar het hele aanbod erachter.
 * De linktekst noemt het doel zelf ("Alle banden in 205/55 R16"), dus een
 * schermlezer hoeft niet te raden waar "Alles bekijken" heen gaat.
 */
function ProductRow({
  title,
  parts,
  href,
  linkLabel,
}: {
  title: string;
  parts: Part[];
  href: ComponentProps<typeof Link>["href"];
  linkLabel: string;
}) {
  return (
    <section className="site-container pb-16 md:pb-24">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-2xl">{title}</h2>
        <Link
          href={href}
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface"
        >
          {linkLabel}
        </Link>
      </div>
      <div className="mt-6">
        <ProductGrid parts={parts} />
      </div>
    </section>
  );
}

/**
 * De productrijen: wat er nu in de aanbieding is, en banden in de gangbaarste
 * maat. Apart van de hero, zodat die niet op de leverancier wacht.
 *
 * **Tot 2026-11-23 stond hier één rij per familie**, met de eerste vier
 * artikelen van de eerste categorie. Op de live winkel betekende dat
 * Duitstalige toebehoren ("Madenschraube", "Inbusschlüssel") en stalen velgen
 * voor een Daewoo Leganza — geen etalage, maar wat de leverancier toevallig
 * vooraan had staan. Onderdelen vielen er sowieso uit: die zijn zonder auto
 * niet te bladeren (@docs/DECISIONS.md #7, #36).
 *
 * Wat er nu staat kost minder, niet meer: de aanbiedingen komen uit dezelfde
 * lijst en hetzelfde geheugen als de carrousel in de hero, en de bandenrij is
 * exact de aanroep van de maatpagina (`TYRE_FETCH_SIZE`), die de crawler en
 * de link in "Populaire bandenmaten" toch al warm houden. Eén verzoek in
 * plaats van vier.
 */
async function HomeRows({ locale }: { locale: string }) {
  const tInfo = await getTranslations("homeInfo");
  const tTyres = await getTranslations("tyres");
  const size = HOME_TYRE_SIZE;

  const [offers, tyres] = await Promise.all([
    offerParts(ROW_SIZE),
    getCatalogProvider()
      .getParts({
        family: "banden",
        search: tyreSearchTerm(size, null),
        limit: TYRE_FETCH_SIZE,
      })
      .then((parts) => filterTyres(parts, size, null).slice(0, ROW_SIZE)),
  ]);

  return (
    <>
      {/* Zonder lopende actie geen rij: een lege etalage met "binnenkort"
          verkoopt niets (#14). */}
      {offers.length > 0 && (
        <ProductRow
          title={tInfo("offersTitle")}
          parts={offers}
          href="/offers"
          linkLabel={tInfo("offersAll")}
        />
      )}
      {tyres.length > 0 && (
        <ProductRow
          title={tTyres("results", { size: formatTyreSize(size) })}
          parts={tyres}
          href={{
            pathname: "/[family]",
            params: { family: familySlug("banden", locale) },
            query: tyreSizeQuery(size),
          }}
          linkLabel={tInfo("tyresAll", { size: formatTyreSize(size) })}
        />
      )}
    </>
  );
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // De volgorde is afgezet tegen Autodoc en Winparts (bekeken 2026-11-23,
  // @docs/DECISIONS.md #36). Bij allebei: zoekpaneel op kenteken, dan meteen
  // onderdelen op het oog, dan de productgroepen, dan merken — en pas daarna
  // producten en onderaan de tekst. Wij volgen dat, met één verschil: geen
  // reclamebanner in de hero zolang er geen echte actie loopt.
  //
  // Geen van de blokken boven de productrijen kost een verzoek bij de
  // leverancier: lijsten en foto's staan in de code. Ze staan dus meteen in
  // de HTML, zonder Suspense.
  return (
    <>
      <JsonLd data={organizationJsonLd(locale)} />

      <Hero />

      <PopularParts />

      {/* Bewust zonder <Suspense>: het raster wacht nergens op. Met de grens
          eromheen stond het in de HTML ná de footer en werd het pas door
          een script op zijn plek gezet — de koppen in de broncode stonden
          zo in de verkeerde volgorde (#36). */}
      <CategoryGrid />

      {/* Bandenmaten en automerken naast elkaar: de twee andere ingangen
          dan het kenteken, allebei een rij korte links. */}
      <section className="site-container pb-12 md:pb-16">
        <div className="grid gap-8 rounded-xl border border-border p-4 sm:p-6 md:p-8 lg:grid-cols-2 lg:gap-12">
          <PopularTyreSizes />
          <PopularMakes />
        </div>
      </section>

      {/* Zonder beoordelingen rendert dit niets, dus geen plaatshouder: een
          strook die "nog geen beoordelingen" zegt verkoopt niets. */}
      <Suspense fallback={null}>
        <ReviewStrip />
      </Suspense>

      <Suspense fallback={<RowsFallback />}>
        <HomeRows locale={locale} />
      </Suspense>

      <HomeAbout />
    </>
  );
}
