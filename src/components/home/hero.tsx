import { getTranslations, getLocale } from "next-intl/server";
import { HeroBackdrop } from "@/components/home/hero-backdrop";
import { OfferCarousel } from "@/components/offers/offer-carousel";
import { VehicleFinder } from "@/components/vehicle/vehicle-finder";
import { TyreSizeForm } from "@/components/tyres/tyre-size-form";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { familySlug } from "@/lib/catalog/families";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping";
import { formatPriceCents } from "@/lib/format";
import { offerSlides } from "@/lib/discounts/offers";
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
  const tInfo = await getTranslations("homeInfo");
  const locale = await getLocale();
  // Alleen de merknamen naar de browser; modellen volgen per stap
  const [makes, offers] = await Promise.all([
    vehicleMakeNames(),
    // Vijf tot acht is genoeg; niemand ziet dia negen
    offerSlides(6),
  ]);

  const tyreAction = getPathname({
    locale: locale as Locale,
    href: {
      pathname: "/[family]",
      params: { family: familySlug("banden", locale) },
    },
  });

  const usps = [
    t("uspShipping", { amount: formatPriceCents(FREE_SHIPPING_THRESHOLD_CENTS) }),
    t("uspReturns"),
    t("uspVat"),
  ];

  // Géén overflow-hidden op de sectie: de keuzelijst van de autokiezer hangt
  // als absoluut paneel onder zijn knop, en die werd er 147px door afgesneden
  // (GEMETEN 2026-09-10). De achtergrondtekening knipt zichzelf al af — zie
  // het overflow-hidden in HeroBackdrop zelf.
  return (
    <section className="relative border-b border-border bg-surface">
      <HeroBackdrop />
      {/* relative: de inhoud moet boven de tekening blijven */}
      <div className="relative site-container py-8 md:py-12">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,28rem)_1fr]">
          {/* Oranje bovenrand en schaduw: dit paneel is waar de klant moet
              beginnen, en naast een banner van dubbele breedte viel het
              eerder weg. Oranje mag hier omdat het een vlak is en geen
              tekst (docs/BRAND.md). */}
          <div className="rounded-xl border border-border border-t-4 border-t-caro-orange bg-background p-5 shadow-xl">
            <h1 className="text-xl md:text-2xl">{t("title")}</h1>
            <div className="mt-5">
              <VehicleFinder makes={makes} />
            </div>
          </div>

          {/* Lopen er acties, dan staan die hier (docs/DECISIONS.md #14).
              Anders de bandenmaat: de tweede manier waarop iemand hier iets
              zoekt. Winparts zet die als tweede tab in hetzelfde zoekpaneel
              (bekeken 2026-11-23); hier stond tot dan een tekstbanner die
              de kop links in andere woorden herhaalde (#36). */}
          {offers.length > 0 ? (
            // Mét actie: de carrousel bovenaan, want die is tijdelijk en hoort
            // het opvallendst te zijn — en daaronder de bandenmaat op één
            // regel, zodat wie banden zoekt niet hoeft te scrollen (keuze van
            // de eigenaar 2026-11-23, #36). De carrousel blijft het grootste
            // element en dus de LCP; deze strook ernaast heeft geen beeld.
            <div className="flex flex-col gap-4">
              <OfferCarousel slides={offers} />
              <div className="rounded-xl border border-border bg-background p-4 md:p-5">
                <h2 className="text-base md:text-lg">{tInfo("tyreTitle")}</h2>
                <TyreSizeForm
                  action={tyreAction}
                  size={null}
                  season={null}
                  submitStyle="secondary"
                  layout="compact"
                />
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-border bg-background p-5 md:p-8">
              <HeroBackdrop id="banner" />
              <div className="relative">
                <p className="eyebrow text-sm">{tInfo("tyreEyebrow")}</p>
                <h2 className="mt-2 text-2xl md:text-3xl">
                  {tInfo("tyreTitle")}
                </h2>
                <p className="mt-2 max-w-md text-muted">{tInfo("tyreIntro")}</p>
                {/* Een gewoon GET-formulier naar /banden: de maat staat dan in
                    de URL, en dat is precies de maatpagina uit #35. Werkt
                    zonder JavaScript. De knop is omlijnd, niet oranje: de
                    kentekencheck links blijft de enige primaire actie. */}
                <TyreSizeForm
                  action={tyreAction}
                  size={null}
                  season={null}
                  submitStyle="secondary"
                  mobile="lean"
                />
              </div>
            </div>
          )}
        </div>

        {/* De drie voordelen als vaste strook onder de hero, of er nu
            acties lopen of niet. Ze stonden eerst ín de banner; nu die de
            bandenmaat draagt horen ze hier — "gratis verzending vanaf
            € 100" en "14 dagen bedenktijd" zijn de zinnen die twijfelaars
            overhalen en mogen niet wegvallen (#14). Autodoc en Winparts
            zetten ze net zo los in een strook. */}
        <ul className="mt-6 grid gap-3 border-t border-border pt-5 sm:grid-cols-3">
          {usps.map((usp) => (
            <li key={usp} className="flex items-start gap-2 text-sm">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="mt-0.5 size-4 shrink-0 text-caro-orange"
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
      </div>
    </section>
  );
}
