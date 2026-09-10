"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { lookupVehicleAction } from "@/components/vehicle/actions";
import { familySlug } from "@/lib/catalog/families";
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
import { vehicleName } from "@/lib/vehicle/label";
import type { VehicleLookupError } from "@/lib/vehicle/types";

export function VehicleSearch({
  autoFocus = false,
  /** Roept de drawer aan zodra er een auto gekozen is, zodat die kan sluiten */
  onSelected,
  /**
   * In het zoekpaneel staat de kentekenzoeker naast andere blokken en heeft
   * hij zijn eigen kop al boven zich; dan hoeft het veldlabel niet zichtbaar
   * en past de knop met een kort woord.
   */
  compact = false,
}: {
  autoFocus?: boolean;
  onSelected?: () => void;
  compact?: boolean;
} = {}) {
  const t = useTranslations("vehicle");
  const locale = useLocale();
  // De kentekenzoeker staat sinds de headerknop meerdere keren op één pagina
  // (header en hero). Vaste id's zouden dan dubbel voorkomen en labels naar
  // het verkeerde veld laten wijzen.
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
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
    // De motorvariant uit TecDoc vooraan: die bevestigt beter dan het
    // bouwjaar dat dit de juiste auto is, en bepaalt welke onderdelen passen.
    const specs = [
      vehicle.carName,
      vehicle.firstAdmissionYear?.toString(),
      vehicle.fuel,
      vehicle.engineCapacityCc ? `${vehicle.engineCapacityCc} cc` : undefined,
      vehicle.powerKw ? `${vehicle.powerKw} kW` : undefined,
    ].filter((value): value is string => Boolean(value));

    return (
      // Oranje bovenrand: dit is het resultaat van de belangrijkste actie op
      // de pagina, en moet er ook uitzien als een antwoord in plaats van als
      // het zoveelste grijze kaartje.
      <div className="rounded-lg border border-border border-t-4 border-t-caro-orange bg-surface p-4">
        <p className="eyebrow text-xs">{t("yourCar")}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {/* Alleen een plaat als er een kenteken achter zit */}
          {vehicle.plateFormatted && (
            <PlateBadge plate={vehicle.plateFormatted} />
          )}
          <p className="text-lg font-bold">{vehicleName(vehicle)}</p>
        </div>
        {specs.length > 0 && (
          <p className="mt-2 text-sm text-muted">{specs.join(" · ")}</p>
        )}

{/* Met een TecDoc-id gaan we rechtstreeks naar de onderdelencatalogus
            van déze auto. Zonder id valt de klant terug op /mijn-auto, dat op
            merk en model zoekt. Het id en het merk mogen in de URL; het
            kenteken niet (docs/api/OVERHEID-IO.md). */}
        <Link
          href={
            vehicle.carId
              ? {
                  pathname: "/[family]" as const,
                  params: { family: familySlug("onderdelen", locale) },
                  query: { auto: String(vehicle.carId) },
                }
              : {
                  pathname: "/my-car" as const,
                  query: {
                    merk: vehicle.brand,
                    ...(vehicle.model ? { model: vehicle.model } : {}),
                    ...(vehicle.firstAdmissionYear
                      ? { jaar: String(vehicle.firstAdmissionYear) }
                      : {}),
                  },
                }
          }
          className="mt-4 inline-flex rounded-md bg-caro-orange px-5 py-2.5 font-semibold text-caro-ink"
        >
          {t("browseParts")}
        </Link>

        <p className="mt-3 text-sm text-muted">
          {vehicle.carId ? t("fitmentReady") : t("fitmentPending")}
        </p>
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

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label
        htmlFor={fieldId}
        className={compact ? "sr-only" : "mb-2 block text-sm font-medium"}
      >
        {t("label")}
      </label>
      {/* Plaat over de volle breedte met de knop eronder, niet ernaast.
          Naast elkaar bleef er voor de plaat zelf een strook van een centimeter
          of vijf over; zo is hij het grootste ding in het paneel — en dat is
          precies wat hij moet zijn, want dit is de snelste weg naar de juiste
          onderdelen. */}
      <div
        // Zie plate.tsx: de plaat spiegelt niet mee met de tekstrichting
        dir="ltr"
        // h-16: het belangrijkste invoerveld van de shop, en meteen een royaal
        // aanraakdoel op een telefoon (WCAG 2.2 doelgrootte).
        className="flex h-16 w-full overflow-hidden rounded-md border-2 focus-within:ring-2 focus-within:ring-caro-orange focus-within:ring-offset-2"
        style={{ borderColor: PLATE_INK, backgroundColor: PLATE_YELLOW }}
      >
        <EuStrip className="w-10" />
        <input
          ref={inputRef}
          id={fieldId}
          name="plate"
          value={plate}
          onChange={(event) => setPlate(event.target.value)}
          placeholder={t("placeholder")}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          // Op een telefoon opent hiermee het toetsenbord met de
          // enter-toets als "zoeken" in plaats van een regelafbreking, en
          // blijft de suggestiebalk van de browser weg.
          enterKeyHint="search"
          maxLength={10}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="w-full min-w-0 bg-transparent px-3 text-center text-3xl font-bold tracking-widest uppercase outline-none placeholder:text-lg placeholder:font-normal placeholder:tracking-normal placeholder:text-[#0e1013]/45"
          style={{ color: PLATE_INK }}
        />
      </div>
      {/* h-14 en een vergrootglas ervoor: samen met de plaat erboven is dit
          het zwaartepunt van de homepage. Onder de 48px van WCAG 2.2 zakt hij
          nooit, ook niet in het smalle headerpaneel. */}
      <button
        type="submit"
        disabled={pending || plate.trim().length === 0}
        className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-md bg-caro-orange px-6 text-base font-bold text-caro-ink disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        {/* Niet "Zoek auto": die knop staat ook onder de merk/model-kiezer
            eronder, en twee identieke knoppen in één paneel laten de klant
            raden welke bij welk veld hoort. */}
        {pending ? t("searching") : compact ? t("searchByPlate") : t("searchForMyCar")}
      </button>

      {/* Waarom je hier je kenteken invult, in één regel onder de knop. Dat
          is de belofte van de winkel, en die hoort bij het veld te staan waar
          hij waargemaakt wordt. */}
      <p className="mt-2 text-center text-xs text-muted">{t("plateHint")}</p>

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
