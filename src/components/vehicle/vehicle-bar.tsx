"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import { clearVehicle, useVehicle } from "@/components/vehicle/use-vehicle";
import { VehicleFinder } from "@/components/vehicle/vehicle-finder";
import type { Vehicle } from "@/lib/vehicle/types";

/** Kentekenbewijs en advertenties noemen allebei pk; kW staat erbij */
const PK_PER_KW = 1.35962;

/**
 * Motorregel onder de autonaam: "1,2 l · Benzine · 110 pk / 81 kW · 2014".
 *
 * Alles is optioneel — bij een auto die via merk/model gekozen is kent de
 * RDW-registratie ons niets toe. Wat ontbreekt laten we gewoon weg in plaats
 * van er een streepje voor te zetten.
 */
function engineLine(vehicle: Vehicle, locale: string): string {
  const parts: string[] = [];
  if (vehicle.engineCapacityCc) {
    const litres = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(vehicle.engineCapacityCc / 1000);
    parts.push(`${litres} l`);
  }
  if (vehicle.fuel) parts.push(vehicle.fuel);
  if (vehicle.powerKw) {
    parts.push(`${Math.round(vehicle.powerKw * PK_PER_KW)} pk / ${vehicle.powerKw} kW`);
  }
  if (vehicle.firstAdmissionYear) parts.push(String(vehicle.firstAdmissionYear));
  return parts.join(" · ");
}

/**
 * Vaste balk met de gekozen auto, boven de zoekbalk op mobiel.
 *
 * De auto stuurt het hele koopproces — welke categorieën er zijn, welke
 * onderdelen passen — dus die hoort in beeld te blijven en niet weggestopt
 * achter een pictogram. Op desktop doet de voertuigknop in de header dit al,
 * vandaar `md:hidden`.
 *
 * Vaste donkere kleur met reden: dit is dezelfde app-balk als de tabbalk
 * onderaan (.claude/rules/frontend.md). Oranje op ink haalt 6,6:1.
 */
export function VehicleBar({ makes }: { makes: string[] }) {
  const t = useTranslations("vehicle");
  const tNav = useTranslations("bottomNav");
  const locale = useLocale();
  const vehicle = useVehicle();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  // Zonder auto is er niets te tonen: de uitnodiging staat al in de tabbalk
  // onderaan en op de homepage.
  if (!vehicle) return null;

  const name = `${vehicle.brand} ${vehicle.model}`;
  const engine = engineLine(vehicle, locale);

  return (
    <>
      {open && (
        <BottomSheet
          label={t("changeCar")}
          closeLabel={tNav("close")}
          onClose={close}
          returnFocusTo={triggerRef}
        >
          <div className="overflow-y-auto p-4">
            <VehicleFinder makes={makes} autoFocus onSelected={close} />
          </div>
        </BottomSheet>
      )}

      <div className="bg-caro-ink text-white md:hidden">
        <div className="site-container flex items-center gap-2 py-2">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5 text-caro-orange"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 13h14l-1.5-4.5A2 2 0 0 0 15.6 7H8.4a2 2 0 0 0-1.9 1.5z" />
              <path d="M4 13h16v4H4z" />
              <circle cx="7.5" cy="17" r="1" />
              <circle cx="16.5" cy="17" r="1" />
            </svg>
          </span>

          {/* De hele regel opent de autokiezer; wisselen van auto is hier de
              enige zinnige actie.

              Geen kentekenplaat ernaast: die staat al in de tabbalk onderaan,
              en de merknaam heeft de ruimte harder nodig — met plaat bleef er
              van "CITROEN C3 AIRCROSS" niet meer over dan "CITROEN C3 AIRC…". */}
          <button
            ref={triggerRef}
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="min-w-0 flex-1 text-start"
          >
            {/* <bdi>: merknaam en motorregel zijn Latijnse leveranciersdata.
                Zonder isolatie schuift een Arabische pagina "1,2 l" naar het
                eind van de regel — dezelfde reden als de dir="ltr" op de
                kentekenplaat. De uitlijning blijft die van de pagina. */}
            <bdi className="block truncate text-sm font-bold">{name}</bdi>
            {engine && (
              <bdi className="block truncate text-xs text-white/70">
                {engine}
              </bdi>
            )}
            <span className="sr-only">— {t("changeCar")}</span>
          </button>

          <button
            type="button"
            onClick={clearVehicle}
            aria-label={t("clearAria", {
              plate: vehicle.plateFormatted ?? name,
            })}
            className="-me-2 shrink-0 rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
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
      </div>
    </>
  );
}
