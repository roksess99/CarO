import { getLocale, getTranslations } from "next-intl/server";
import { TyreSizeForm } from "@/components/tyres/tyre-size-form";
import { Link } from "@/i18n/navigation";
import type { TyreSeason, TyreSize } from "@/lib/catalog/tyre-size";
import { guideByKey, guideSlug } from "@/lib/guides";

/**
 * Bandenmaat kiezen: breedte, hoogte, diameter en seizoen.
 *
 * Een gewoon GET-formulier: de maat komt in de URL en is daarmee deelbaar en
 * bookmarkbaar — precies wat een klant met twee auto's nodig heeft. Zelfde
 * aanpak als het zoekveld voor onderdelen. De velden en het plaatje van de
 * flank staan in `TyreSizeForm`, want dat plaatje volgt de keuze en vraagt
 * dus de browser.
 *
 * Waarom er geen tabblad "per auto" naast staat: geen van beide API's van de
 * leverancier koppelt een voertuig aan een bandenmaat. De Products-API heeft
 * geen voertuig-endpoints (docs/api/TYRE24.md) en de RDW-registratie levert de
 * maat niet mee (docs/DECISIONS.md #6). De maat van de band die er nú op zit
 * staat op de flank — vandaar het plaatje en de uitleg.
 */
export async function TyreSizePicker({
  action,
  size,
  season,
  guideLink = true,
}: {
  /** Pad waar het formulier naartoe gaat; de pagina leest de query */
  action: string;
  size: TyreSize | null;
  season: TyreSeason | null;
  /** Uit op de gids zelf: een link naar de pagina waar je al bent */
  guideLink?: boolean;
}) {
  const t = await getTranslations("tyres");
  const locale = await getLocale();

  return (
    <section className="mt-8 rounded-xl border border-border p-4 md:p-6">
      <h2 className="text-lg">{t("pickerTitle")}</h2>

      <TyreSizeForm action={action} size={size} season={season} />

      <details className="mt-4">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-muted hover:text-foreground">
          {t("helpTitle")}
        </summary>
        <p className="mt-1 max-w-prose text-sm text-muted">{t("helpBody")}</p>
        {/* De hele uitleg staat in een gids (#37); hier alleen de kern. */}
        {guideLink && (
        <p className="mt-2 text-sm">
          <Link
            href={{
              pathname: "/guides/[guide]",
              params: { guide: guideSlug(guideByKey("tyreSize"), locale) },
            }}
            className="font-semibold underline decoration-caro-orange decoration-2 underline-offset-4"
          >
            {t("guideLink")} ›
          </Link>
        </p>
        )}
      </details>
    </section>
  );
}
