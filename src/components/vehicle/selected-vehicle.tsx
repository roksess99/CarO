"use client";

import { useTranslations } from "next-intl";
import { PlateBadge } from "@/components/vehicle/plate";
import { clearVehicle, useVehicle } from "@/components/vehicle/use-vehicle";

// Compacte weergave van de gekozen auto in de header. Verschijnt pas na
// hydration (localStorage), dus geen server-render van deze inhoud.
export function SelectedVehicle() {
  const t = useTranslations("vehicle");
  const vehicle = useVehicle();

  if (!vehicle) return null;

  return (
    // Ook op mobiel zichtbaar: de gekozen auto stuurt het hele koopproces.
    // Daar tonen we alleen de plaat, op desktop ook het merk.
    <div className="flex items-center gap-1 md:gap-2">
      {/* Zonder kenteken is er geen plaat om te tonen; dan draagt het merk
          de herkenning. */}
      {vehicle.plateFormatted ? (
        <PlateBadge plate={vehicle.plateFormatted} className="text-xs" />
      ) : (
        <span className="max-w-32 truncate text-sm font-semibold">
          {vehicle.brand}
        </span>
      )}
      <span
        className="hidden max-w-32 truncate text-sm text-muted lg:inline"
        title={`${vehicle.brand} ${vehicle.model}`}
      >
        {vehicle.plateFormatted ? vehicle.brand : vehicle.model}
      </span>
      <button
        type="button"
        onClick={clearVehicle}
        aria-label={t("clearAria", {
          plate: vehicle.plateFormatted ?? `${vehicle.brand} ${vehicle.model}`,
        })}
        className="rounded-md p-1 text-muted hover:bg-surface hover:text-foreground"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
