"use client";

import { useTranslations } from "next-intl";
import { clearVehicle, useVehicle } from "@/components/vehicle/use-vehicle";

// Compacte weergave van de gekozen auto in de header. Verschijnt pas na
// hydration (localStorage), dus geen server-render van deze inhoud.
export function SelectedVehicle() {
  const t = useTranslations("vehicle");
  const vehicle = useVehicle();

  if (!vehicle) return null;

  return (
    <div className="hidden items-center gap-2 md:flex">
      <span className="inline-block rounded border-2 border-[#0e1013] bg-[#f7d117] px-1.5 py-0.5 text-xs font-bold tracking-wider text-[#0e1013]">
        {vehicle.plateFormatted}
      </span>
      <span className="max-w-32 truncate text-sm text-muted" title={`${vehicle.brand} ${vehicle.model}`}>
        {vehicle.brand}
      </span>
      <button
        type="button"
        onClick={clearVehicle}
        aria-label={t("clearAria", { plate: vehicle.plateFormatted })}
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
