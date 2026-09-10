"use client";

import { useTranslations } from "next-intl";
import { useVehicle } from "@/components/vehicle/use-vehicle";
import { VehiclePicker } from "@/components/vehicle/vehicle-picker";
import { VehicleSearch } from "@/components/vehicle/vehicle-search";

/**
 * De twee manieren om je auto op te geven, onder elkaar.
 *
 * Bewust géén tabs: achter een tab is een optie onzichtbaar, en juist de
 * klant die zijn kenteken niet bij de hand heeft moet meteen zien dat er een
 * alternatief is. Grote onderdelenshops zetten ze om die reden allebei in
 * beeld.
 *
 * Zodra er een auto gekozen is verdwijnen beide: dan is er niets meer te
 * kiezen, alleen te bevestigen of te wissen.
 */
export function VehicleFinder({
  makes,
  autoFocus = false,
  onSelected,
}: {
  makes: string[];
  autoFocus?: boolean;
  onSelected?: () => void;
}) {
  const t = useTranslations("vehicle");
  const vehicle = useVehicle();

  if (vehicle) {
    return <VehicleSearch onSelected={onSelected} />;
  }

  return (
    <div>
      {/* h2 en niet h3: hierboven staat alleen de h1 van de pagina, en een
          overgeslagen niveau maakt de structuur onleesbaar voor een
          schermlezer (Lighthouse-bevinding). */}
      <h2 className="text-base font-bold">{t("plateHeading")}</h2>
      <div className="mt-3">
        <VehicleSearch autoFocus={autoFocus} onSelected={onSelected} compact />
      </div>

      {/* Scheidingslijn met het woord ertussen. Een kale streep leest als
          "hier is het blok afgelopen"; met "of" ertussen leest het als twee
          wegen naar hetzelfde doel — en dat is het ook.
          aria-hidden: de koppen zeggen het al, een schermlezer hoort anders
          een losse "of" tussen twee kopregels. */}
      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold tracking-wider text-muted uppercase">
          {t("or")}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Kleiner en gedempt: dit is de omweg voor wie zijn kenteken niet bij
          de hand heeft, niet de hoofdroute. */}
      <h2 className="text-sm font-bold text-muted">{t("pickerHeading")}</h2>
      <div className="mt-3">
        <VehiclePicker makes={makes} onSelected={onSelected} />
      </div>
    </div>
  );
}
