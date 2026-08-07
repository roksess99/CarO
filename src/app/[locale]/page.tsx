import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductGrid } from "@/components/product-grid";
import { VehicleSearch } from "@/components/vehicle/vehicle-search";
import { getCatalogProvider } from "@/lib/catalog/provider";

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
  const parts = await getCatalogProvider().getParts({ limit: 8 });

  return (
    <>
      <section className="site-container py-16 md:py-24">
        <p className="eyebrow text-sm">{t("eyebrow")}</p>
        <h1 className="mt-3 max-w-2xl text-4xl md:text-5xl">{t("title")}</h1>
        <p className="mt-4 max-w-xl text-muted">{t("intro")}</p>
        {/* Kentekenzoeker staat vóór de CTA: dit is waarmee de klant begint */}
        <div className="mt-8 max-w-lg">
          <VehicleSearch />
        </div>
        <a
          href="#aanbod"
          className="mt-8 inline-block rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink"
        >
          {t("cta")}
        </a>
      </section>

      <section id="aanbod" className="site-container pb-16 md:pb-24">
        <h2 className="text-2xl">{t("featuredTitle")}</h2>
        <div className="mt-6">
          <ProductGrid parts={parts} />
        </div>
      </section>
    </>
  );
}
