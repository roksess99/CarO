import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CompanyDetails } from "@/components/company-details";
import { FaqList } from "@/components/faq-list";
import { JsonLd } from "@/components/json-ld";
import { getPathname, Link } from "@/i18n/navigation";
import { priceInSentence } from "@/lib/format";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  STANDARD_SHIPPING_CENTS,
} from "@/lib/shipping";
import { faqJsonLd, localizedMetadata, socialMetadata } from "@/lib/site";

type Props = {
  params: Promise<{ locale: string }>;
};

/**
 * Vragen per blok, in vaste volgorde.
 *
 * Bewust hier en niet in messages/: de volgorde is een redactionele keuze
 * (eerst wat iedereen vraagt, dan het bijzondere), en zo kan een taal er niet
 * per ongeluk een vergeten. De teksten zelf staan wél in messages/.
 *
 * Net als bij de voorwaarden komen de bedragen uit `lib/shipping.ts` en niet
 * uit de vertaling: een tarief dat op twee plekken staat loopt uit elkaar.
 */
const GROUPS = [
  { key: "ordering", questions: ["shipping", "vat", "payment"] },
  { key: "returns", questions: ["returns", "defects", "condition"] },
  { key: "fitment", questions: ["fits", "plate", "tyreSize"] },
] as const;

const HREF = "/faq" as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  const title = `${t("metaTitle")} — CarO`;
  const description = t("metaDescription");
  const path = getPathname({ locale, href: HREF });

  return {
    title,
    description,
    ...localizedMetadata(locale, (l) => getPathname({ locale: l, href: HREF })),
    ...socialMetadata({ locale, title, description, path }),
  };
}

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("faq");
  const tFooter = await getTranslations("footer");

  const values = {
    shipping: priceInSentence(STANDARD_SHIPPING_CENTS),
    freeFrom: priceInSentence(FREE_SHIPPING_THRESHOLD_CENTS),
  };

  const items = GROUPS.flatMap((group) =>
    group.questions.map((question) => ({
      key: question,
      question: t(`q.${question}.question`),
      answer: t(`q.${question}.answer`, values),
    })),
  );

  return (
    <div className="site-container max-w-3xl py-10 md:py-16">
      <JsonLd data={faqJsonLd(items)} />

      <h1 className="text-3xl md:text-4xl">{t("title")}</h1>
      <p className="mt-4 text-muted">{t("intro")}</p>

      <div className="mt-10 space-y-10">
        {GROUPS.map((group) => (
          <section key={group.key}>
            <h2 className="text-xl">{t(`groups.${group.key}`)}</h2>
            <div className="mt-4">
              <FaqList
                items={items.filter((item) =>
                  (group.questions as readonly string[]).includes(item.key),
                )}
              />
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-lg border border-border bg-surface p-6">
        <CompanyDetails className="text-sm text-muted" />
        <p className="mt-4 text-sm text-muted">
          <Link
            href="/terms"
            className="underline underline-offset-4 hover:text-foreground"
          >
            {tFooter("termsLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
