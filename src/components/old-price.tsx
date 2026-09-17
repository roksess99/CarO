import { useTranslations } from "next-intl";
import { formatPriceCents } from "@/lib/format";

/**
 * De doorgestreepte prijs naast een actieprijs.
 *
 * **Dit is niet de adviesprijs van vandaag maar de laagste prijs van de
 * afgelopen dertig dagen.** Dat is de referentie die het Besluit
 * prijsaanduiding producten voorschrijft bij een aangekondigde verlaging, en
 * hij komt uit onze eigen prijsgeschiedenis (lib/prices/history.ts). Staat er
 * geen geschiedenis, dan geeft de catalogus geen `listPriceCents` mee en toont
 * de winkel alleen de nieuwe prijs — nooit een bedrag dat we niet kunnen
 * onderbouwen.
 */
export function OldPrice({
  cents,
  className = "",
}: {
  cents?: number;
  className?: string;
}) {
  const t = useTranslations("product");
  if (!cents) return null;

  return (
    <span className={`text-muted line-through tabular-nums ${className}`}>
      {/* Doorstrepen is opmaak; een schermlezer hoort zonder dit alleen twee
          bedragen achter elkaar en weet niet welke de oude is. */}
      <span className="sr-only">{t("wasPrice")} </span>
      {formatPriceCents(cents)}
    </span>
  );
}
