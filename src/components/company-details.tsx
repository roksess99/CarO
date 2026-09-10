import { useTranslations } from "next-intl";
import { COMPANY, companyAddressLine } from "@/lib/company";

/**
 * De wettelijk verplichte bedrijfsgegevens van de webshop. Eén component
 * voor footer, privacyverklaring, algemene voorwaarden en de contactpagina,
 * zodat er nooit drie versies van hetzelfde KvK-nummer door de site zwerven —
 * de bron is `src/lib/company.ts`.
 *
 * Een regel zonder waarde valt weg. Er stond hier eerder "Volgt nog" plus een
 * melding dat een paar gegevens nog ontbraken; die sloeg sinds 2026-09-09
 * nergens meer op, want alles wat deze lijst toont is bekend. De enige
 * onbekende — de zakelijke rekening — staat hier helemaal niet in.
 */
export function CompanyDetails({
  className,
  // Een webshop moet zijn vestigingsadres tonen (art. 6:230m BW). Het staat
  // daarom op de voorwaarden- en privacypagina en op de factuur; in de
  // footer laten we het op verzoek weg, omdat het een woonadres is.
  showAddress = true,
}: {
  className?: string;
  showAddress?: boolean;
}) {
  const t = useTranslations("company");

  const rows: Array<{ label: string; value: string | null }> = [
    { label: t("name"), value: COMPANY.legalName },
    ...(showAddress
      ? [{ label: t("address"), value: companyAddressLine() }]
      : []),
    { label: t("email"), value: COMPANY.email },
    { label: t("coc"), value: COMPANY.cocNumber },
    { label: t("vat"), value: COMPANY.vatNumber },
  ];

  return (
    <div className={className}>
      <dl className="space-y-2">
        {rows
          .filter((row): row is { label: string; value: string } =>
            Boolean(row.value),
          )
          .map((row) => (
            <div key={row.label} className="flex flex-wrap gap-x-2">
              <dt className="font-semibold text-foreground">{row.label}</dt>
              <dd className="tabular-nums">{row.value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}
