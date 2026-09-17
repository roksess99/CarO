import { useTranslations } from "next-intl";

/**
 * "-15%" op een artikel dat in de actie zit.
 *
 * Bewust géén doorgestreepte "van"-prijs ernaast. Die mag pas als er dertig
 * dagen prijsgeschiedenis is: de wet (Besluit prijsaanduiding producten) vraagt
 * de laagste prijs van die periode als referentie, niet de prijs van gisteren.
 * Een percentage zonder referentieprijs zegt alleen "dit artikel is nu in de
 * aanbieding" en belooft dus niets wat we niet waar kunnen maken.
 */
export function DiscountBadge({
  percent,
  className = "",
}: {
  percent?: number;
  className?: string;
}) {
  const t = useTranslations("product");
  if (!percent || percent <= 0) return null;

  return (
    <span
      className={`inline-flex items-center rounded-md bg-caro-orange px-2 py-0.5 text-sm font-bold tabular-nums text-caro-ink ${className}`}
    >
      {/* Het percentage is het enige dat de klant hoeft te lezen; de volledige
          zin staat eronder voor wie de pagina laat voorlezen. */}
      <span aria-hidden="true">{t("discountBadge", { percent })}</span>
      <span className="sr-only">{t("discountAria", { percent })}</span>
    </span>
  );
}
