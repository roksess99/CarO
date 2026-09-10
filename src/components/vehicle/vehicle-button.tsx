"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { clearVehicle, useVehicle } from "@/components/vehicle/use-vehicle";
import { VehicleFinder } from "@/components/vehicle/vehicle-finder";
import { vehicleName, vehicleTrim } from "@/lib/vehicle/label";

/**
 * Vaste plek in de header om je auto op te geven of te wisselen.
 *
 * Grote onderdelenshops zetten dit naast het logo, vóór de zoekbalk: het is
 * de eerste stap van vrijwel elke aankoop. Zonder auto staat er een
 * uitnodiging, met auto het merk en model.
 *
 * Het paneel hangt onder de knop in plaats van in een modaal venster: de
 * klant blijft zo zien waar hij was.
 */
export function VehicleButton({ makes }: { makes: string[] }) {
  const t = useTranslations("vehicle");
  const vehicle = useVehicle();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Uitvoering en bouwjaar onder de merknaam: dát onderscheidt een Golf
  // 1.5 TSI van een Golf 2.0 TDI, en dus welke onderdelen passen.
  const detail = vehicle
    ? [vehicleTrim(vehicle), vehicle.firstAdmissionYear?.toString()]
        .filter(Boolean)
        .join(" · ")
    : "";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        // Met auto is dit geen actieknop meer maar een statusregel: een
        // rustig kaartvlak met het oranje autootje als accent, zodat het
        // oranje in de header van de winkelwagenknop blijft en niet met de
        // gekozen auto concurreert. Twee regels, want merk plus uitvoering
        // past niet op één.
        //
        // Themakleuren en geen vast donker vlak: `bg-caro-ink` zou in lichte
        // modus als een fout lezen (.claude/rules/frontend.md).
        className={
          vehicle
            ? "flex h-11 max-w-64 items-center gap-2 rounded-md bg-surface px-3 text-foreground ring-1 ring-border"
            : "flex h-11 max-w-56 items-center gap-2 rounded-md bg-caro-orange px-3 font-semibold text-caro-ink"
        }
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`size-5 shrink-0 ${vehicle ? "text-caro-orange" : ""}`}
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
        {vehicle ? (
          <span className="min-w-0 text-start">
            {/* <bdi>: merknaam en motoraanduiding zijn Latijnse
                leveranciersdata, net als in vehicle-bar.tsx */}
            <bdi className="block truncate text-sm leading-tight font-bold">
              {vehicleName(vehicle)}
            </bdi>
            {detail && (
              <bdi className="block truncate text-xs leading-tight text-muted">
                {detail}
              </bdi>
            )}
          </span>
        ) : (
          <span className="truncate text-sm">{t("addVehicle")}</span>
        )}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("addVehicle")}
          // Rechts uitlijnen zodat het paneel op smalle schermen niet buiten
          // beeld valt; de breedte volgt het venster met een bovengrens.
          className="absolute top-full start-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-border bg-background p-4 shadow-xl"
        >
          <VehicleFinder makes={makes} onSelected={() => setOpen(false)} />
          {vehicle && (
            <button
              type="button"
              onClick={() => {
                clearVehicle();
                setOpen(false);
              }}
              className="mt-3 text-sm text-muted underline underline-offset-4 hover:text-foreground"
            >
              {t("changeCar")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
