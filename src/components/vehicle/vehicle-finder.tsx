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

      <h2 className="mt-6 border-t border-border pt-6 text-sm font-bold">
        {t("pickerHeading")}
      </h2>
      <div className="mt-3">
        <VehiclePicker makes={makes} onSelected={onSelected} />
      </div>
    </div>
  );
}
