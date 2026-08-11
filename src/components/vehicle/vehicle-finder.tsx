"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useVehicle } from "@/components/vehicle/use-vehicle";
import { VehiclePicker } from "@/components/vehicle/vehicle-picker";
import { VehicleSearch } from "@/components/vehicle/vehicle-search";

type Tab = "plate" | "picker";

/**
 * De twee manieren om je auto op te geven, naast elkaar.
 *
 * Kenteken staat voorop: dat is één handeling en levert de meeste gegevens.
 * Wie zijn kenteken niet bij de hand heeft — of een auto zoekt die hij nog
 * niet bezit — kiest merk, model en bouwjaar.
 *
 * Zodra er een auto gekozen is verdwijnen de tabs: dan is er niets meer te
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
  const [tab, setTab] = useState<Tab>("plate");
  const baseId = useId();

  if (vehicle) {
    return <VehicleSearch onSelected={onSelected} />;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "plate", label: t("tabPlate") },
    { key: "picker", label: t("tabPicker") },
  ];

  return (
    <div>
      <div role="tablist" aria-label={t("tabsAria")} className="flex gap-1 border-b border-border">
        {tabs.map(({ key, label }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`${baseId}-tab-${key}`}
              aria-selected={active}
              aria-controls={`${baseId}-panel-${key}`}
              onClick={() => setTab(key)}
              // Actieve tab krijgt een oranje onderlijn: oranje tekst op een
              // lichte achtergrond mag niet (BRAND.md), een lijn wel.
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold ${
                active
                  ? "border-caro-orange text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${tab}`}
        aria-labelledby={`${baseId}-tab-${tab}`}
        className="pt-5"
      >
        {tab === "plate" ? (
          <VehicleSearch autoFocus={autoFocus} onSelected={onSelected} />
        ) : (
          <VehiclePicker makes={makes} onSelected={onSelected} />
        )}
      </div>
    </div>
  );
}
