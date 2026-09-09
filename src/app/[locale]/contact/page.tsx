import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CompanyDetails } from "@/components/company-details";
import { ContactForm } from "@/components/contact/contact-form";
import { getPathname, Link } from "@/i18n/navigation";
import { COMPANY } from "@/lib/company";
import { localizedMetadata, socialMetadata } from "@/lib/site";

type Props = {
  params: Promise<{ locale: string }>;
};

const HREF = "/contact" as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  const title = `${t("metaTitle")} — CarO`;
  const description = t("metaDescription");

  return {
    title,
    description,
    ...localizedMetadata(locale, (l) => getPathname({ locale: l, href: HREF })),
    ...socialMetadata({
      locale,
      title,
      description,
      path: getPathname({ locale, href: HREF }),
    }),
  };
}

/**
 * Contactpagina: gegevens links, formulier rechts.
 *
 * Het e-mailadres staat er als gewone link náást het formulier en niet
 * alleen erin. Wie liever zelf mailt — met een bijlage, of vanaf zijn eigen
 * adres met een kopie in "verzonden" — moet dat gewoon kunnen; een
 * formulier als enige ingang is een drempel, geen dienst.
 */
export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const tFooter = await getTranslations("footer");

  return (
    <div className="site-container py-10 md:py-16">
      <h1 className="text-3xl md:text-4xl">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-muted">{t("intro")}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start">
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-lg">{t("detailsTitle")}</h2>

          <p className="mt-4 text-sm">
            <a
              href={`mailto:${COMPANY.email}`}
              className="font-semibold underline underline-offset-4"
            >
              {COMPANY.email}
            </a>
          </p>
          <p className="mt-2 text-sm text-muted">{t("responseTime")}</p>

          <h2 className="mt-8 text-lg">{t("companyTitle")}</h2>
          <CompanyDetails className="mt-4 text-sm text-muted" />

          <p className="mt-6 text-sm text-muted">
            {t.rich("faqHint", {
              faq: (chunks) => (
                <Link
                  href="/faq"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <p className="mt-2 text-sm text-muted">
            <Link
              href="/terms"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {tFooter("termsLink")}
            </Link>
          </p>
        </div>

        <div>
          <h2 className="text-lg">{t("formTitle")}</h2>
          <p className="mt-2 max-w-xl text-sm text-muted">{t("formIntro")}</p>
          <div className="mt-6 max-w-xl">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
