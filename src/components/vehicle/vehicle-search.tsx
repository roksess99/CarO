"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { lookupVehicleAction } from "@/components/vehicle/actions";
import {
  EuStrip,
  PlateBadge,
  PLATE_INK,
  PLATE_YELLOW,
} from "@/components/vehicle/plate";
import {
  clearVehicle,
  saveVehicle,
  useVehicle,
} from "@/components/vehicle/use-vehicle";
import { Link } from "@/i18n/navigation";
import { familySlug } from "@/lib/catalog/families";
import type { VehicleLookupError } from "@/lib/vehicle/types";

export function VehicleSearch({
  autoFocus = false,
  /** Roept de drawer aan zodra er een auto gekozen is, zodat die kan sluiten */
  onSelected,
}: {
  autoFocus?: boolean;
  onSelected?: () => void;
} = {}) {
  const t = useTranslations("vehicle");
  const locale = useLocale();
  const [plate, setPlate] = useState("");
  const [error, setError] = useState<VehicleLookupError | null>(null);
  const [pending, startTransition] = useTransition();
  const vehicle = useVehicle();
  const inputRef = useRef<HTMLInputElement>(null);

  // Expliciet focussen in plaats van het autoFocus-attribuut: dat wordt hier
  // niet toegepast omdat het formulier pas verschijnt nadat useVehicle zijn
  // eerste waarde uit localStorage heeft gelezen.
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await lookupVehicleAction(plate);
      if (result.ok) {
        saveVehicle(result.vehicle);
        setPlate("");
        // Direct melden in de handler, niet via een effect: alleen een
        // geslaagde lookup mag de drawer sluiten, niet een auto die bij het
        // openen al in localStorage stond.
        onSelected?.();
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
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {/* Alleen een plaat als er een kenteken achter zit */}
          {vehicle.plateFormatted && (
            <PlateBadge plate={vehicle.plateFormatted} />
          )}
          <p className="font-bold">
            {vehicle.brand} {vehicle.model}
          </p>
        </div>
        {specs.length > 0 && (
          <p className="mt-2 text-sm text-muted">{specs.join(" · ")}</p>
        )}

        <Link
          href={{
            pathname: "/[family]",
            params: { family: familySlug("onderdelen", locale) },
          }}
          className="mt-4 inline-flex rounded-md bg-caro-orange px-5 py-2.5 font-semibold text-caro-ink"
        >
          {t("browseParts")}
        </Link>

        {/* TODO fase 3: passende onderdelen filteren zodra de TecDoc-koppeling
            via Tyre24 er is (docs/DECISIONS.md #6). Tot die tijd zegt deze
            regel eerlijk dat de match nog handwerk is. */}
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
        {/* De hele plaat is één vlak: blauwe EU-strook tegen het gele veld,
            met de rand eromheen. Zo leest het als een kentekenplaat en niet
            als een invoerveld met een plaatje ernaast. */}
        <div
          className="flex h-14 overflow-hidden rounded-md border-2 focus-within:ring-2 focus-within:ring-caro-orange focus-within:ring-offset-2"
          style={{ borderColor: PLATE_INK, backgroundColor: PLATE_YELLOW }}
        >
          <EuStrip className="w-9" />
          <input
            ref={inputRef}
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
            className="w-44 bg-transparent px-3 text-2xl font-bold tracking-widest uppercase outline-none placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-[#0e1013]/45"
            style={{ color: PLATE_INK }}
          />
        </div>
        <button
          type="submit"
          disabled={pending || plate.trim().length === 0}
          className="h-14 rounded-md bg-caro-orange px-6 font-semibold text-caro-ink disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
        >
          {pending ? t("searching") : t("searchForMyCar")}
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
