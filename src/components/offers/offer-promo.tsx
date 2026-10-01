"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { DiscountBadge } from "@/components/discount-badge";
import { useVehicle } from "@/components/vehicle/use-vehicle";
import { Link } from "@/i18n/navigation";
import { FAMILY_TILE_IMAGES } from "@/lib/catalog/category-tiles";
import { familySlug, type ProductFamily } from "@/lib/catalog/families";

/**
 * Een lopende actie op onderdelen, als aankondiging.
 *
 * Waarom dit bestaat staat in lib/discounts/offers.ts: zo'n actie geldt wel
 * in de winkel maar levert geen artikelen op om te tonen, want de
 * onderdelencatalogus hangt aan een auto. Zonder deze dia zag de klant — en de
 * eigenaar — alleen banden op de homepage terwijl er twee acties liepen.
 *
 * **De knop gaat naar een pagina, niet naar een artikel**, en naar welke hangt
 * af van wat we van de klant weten. Heeft hij zijn auto al gekozen, dan gaat
 * het TecDoc-nummer mee in de URL (`/onderdelen?auto=128214`) en staat hij
 * meteen in de categorieën. Zo niet, dan naar "Mijn auto": dáár staat het
 * kentekenveld, terwijl de onderdelenpagina zonder auto alleen zegt dát je er
 * een moet kiezen. Die auto komt uit localStorage en is dus pas na hydratie
 * bekend — daarom is dit een clientcomponent.
 *
 * De foto komt uit onze eigen `public/`-map en niet van de leverancier: dit is
 * een aankondiging van een groep, niet van een artikel, en een willekeurige
 * productfoto zou beloven dat juist dát artikel in de actie is.
 */
export function OfferPromo({
  family,
  percent,
  subject,
  priority = false,
  showAllLink = true,
}: {
  family: ProductFamily;
  percent: number;
  /** Soort onderdeel bij een actie op één soort; leeg = de hele familie */
  subject: string | null;
  priority?: boolean;
  showAllLink?: boolean;
}) {
  const t = useTranslations("home");
  const tFamily = useTranslations("family");
  const locale = useLocale();
  const carId = useVehicle()?.carId;

  const name = subject ?? tFamily(`${family}.title`).toLowerCase();

  return (
    <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center md:p-6">
      <div className="relative">
        <Image
          src={FAMILY_TILE_IMAGES[family]}
          alt=""
          width={400}
          height={400}
          priority={priority}
          sizes="(min-width: 1024px) 14rem, (min-width: 640px) 40vw, 90vw"
          className="aspect-4/3 w-full rounded-lg bg-surface object-cover sm:aspect-square"
        />
        <DiscountBadge
          percent={percent}
          className="absolute start-2 top-2 shadow-sm"
        />
      </div>

      <div className="min-w-0">
        <p className="eyebrow text-xs">{t("offersEyebrow")}</p>
        {/* "tot": de ondergrens op de marge kan een korting bij een enkel
            artikel kleiner maken dan de actie zegt. Bij twee procent gebeurt
            dat praktisch nooit, maar deze zin moet ook kloppen als de eigenaar
            er ooit veertig procent neerzet (docs/DECISIONS.md #14). */}
        <p className="mt-2 text-lg font-semibold md:text-xl">
          {subject
            ? t("promoTitleKind", { percent, subject: name })
            : t("promoTitleFamily", { percent, family: name })}
        </p>
        <p className="mt-3 max-w-md text-muted">{t("promoBody")}</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={
              carId
                ? {
                    pathname: "/[family]" as const,
                    params: { family: familySlug(family, locale) },
                    query: { auto: String(carId) },
                  }
                : "/my-car"
            }
            className="inline-flex rounded-md bg-caro-orange px-5 py-2.5 font-semibold text-caro-ink"
          >
            {carId ? t("promoCtaCar") : t("promoCta")}
          </Link>
          {showAllLink && (
            <Link
              href="/offers"
              className="inline-flex rounded-md border border-border px-5 py-2.5 font-semibold hover:bg-surface"
            >
              {t("offersAll")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
