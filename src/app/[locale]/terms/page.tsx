import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { localizedMetadata } from "@/lib/site";
import { FREE_SHIPPING_THRESHOLD_CENTS, STANDARD_SHIPPING_CENTS } from "@/lib/shipping";
import { formatPriceCents } from "@/lib/format";

type Props = {
  params: Promise<{ locale: string }>;
};

/**
 * Secties in vaste volgorde. De bedragen komen uit `lib/shipping.ts`, niet uit
 * de vertaling: een tarief dat op twee plekken staat loopt vroeg of laat uit
 * elkaar, en dan klopt de webshop niet met zijn eigen voorwaarden.
 */
const SECTIONS = [
  "identity",
  "scope",
  "offer",
  "prices",
  "payment",
  "delivery",
  "withdrawal",
  "conformity",
  "complaints",
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "terms" });
  const href = "/terms" as const;

  return {
    title: `${t("title")} — CarO`,
    description: t("intro"),
    ...localizedMetadata(locale, (l) => getPathname({ locale: l, href })),
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("terms");

  const values = {
    shipping: formatPriceCents(STANDARD_SHIPPING_CENTS),
    freeFrom: formatPriceCents(FREE_SHIPPING_THRESHOLD_CENTS),
  };

  return (
    <div className="site-container max-w-3xl py-10 md:py-16">
      <h1 className="text-3xl md:text-4xl">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted">{t("lastUpdated")}</p>
      <p className="mt-6 text-muted">{t("intro")}</p>

      {/* TODO: bedrijfsgegevens invullen zodra de KvK-inschrijving rond is
          (docs/DECISIONS.md #3). Een webshop moet die wettelijk tonen. */}
      <div className="mt-8 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        {t("placeholderNotice")}
      </div>

      <div className="mt-10 space-y-8">
        {SECTIONS.map((section, index) => (
          <section key={section}>
            <h2 className="text-xl">
              <span className="text-muted tabular-nums">{index + 1}. </span>
              {t(`${section}.title`)}
            </h2>
            <p className="mt-3 text-muted">{t(`${section}.body`, values)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
