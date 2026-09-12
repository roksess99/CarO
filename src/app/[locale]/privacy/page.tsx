import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CompanyDetails } from "@/components/company-details";
import { getPathname } from "@/i18n/navigation";
import { localizedMetadata } from "@/lib/site";

type Props = {
  params: Promise<{ locale: string }>;
};

/**
 * Wat de shop op het apparaat van de bezoeker opslaat. Gemeten 2026-08-07,
 * niet uit het hoofd opgeschreven — zie docs/PRIVACY.md.
 *
 * Alles hieronder is strikt noodzakelijk of door de bezoeker zelf gekozen.
 * Komt er iets bij dat dat níet is (analytics, advertentiepixels), dan is
 * een toestemmingsbanner mét voorafgaande blokkering wél verplicht.
 */
const STORAGE_ITEMS = [
  { key: "NEXT_LOCALE", kind: "cookie" },
  { key: "caro-cart", kind: "local" },
  { key: "caro-checkout", kind: "local" },
  { key: "caro-vehicle", kind: "local" },
  { key: "theme", kind: "local" },
] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  const href = "/privacy" as const;

  return {
    title: `${t("title")} — CarO`,
    description: t("intro"),
    ...localizedMetadata(locale, (l) => getPathname({ locale: l, href })),
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("privacy");

  return (
    <div className="site-container max-w-3xl py-12 md:py-16">
      <h1 className="text-3xl md:text-4xl">{t("title")}</h1>
      <p className="mt-4 text-muted">{t("intro")}</p>
      <p className="mt-2 text-sm text-muted">{t("lastUpdated")}</p>

      <h2 className="mt-12 text-2xl">{t("storageTitle")}</h2>
      <p className="mt-3 text-muted">{t("storageIntro")}</p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-start">
              <th scope="col" className="py-3 pe-4 font-semibold">
                {t("tableName")}
              </th>
              <th scope="col" className="py-3 pe-4 font-semibold">
                {t("tableKind")}
              </th>
              <th scope="col" className="py-3 pe-4 font-semibold">
                {t("tablePurpose")}
              </th>
              <th scope="col" className="py-3 font-semibold">
                {t("tableRetention")}
              </th>
            </tr>
          </thead>
          <tbody>
            {STORAGE_ITEMS.map(({ key, kind }) => (
              <tr key={key} className="border-b border-border align-top">
                <td className="py-3 pe-4 font-medium tabular-nums">{key}</td>
                <td className="py-3 pe-4 text-muted">{t(`kind.${kind}`)}</td>
                <td className="py-3 pe-4 text-muted">{t(`items.${key}.purpose`)}</td>
                <td className="py-3 text-muted">{t(`items.${key}.retention`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-2xl">{t("noBannerTitle")}</h2>
      <p className="mt-3 text-muted">{t("noBannerBody")}</p>
      <p className="mt-3 text-muted">{t("noTracking")}</p>

      <h2 className="mt-12 text-2xl">{t("personalDataTitle")}</h2>
      <p className="mt-3 text-muted">{t("personalDataBody")}</p>
      <ul className="mt-4 list-disc space-y-2 ps-5 text-muted">
        <li>{t("personalCheckout")}</li>
        <li>{t("personalAddress")}</li>
        <li>{t("personalPlate")}</li>
      </ul>

      <h2 className="mt-12 text-2xl">{t("thirdPartiesTitle")}</h2>
      <p className="mt-3 text-muted">{t("thirdPartiesBody")}</p>
      <ul className="mt-4 list-disc space-y-2 ps-5 text-muted">
        <li>{t("thirdTyre24")}</li>
        <li>{t("thirdMollie")}</li>
        <li>{t("thirdRdw")}</li>
        <li>{t("thirdPostcode")}</li>
        <li>{t("thirdHosting")}</li>
      </ul>

      <h2 className="mt-12 text-2xl">{t("rightsTitle")}</h2>
      <p className="mt-3 text-muted">{t("rightsBody")}</p>

      <h2 className="mt-12 text-2xl">{t("contactTitle")}</h2>
      <p className="mt-3 text-muted">{t("contactBody")}</p>
      <CompanyDetails className="mt-4 rounded-lg border border-border bg-surface p-4 text-sm text-muted" />
    </div>
  );
}
