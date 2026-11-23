import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { familySlug } from "@/lib/catalog/families";
import {
  POPULAR_TYRE_SIZES,
  tyreSizeQuery,
} from "@/lib/catalog/popular-tyre-sizes";
import { formatTyreSize, seasonLinksForDate } from "@/lib/catalog/tyre-size";

/**
 * Vaste links naar de gangbare bandenmaten.
 *
 * Voor de klant een snelkoppeling, voor een zoekmachine de enige weg naar een
 * maatpagina — de maatkiezer is een formulier en dat vult een crawler niet
 * in. Kost geen verzoek bij de leverancier: de lijst staat in de code, en pas
 * wie klikt laat de zoekopdracht lopen.
 */
export async function PopularTyreSizes({
  headingLevel = "h2",
}: {
  /** h2 op de homepage, h2 onder de maatkiezer op /banden */
  headingLevel?: "h2" | "h3";
}) {
  const t = await getTranslations("tyres");
  const locale = await getLocale();
  const Heading = headingLevel;

  return (
    <section aria-labelledby="popular-tyre-sizes">
      <Heading id="popular-tyre-sizes" className="text-xl md:text-2xl">
        {t("popularTitle")}
      </Heading>
      <p className="mt-2 max-w-2xl text-muted">{t("popularIntro")}</p>
      {/* Op een telefoon drie per rij met alleen de maat zichtbaar. Met het
          woord "Banden" ervoor paste er één per regel, en werden twaalf maten
          een kolom van bijna 700px (GEMETEN 2026-11-23 op 375px). Het woord
          blijft wel in de link staan, als sr-only: een schermlezer en een
          zoekmachine lezen nog steeds "Banden 205/55 R16". */}
      <ul className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        {POPULAR_TYRE_SIZES.map((size) => {
          const label = formatTyreSize(size);
          return (
            <li key={label}>
              <Link
                href={{
                  pathname: "/[family]",
                  params: { family: familySlug("banden", locale) },
                  query: tyreSizeQuery(size),
                }}
                className="flex justify-center rounded-md border border-border bg-background px-1 py-2 text-sm font-semibold whitespace-nowrap tabular-nums hover:border-caro-orange hover:bg-surface sm:inline-flex sm:px-3"
              >
                {/* Eén omhullende span: rechtstreeks in de flex-link zou de
                    verborgen span een eigen flex-item zijn, en dan valt de
                    spatie aan zijn rand weg ("Banden205/55 R16"). */}
                <span>
                  {t.rich("popularLink", {
                    size: label,
                    hide: (chunks) => (
                      <span className="sr-only sm:not-sr-only">{chunks}</span>
                    ),
                  })}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {/* De seizoenspagina's als gewone links (#36): het seizoen van nu
          vooraan, all-season het hele jaar ernaast. Welk seizoen dat is volgt
          de datum; de pagina wordt minstens dagelijks opnieuw opgebouwd, dus
          de wissel in oktober en april gaat vanzelf. Alle drie de pagina's
          staan bovendien in de sitemap, ook als ze hier even niet staan. */}
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {seasonLinksForDate(new Date()).map((season) => (
          <li key={season}>
            <Link
              href={{
                pathname: "/[family]",
                params: { family: familySlug("banden", locale) },
                query: { seizoen: season },
              }}
              className="font-semibold underline decoration-caro-orange decoration-2 underline-offset-4"
            >
              {t(`seasonLink.${season}`)} ›
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
