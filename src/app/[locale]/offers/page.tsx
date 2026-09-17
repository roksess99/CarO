import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductGrid } from "@/components/product-grid";
import { getPathname, Link } from "@/i18n/navigation";
import { familySlug } from "@/lib/catalog/families";
import { offerParts } from "@/lib/discounts/offers";
import { localizedMetadata, socialMetadata } from "@/lib/site";

type Props = {
  params: Promise<{ locale: string }>;
};

const HREF = "/offers" as const;

/**
 * Vijf minuten, net als de homepage. De pagina wordt vooraf gebouwd — de
 * standaard van een uur zou betekenen dat een actie die de beheerder nu aanzet
 * pas over een uur op zijn eigen aanbiedingenpagina staat.
 */
export const revalidate = 300;

/**
 * Alles wat nu in de korting staat, op één pagina.
 *
 * Geen filters en geen paginering: zolang de eigenaar zijn acties zelf aanzet
 * zijn het er hooguit een paar tientallen. Loopt er niets, dan zegt de pagina
 * dat gewoon en wijst hij de klant door — een lege pagina met "binnenkort" is
 * een belofte die niemand heeft gedaan.
 */

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "offers" });
  const title = `${t("title")} — CarO`;
  const description = t("metaDescription");
  const path = getPathname({ locale, href: HREF });

  return {
    title,
    description,
    ...localizedMetadata(locale, (l) => getPathname({ locale: l, href: HREF })),
    ...socialMetadata({ locale, title, description, path }),
  };
}

export default async function OffersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("offers");
  const parts = await offerParts(48);

  return (
    <div className="site-container py-8 md:py-12">
      <h1 className="text-3xl md:text-4xl">{t("title")}</h1>
      <p className="mt-3 max-w-prose text-muted">{t("intro")}</p>

      <div className="mt-8">
        {parts.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-6">
            <p className="max-w-prose">{t("empty")}</p>
            <Link
              href={{
                pathname: "/[family]",
                params: { family: familySlug("onderdelen", locale) },
              }}
              className="mt-4 inline-flex rounded-md border border-border bg-background px-5 py-2.5 font-semibold hover:bg-surface"
            >
              {t("toAssortment")}
            </Link>
          </div>
        ) : (
          <ProductGrid parts={parts} />
        )}
      </div>
    </div>
  );
}
