import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname, Link } from "@/i18n/navigation";
import { GUIDES, guideSlug } from "@/lib/guides";
import { SITE_NAME, localizedMetadata, socialMetadata } from "@/lib/site";

type Props = {
  params: Promise<{ locale: string }>;
};

const HREF = "/guides" as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "guides" });
  const title = `${t("indexMetaTitle")} — ${SITE_NAME}`;
  const description = t("indexMetaDescription");
  const path = getPathname({ locale, href: HREF });

  return {
    title,
    description,
    ...localizedMetadata(locale, (l) => getPathname({ locale: l, href: HREF })),
    ...socialMetadata({ locale, title, description, path }),
  };
}

/**
 * Overzicht van de gidsen. Klein, maar het is de plek waar ze vanuit de
 * footer samenkomen, en voor een zoekmachine de weg naar elke gids.
 */
export default async function GuidesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guides");

  return (
    <div className="site-container max-w-3xl py-10 md:py-16">
      <h1 className="text-3xl md:text-4xl">{t("indexTitle")}</h1>
      <p className="mt-4 text-muted">{t("indexIntro")}</p>

      <ul className="mt-8 space-y-4">
        {GUIDES.map((guide) => (
          <li key={guide.key}>
            <Link
              href={{
                pathname: "/guides/[guide]",
                params: { guide: guideSlug(guide, locale) },
              }}
              className="block rounded-lg border border-border bg-surface p-5 hover:border-caro-orange"
            >
              <h2 className="text-lg">{t(`${guide.key}.title`)}</h2>
              <p className="mt-2 text-sm text-muted">
                {t(`${guide.key}.metaDescription`)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
