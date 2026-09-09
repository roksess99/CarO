import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryGrid } from "@/components/home/category-grid";
import { Hero } from "@/components/home/hero";
import { ProductGrid } from "@/components/product-grid";
import { Link } from "@/i18n/navigation";
import { familySlug, PRODUCT_FAMILIES } from "@/lib/catalog/families";
import { getCatalogProvider } from "@/lib/catalog/provider";
import { localizedMetadata, socialMetadata } from "@/lib/site";

type Props = {
  params: Promise<{ locale: string }>;
};

/** Aantal artikelen per familie in de uitgelichte rijen */
const PER_FAMILY = 4;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    ...localizedMetadata(locale, (l) => `/${l}`),
    ...socialMetadata({
      locale,
      title: t("metaTitle"),
      description: t("metaDescription"),
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
 * Uitgelichte rijen, apart zodat ze de hero niet ophouden.
 *
 * De hero is het grootste element boven de vouw en dus de LCP. Die haalt zijn
 * tekst uit de vertalingen en heeft geen catalogus nodig; deze rijen doen vier
 * API-calls. Stonden ze in dezelfde component, dan wachtte de eerste
 * schilderbeurt op de leverancier.
 */
async function FeaturedRows({ locale }: { locale: string }) {
  const tFamily = await getTranslations("family");

  // Eén rij per familie. De calls lopen parallel en zijn gecacht (300s in
  // de provider), dus dit kost één ronde API-verkeer, niet vier. Families
  // zonder bladerbaar aanbod — onderdelen zoekt alleen op OE-nummer —
  // leveren een lege lijst en vallen vanzelf weg.
  const provider = getCatalogProvider();
  const rows = await Promise.all(
    PRODUCT_FAMILIES.map(async (family) => ({
      family,
      parts: await provider.getParts({ family, limit: PER_FAMILY }),
    })),
  );
  const featuredRows = rows.filter((row) => row.parts.length > 0);

  return (
    <>
      {/* Geen tekstuele familielijst meer: het categorieraster hierboven
          toont dezelfde vier families mét foto en uitklapbare categorieën. */}
      {featuredRows.map(({ family, parts }) => (
        <section key={family} className="site-container pb-16 md:pb-24">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-2xl">{tFamily(`${family}.title`)}</h2>
            <Link
              href={{
                pathname: "/[family]",
                params: { family: familySlug(family, locale) },
              }}
              // Drie keer "Alles bekijken" naar drie verschillende pagina's
              // is voor een schermlezer niet uit elkaar te houden; het
              // aria-label maakt het doel expliciet.
              aria-label={tFamily("viewAllOf", {
                family: tFamily(`${family}.title`),
              })}
              className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface"
            >
              {tFamily("viewAll")}
            </Link>
          </div>
          <div className="mt-6">
            <ProductGrid parts={parts} />
          </div>
        </section>
      ))}
    </>
  );
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero />

      <Suspense fallback={<RowsFallback />}>
        <CategoryGrid />
      </Suspense>

      <Suspense fallback={<RowsFallback />}>
        <FeaturedRows locale={locale} />
      </Suspense>
    </>
  );
}
