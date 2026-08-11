import { useTranslations } from "next-intl";
import { VehicleSearch } from "@/components/vehicle/vehicle-search";

/**
 * Startpunt van de shop: de kentekencheck.
 *
 * Bewust op een donker vlak. Merkoranje mag volgens BRAND.md alleen op ink,
 * en de gele plaat springt er beter uit dan op wit. Bovendien scheidt het de
 * "wat zoek je"-stap zichtbaar van het assortiment eronder.
 *
 * Nog geen tweede tab "selecteer op merk/model/bouwjaar": daarvoor is een
 * voertuig-API nodig die er nog niet is (docs/DECISIONS.md #6). Eén tab
 * tekenen die niets doet is erger dan hem weglaten.
 */
export function Hero() {
  const t = useTranslations("home");

  return (
    <section className="bg-caro-ink">
      <div className="site-container py-12 md:py-20">
        <div className="max-w-2xl">
          <p className="eyebrow text-sm text-white/60">{t("eyebrow")}</p>
          <h1 className="mt-3 text-4xl text-white md:text-5xl">{t("title")}</h1>
          <p className="mt-4 text-white/70">{t("intro")}</p>
        </div>

        {/* Lichte kaart op het donkere vlak: de plaat en de knop houden zo
            hun eigen contrastverhoudingen uit BRAND.md. */}
        <div className="mt-8 max-w-2xl rounded-xl bg-background p-5 shadow-lg md:p-6">
          <h2 className="text-lg">{t("plateTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("plateIntro")}</p>
          <div className="mt-5">
            <VehicleSearch />
          </div>
        </div>
      </div>
    </section>
  );
}
