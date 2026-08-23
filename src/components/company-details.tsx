import { useTranslations } from "next-intl";
import {
  COMPANY,
  companyAddressLine,
  companyValue,
  hasPlaceholderCompanyData,
} from "@/lib/company";

/**
 * De wettelijk verplichte bedrijfsgegevens van de webshop. Eén component
 * voor footer, privacyverklaring en algemene voorwaarden, zodat er nooit
 * drie versies van hetzelfde KvK-nummer door de site zwerven — de bron is
 * `src/lib/company.ts`.
 *
 * Een veld dat nog niet is ingevuld toont "volgt nog" in plaats van de
 * PLACEHOLDER-tekst uit de bron.
 */
export function CompanyDetails({ className }: { className?: string }) {
  const t = useTranslations("company");

  const rows: Array<{ label: string; value: string | null }> = [
    { label: t("name"), value: companyValue(COMPANY.legalName) },
    { label: t("address"), value: companyAddressLine() },
    { label: t("email"), value: companyValue(COMPANY.email) },
    { label: t("phone"), value: companyValue(COMPANY.phone) },
    { label: t("coc"), value: companyValue(COMPANY.cocNumber) },
    { label: t("vat"), value: companyValue(COMPANY.vatNumber) },
  ];

  return (
    <div className={className}>
      <dl className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap gap-x-2">
            <dt className="font-semibold text-foreground">{row.label}</dt>
            <dd className="tabular-nums">{row.value ?? t("pending")}</dd>
          </div>
        ))}
      </dl>
      {/* Eerlijk blijven zolang het niet compleet is; verdwijnt vanzelf
          zodra de laatste waarde in company.ts staat. */}
      {hasPlaceholderCompanyData() && (
        <p className="mt-3">{t("incomplete")}</p>
      )}
    </div>
  );
}
