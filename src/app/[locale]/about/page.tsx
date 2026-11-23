import type { ComponentProps } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CompanyDetails } from "@/components/company-details";
import { JsonLd } from "@/components/json-ld";
import { getPathname, Link } from "@/i18n/navigation";
import { COMPANY } from "@/lib/company";
import { priceInSentence } from "@/lib/format";
import { guideByKey, guideSlug } from "@/lib/guides";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  STANDARD_SHIPPING_CENTS,
} from "@/lib/shipping";
import {
  SITE_NAME,
  SITE_URL,
  localizedMetadata,
  organizationJsonLd,
  socialMetadata,
} from "@/lib/site";

type Props = {
  params: Promise<{ locale: string }>;
};

const HREF = "/about" as const;

/**
 * Wie de winkel is en hoe hij werkt (docs/DECISIONS.md #37).
 *
 * **Alleen wat aantoonbaar is.** Elke zin hier staat ergens in de code of in
 * DECISIONS: de groothandel bezorgt rechtstreeks (#4), prijs en voorraad komen
 * van dezelfde groothandel (#22), de leverdatum is de zijne (#27), beoordelingen
 * komen alleen van echte bestellingen (#18). Wat er níet staat, met reden:
 *
 * - **geen land van herkomst** — de groothandels zitten niet allemaal in
 *   Nederland, en per artikel weten we het niet;
 * - **geen betaalmethodes bij naam** — `lib/payment-methods.ts` is nog een
 *   voornemen en geen meting (#30);
 * - **geen naam van de eigenaar en geen adres** — keuze van de eigenaar; het
 *   adres is een woonadres en staat om die reden ook niet in de footer. De
 *   voorwaarden en de privacyverklaring tonen het wel, want dat moet.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  const title = `${t("metaTitle")} — ${SITE_NAME}`;
  const description = t("metaDescription");
  const path = getPathname({ locale, href: HREF });

  return {
    title,
    description,
    ...localizedMetadata(locale, (l) => getPathname({ locale: l, href: HREF })),
    ...socialMetadata({ locale, title, description, path }),
  };
}

function Section({
  heading,
  paragraphs,
  link,
  children,
}: {
  heading: string;
  paragraphs: string[];
  link?: { href: ComponentProps<typeof Link>["href"]; label: string };
  children?: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl md:text-2xl">{heading}</h2>
      {paragraphs.map((paragraph) => (
        <p key={paragraph} className="mt-3 max-w-prose">
          {paragraph}
        </p>
      ))}
      {children}
      {link && (
        <p className="mt-3 text-sm">
          <Link
            href={link.href}
            className="font-semibold underline decoration-caro-orange decoration-2 underline-offset-4"
          >
            {link.label} ›
          </Link>
        </p>
      )}
    </section>
  );
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  const values = {
    email: COMPANY.email,
    shipping: priceInSentence(STANDARD_SHIPPING_CENTS),
    freeFrom: priceInSentence(FREE_SHIPPING_THRESHOLD_CENTS),
  };
  const path = getPathname({ locale, href: HREF });
  const [organization] = organizationJsonLd(locale);

  return (
    <div className="site-container max-w-3xl py-10 md:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: t("title"),
          url: `${SITE_URL}${path}`,
          inLanguage: locale,
          about: organization,
        }}
      />

      <h1 className="text-3xl md:text-4xl">{t("title")}</h1>
      <p className="mt-4 text-lg">{t("intro")}</p>

      <div className="mt-10 space-y-10">
        <Section
          heading={t("who.heading")}
          paragraphs={[t("who.p1"), t("who.p2", values)]}
          link={{ href: "/contact", label: t("who.link") }}
        >
          <div className="mt-4 rounded-lg border border-border bg-surface p-5">
            <CompanyDetails className="text-sm text-muted" showAddress={false} />
          </div>
        </Section>

        <Section
          heading={t("supply.heading")}
          paragraphs={[t("supply.p1"), t("supply.p2"), t("supply.p3")]}
        />

        <Section
          heading={t("fitment.heading")}
          paragraphs={[t("fitment.p1"), t("fitment.p2")]}
          link={{
            href: {
              pathname: "/guides/[guide]",
              params: { guide: guideSlug(guideByKey("tyreSize"), locale) },
            },
            label: t("fitment.link"),
          }}
        />

        <Section
          heading={t("orders.heading")}
          paragraphs={[t("orders.p1", values), t("orders.p2")]}
          link={{ href: "/returns", label: t("orders.link") }}
        />

        <Section
          heading={t("reviews.heading")}
          paragraphs={[t("reviews.p1")]}
          link={{ href: "/reviews", label: t("reviews.link") }}
        />

        <Section
          heading={t("privacy.heading")}
          paragraphs={[t("privacy.p1")]}
          link={{ href: "/privacy", label: t("privacy.link") }}
        />
      </div>
    </div>
  );
}
