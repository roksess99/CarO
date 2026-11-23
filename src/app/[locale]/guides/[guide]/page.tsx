import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getFormatter,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { PopularTyreSizes } from "@/components/tyres/popular-tyre-sizes";
import { TyreSizePicker } from "@/components/tyres/tyre-size-picker";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { familySlug } from "@/lib/catalog/families";
import {
  GUIDES,
  guideBySlug,
  guideSlug,
  type Guide,
} from "@/lib/guides";
import {
  SITE_NAME,
  SITE_URL,
  breadcrumbJsonLd,
  localizedMetadata,
  socialMetadata,
} from "@/lib/site";

type Props = {
  params: Promise<{ locale: string; guide: string }>;
};

/**
 * Eén blok tekst van een gids, zoals het in messages/ staat. Een array en
 * geen losse sleutels: de gidsen hebben elk een eigen aantal alinea's, en zo
 * bepaalt de tekst zijn eigen lengte in plaats van een lijst hier.
 */
interface GuideSection {
  heading: string;
  paragraphs?: string[];
  table?: { caption: string; columns: string[]; rows: string[][] };
  /** Alinea's ná de tabel */
  notes?: string[];
}

// Alleen de gidsen die bestaan; een onbekende slug is een echte 404.
export const dynamicParams = false;

export function generateStaticParams({
  params,
}: {
  params: { locale: string };
}) {
  return GUIDES.map((guide) => ({ guide: guideSlug(guide, params.locale) }));
}

function guidePath(guide: Guide, locale: Locale): string {
  return getPathname({
    locale,
    href: {
      pathname: "/guides/[guide]",
      params: { guide: guideSlug(guide, locale) },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, guide: slug } = await params;
  const guide = guideBySlug(slug, locale);
  if (!guide) return {};

  const t = await getTranslations({ locale, namespace: "guides" });
  const title = `${t(`${guide.key}.metaTitle`)} — ${SITE_NAME}`;
  const description = t(`${guide.key}.metaDescription`);

  return {
    title,
    description,
    ...localizedMetadata(locale, (l) => guidePath(guide, l)),
    ...socialMetadata({
      locale,
      title,
      description,
      path: guidePath(guide, locale as Locale),
    }),
  };
}

export default async function GuidePage({ params }: Props) {
  const { locale, guide: slug } = await params;
  const guide = guideBySlug(slug, locale);
  if (!guide) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("guides");
  const format = await getFormatter();
  const sections = t.raw(`${guide.key}.sections`) as GuideSection[];
  const title = t(`${guide.key}.title`);
  const path = guidePath(guide, locale as Locale);
  const guidesPath = getPathname({ locale: locale as Locale, href: "/guides" });

  const tyresAction = getPathname({
    locale: locale as Locale,
    href: {
      pathname: "/[family]",
      params: { family: familySlug("banden", locale) },
    },
  });

  // Dezelfde tekst als op de pagina, in de vorm die een zoekmachine leest.
  // De auteur is de winkel en geen persoon: de eigenaar staat bewust niet met
  // naam op de site (#37).
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: t(`${guide.key}.metaDescription`),
    inLanguage: locale,
    dateModified: guide.updated,
    mainEntityOfPage: `${SITE_URL}${path}`,
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      logo: `${SITE_URL}/brand/caro-profiel-512.png`,
    },
  };

  const others = GUIDES.filter((other) => other.key !== guide.key);

  return (
    <div className="site-container max-w-3xl py-8 md:py-12">
      <JsonLd data={article} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: t("breadcrumbHome"), path: `/${locale}` },
          { name: t("indexTitle"), path: guidesPath },
          { name: title, path },
        ])}
      />

      <nav aria-label={t("breadcrumbAria")}>
        <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <li>
            <Link href="/" className="hover:text-foreground">
              {t("breadcrumbHome")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/guides" className="hover:text-foreground">
              {t("indexTitle")}
            </Link>
          </li>
        </ol>
      </nav>

      <h1 className="mt-6 text-3xl md:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted">
        {t("updated", {
          date: format.dateTime(new Date(guide.updated), { dateStyle: "long" }),
        })}
      </p>
      <p className="mt-4 text-lg">{t(`${guide.key}.intro`)}</p>

      <div className="mt-10 space-y-10">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-xl md:text-2xl">{section.heading}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-3 max-w-prose">
                {paragraph}
              </p>
            ))}
            {section.table && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-start text-sm">
                  <caption className="sr-only">{section.table.caption}</caption>
                  <thead className="bg-surface">
                    <tr>
                      {section.table.columns.map((column) => (
                        <th
                          key={column}
                          scope="col"
                          className="px-3 py-2 text-start font-semibold"
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row) => (
                      <tr key={row.join("|")} className="border-t border-border">
                        {row.map((cell, index) =>
                          index === 0 ? (
                            <th
                              key={cell}
                              scope="row"
                              className="px-3 py-2 text-start font-semibold tabular-nums"
                            >
                              {cell}
                            </th>
                          ) : (
                            <td key={cell} className="px-3 py-2 tabular-nums">
                              {cell}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {section.notes?.map((note) => (
              <p key={note} className="mt-3 max-w-prose">
                {note}
              </p>
            ))}
          </section>
        ))}
      </div>

      {/* De plek in de winkel waar de lezer het antwoord gebruikt. Zonder dit
          is een gids een eindpunt; mét is hij de ingang naar de maatkiezer
          of de autokeuze. */}
      {guide.key === "tyreSize" && (
        <>
          <TyreSizePicker
            action={tyresAction}
            size={null}
            season={null}
            guideLink={false}
          />
          <div className="mt-10">
            <PopularTyreSizes />
          </div>
        </>
      )}
      {guide.key === "winterTyres" && (
        <>
          <TyreSizePicker action={tyresAction} size={null} season="winter" />
          <p className="mt-4 text-sm">
            <Link
              href={{
                pathname: "/[family]",
                params: { family: familySlug("banden", locale) },
                query: { seizoen: "winter" },
              }}
              className="font-semibold underline decoration-caro-orange decoration-2 underline-offset-4"
            >
              {t("winterTyres.allLink")} ›
            </Link>
          </p>
        </>
      )}
      {guide.key === "engineOil" && (
        <section className="mt-10 rounded-xl border border-border p-4 md:p-6">
          <h2 className="text-lg">{t("engineOil.ctaTitle")}</h2>
          <p className="mt-2 max-w-prose text-muted">{t("engineOil.ctaBody")}</p>
          <Link
            href="/my-car"
            className="mt-4 inline-flex rounded-md bg-caro-orange px-5 py-2.5 font-semibold text-caro-ink"
          >
            {t("engineOil.ctaButton")}
          </Link>
        </section>
      )}

      <section className="mt-12 border-t border-border pt-8">
        <h2 className="text-lg">{t("moreTitle")}</h2>
        <ul className="mt-3 space-y-2">
          {others.map((other) => (
            <li key={other.key}>
              <Link
                href={{
                  pathname: "/guides/[guide]",
                  params: { guide: guideSlug(other, locale) },
                }}
                className="underline decoration-caro-orange decoration-2 underline-offset-4"
              >
                {t(`${other.key}.title`)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

