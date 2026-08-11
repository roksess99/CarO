"use client";

import { useSyncExternalStore } from "react";
import type { Vehicle } from "@/lib/vehicle/types";

// De gekozen auto leeft in localStorage, net als de winkelwagen: geen
// account nodig en hij blijft staan tussen pagina's. Alleen voertuigdata,
// geen persoonsgegevens van de eigenaar (die kent de API ons ook niet toe).

const STORAGE_KEY = "caro-vehicle";
const VEHICLE_EVENT = "caro-vehicle";
// v2: een auto kan ook zonder kenteken gekozen zijn (merk/model/bouwjaar).
// Opgeslagen auto's van v1 vervallen; dat is een gemaksinstelling, geen
// gegevens die de klant kwijt kan raken.
const SCHEMA_VERSION = 2;

function parseVehicle(json: string | null): Vehicle | null {
  if (!json) return null;
  try {
    const data: unknown = JSON.parse(json);
    if (typeof data !== "object" || data === null) return null;
    const record = data as Record<string, unknown>;
    if (record.v !== SCHEMA_VERSION) return null;
    const vehicle = record.vehicle as Vehicle | undefined;
    // Minimale sanity check; de bron is onze eigen Server Action. Merk en
    // model hebben beide routes altijd — een kenteken alleen de eerste.
    if (!vehicle || !vehicle.brand || !vehicle.model) return null;
    if (vehicle.source === "plate" && !vehicle.plate) return null;
    return vehicle;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(VEHICLE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(VEHICLE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Zelfde JSON → zelfde referentie, voor useSyncExternalStore */
let cachedJson: string | null | undefined;
let cachedVehicle: Vehicle | null = null;

function getSnapshot(): Vehicle | null {
  const json = localStorage.getItem(STORAGE_KEY);
  if (json !== cachedJson) {
    cachedJson = json;
    cachedVehicle = parseVehicle(json);
  }
  return cachedVehicle;
}

export function useVehicle(): Vehicle | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function saveVehicle(vehicle: Vehicle): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ v: SCHEMA_VERSION, vehicle }),
  );
  window.dispatchEvent(new Event(VEHICLE_EVENT));
}

export function clearVehicle(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(VEHICLE_EVENT));
}
