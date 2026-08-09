import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductGrid } from "@/components/product-grid";
import { VehicleSearch } from "@/components/vehicle/vehicle-search";
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
};

// TODO: echte domeinnaam zodra hosting vaststaat (docs/DECISIONS.md #2)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: `/${locale}`,
      languages: { nl: "/nl", en: "/en" },
    },
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tFamily = await getTranslations("family");

  const provider = getCatalogProvider();
  const families: { family: ProductFamily; parts: Part[] }[] = await Promise.all(
    PRODUCT_FAMILIES.map(async (family) => ({
      family,
      parts: await provider.getParts({ family, limit: 4 }),
    })),
  );

  return (
    <>
      <section className="site-container py-16 md:py-24">
        <p className="eyebrow text-sm">{t("eyebrow")}</p>
        <h1 className="mt-3 max-w-2xl text-4xl md:text-5xl">{t("title")}</h1>
        <p className="mt-4 max-w-xl text-muted">{t("intro")}</p>
        {/* Kentekenzoeker staat vóór de families: hiermee begint de klant */}
        <div className="mt-8 max-w-lg">
          <VehicleSearch />
        </div>
      </section>

      {/* Eén blok per familie: het onderscheid onderdelen/banden is
          meteen op de homepage zichtbaar */}
      {families.map(({ family, parts }) => (
        <section
          key={family}
          id={familySlug(family, locale)}
          className="site-container pb-16 md:pb-24"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h2 className="text-2xl">{tFamily(`${family}.title`)}</h2>
              <p className="mt-2 max-w-xl text-muted">
                {tFamily(`${family}.intro`)}
              </p>
            </div>
            <Link
              href={{
                pathname: "/[family]",
                params: { family: familySlug(family, locale) },
              }}
              className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface"
            >
              {tFamily("viewAll")}
            </Link>
          </div>

          <div className="mt-6">
            {parts.length === 0 ? (
              <p className="max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
                {tFamily(`${family}.empty`)}
              </p>
            ) : (
              <ProductGrid parts={parts} />
            )}
          </div>
        </section>
      ))}
    </>
  );
}
