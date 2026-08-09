"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { lookupVehicleAction } from "@/components/vehicle/actions";
import {
  clearVehicle,
  saveVehicle,
  useVehicle,
} from "@/components/vehicle/use-vehicle";
import type { VehicleLookupError } from "@/lib/vehicle/types";

export function VehicleSearch() {
  const t = useTranslations("vehicle");
  const [plate, setPlate] = useState("");
  const [error, setError] = useState<VehicleLookupError | null>(null);
  const [pending, startTransition] = useTransition();
  const vehicle = useVehicle();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await lookupVehicleAction(plate);
      if (result.ok) {
        saveVehicle(result.vehicle);
        setPlate("");
      } else {
        setError(result.error);
      }
    });
  }

  // Gevonden auto: bevestiging tonen i.p.v. het formulier
  if (vehicle) {
    const specs = [
      vehicle.firstAdmissionYear?.toString(),
      vehicle.fuel,
      vehicle.engineCapacityCc ? `${vehicle.engineCapacityCc} cc` : undefined,
      vehicle.powerKw ? `${vehicle.powerKw} kW` : undefined,
    ].filter((value): value is string => Boolean(value));

    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="eyebrow text-xs">{t("yourCar")}</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <PlateBadge plate={vehicle.plateFormatted} />
          <p className="font-bold">
            {vehicle.brand} {vehicle.model}
          </p>
        </div>
        {specs.length > 0 && (
          <p className="mt-2 text-sm text-muted">{specs.join(" · ")}</p>
        )}
        {/* TODO fase 3: passende onderdelen filteren zodra de TecDoc-koppeling
            via Tyre24 er is (docs/DECISIONS.md #6) */}
        <p className="mt-3 text-sm text-muted">{t("fitmentPending")}</p>
        <button
          type="button"
          onClick={clearVehicle}
          className="mt-3 text-sm text-muted underline underline-offset-4 hover:text-foreground"
        >
          {t("changeCar")}
        </button>
      </div>
    );
  }

  const errorId = "vehicle-search-error";

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label htmlFor="plate" className="mb-2 block text-sm font-medium">
        {t("label")}
      </label>
      <div className="flex flex-wrap items-start gap-3">
        {/* Geel vlak + zwarte tekst: herkenbaar als kentekenplaat.
            Niet uit BRAND.md — dit is een NL-conventie, geen merkkleur. */}
        <input
          id="plate"
          name="plate"
          value={plate}
          onChange={(event) => setPlate(event.target.value)}
          placeholder={t("placeholder")}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={10}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="w-40 rounded-md border-2 border-[#0e1013] bg-[#f7d117] px-3 py-2 text-lg font-bold tracking-widest text-[#0e1013] uppercase placeholder:font-normal placeholder:tracking-normal placeholder:text-[#0e1013]/50"
        />
        <button
          type="submit"
          disabled={pending || plate.trim().length === 0}
          className="rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
        >
          {pending ? t("searching") : t("search")}
        </button>
      </div>

      <div role="status" aria-live="polite">
        {error && (
          <p id={errorId} className="mt-3 text-sm text-danger">
            {t(`errors.${error}`)}
          </p>
        )}
      </div>
    </form>
  );
}

function PlateBadge({ plate }: { plate: string }) {
  return (
    <span className="inline-block rounded border-2 border-[#0e1013] bg-[#f7d117] px-2 py-0.5 text-sm font-bold tracking-wider text-[#0e1013]">
      {plate}
    </span>
  );
}
