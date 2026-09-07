import { getTranslations, getLocale } from "next-intl/server";
import { HeroBackdrop } from "@/components/home/hero-backdrop";
import { VehicleFinder } from "@/components/vehicle/vehicle-finder";
import { Link } from "@/i18n/navigation";
import { familySlug } from "@/lib/catalog/families";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping";
import { formatPriceCents } from "@/lib/format";
import { vehicleMakeNames } from "@/lib/vehicle/makes";

/**
 * Startpunt van de shop, in twee kolommen.
 *
 * Links het zoekpaneel, rechts een banner. Die verhouding komt van de grote
 * onderdelenshops en werkt omdat de klant met een concrete vraag binnenkomt:
 * het invulveld hoort links boven de vouw, niet onder een lap tekst.
 *
 * Het vlak gebruikt themakleuren en geen vaste merkkleur: een hero die in
 * lichte modus donker blijft leest als een fout, niet als een accent.
 */
export async function Hero() {
  const t = await getTranslations("home");
  const locale = await getLocale();
  // Alleen de merknamen naar de browser; modellen volgen per stap
  const makes = await vehicleMakeNames();

  const usps = [
    t("uspShipping", { amount: formatPriceCents(FREE_SHIPPING_THRESHOLD_CENTS) }),
    t("uspReturns"),
    t("uspVat"),
  ];

  return (
    <section className="relative overflow-hidden border-b border-border bg-surface">
      <HeroBackdrop />
      {/* relative: de inhoud moet boven de tekening blijven */}
      <div className="relative site-container py-8 md:py-12">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
          <div className="rounded-xl border border-border bg-background p-5 shadow-lg">
            <h1 className="text-xl md:text-2xl">{t("title")}</h1>
            <div className="mt-5">
              <VehicleFinder makes={makes} />
            </div>
          </div>

          {/* Banner. Geen fotobanner met aanbiedingen zoals de concurrent:
              wij hebben nog geen acties, en een verzonnen korting tonen zou
              misleidend zijn. Dit blok verkoopt wat wél waar is. */}
          <div className="relative overflow-hidden rounded-xl border border-border bg-background p-6 md:p-10">
            <HeroBackdrop id="banner" />
            <div className="relative">
              <p className="eyebrow text-sm">{t("eyebrow")}</p>
              <p className="mt-3 max-w-lg text-3xl font-bold tracking-tight md:text-4xl">
                {t("bannerTitle")}
              </p>
              <p className="mt-3 max-w-md text-muted">{t("intro")}</p>

              <ul className="mt-6 space-y-2">
                {usps.map((usp) => (
                  <li key={usp} className="flex items-start gap-2">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="mt-0.5 size-5 shrink-0 text-caro-orange"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m4 12.5 5 5L20 6.5" />
                    </svg>
                    {usp}
                  </li>
                ))}
              </ul>

              <Link
                href={{
                  pathname: "/[family]",
                  params: { family: familySlug("banden", locale) },
                }}
                className="mt-7 inline-flex rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink"
              >
                {t("bannerCta")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
