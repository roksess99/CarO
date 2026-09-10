// Hoe de gekozen auto heet in de UI. Eén plek, want die regel staat op vier
// plekken tegelijk: de knop in de header, de balk op mobiel, de bevestiging
// in de kentekenzoeker en de passendheidsbadge op de productpagina. Stonden
// ze los, dan verschilde de auto per hoek van het scherm.

import type { Vehicle } from "./types";

/**
 * Merk en model: "VW Golf 7". Altijd gevuld — beide routes naar een auto
 * leveren ze (zie use-vehicle.ts).
 */
export function vehicleName(vehicle: Pick<Vehicle, "brand" | "model">): string {
  return `${vehicle.brand} ${vehicle.model}`.trim();
}

/**
 * Zelfde woord, los van hoofdletters en accenten. Nodig omdat de twee bronnen
 * dezelfde auto anders spellen: het RDW schrijft "CITROEN", TecDoc "CITROËN".
 * Zonder deze vergelijking ziet de filter hieronder die twee als verschillende
 * woorden en blijft het merk dubbel in beeld staan.
 *
 * `sensitivity: "base"` doet precies dit werk in de taalvergelijker van de
 * browser — geen eigen tabel met accenttekens die per taal weer anders ligt.
 */
function sameWord(a: string, b: string): boolean {
  return a.localeCompare(b, "nl", { sensitivity: "base" }) === 0;
}

function words(text: string): string[] {
  return text.split(/[\s/,]+/).filter(Boolean);
}

/**
 * De uitvoering uit `carName`, zonder wat merk en model al zeggen:
 * "CITROËN C3 AIRCROSS II (2R_, 2C_) 1.2 PureTech 110" wordt
 * "1.2 PureTech 110". Dát stukje onderscheidt een Golf 1.5 TSI van een Golf
 * 2.0 TDI, en bepaalt dus welke onderdelen passen.
 *
 * Twee stappen, in deze volgorde:
 *
 * 1. Vanaf de cilinderinhoud — het eerste getal met een decimaal — tot het
 *    eind. Dat is bij vrijwel elke verbrandingsmotor precies de motorregel.
 * 2. Heeft de naam die niet (elektrisch: "VW ID.3 Pro"), dan halen we de
 *    woorden weg die in merk en model al staan en houden we over wat nieuw
 *    is.
 *
 * Blijft er niets over, dan `null` — liever geen tweede regel dan het merk
 * er twee keer onder zetten. Dat gebeurde met "CHEVROLET AVEO / KALOS
 * Hatchback 1.2": de hele naam kwam als "uitvoering" achter de autonaam.
 */
export function vehicleTrim(
  vehicle: Pick<Vehicle, "brand" | "model" | "carName">,
): string | null {
  const raw = vehicle.carName?.trim();
  if (!raw) return null;

  // Het typenummer tussen haakjes hoort bij het model, niet bij de motor.
  const clean = raw.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const parts = words(clean);

  const engineAt = parts.findIndex((word) => /^\d+[.,]\d/.test(word));
  if (engineAt !== -1) return parts.slice(engineAt).join(" ");

  // Het eerste woord van `carName` is altijd de fabrikant. Dat woord er
  // sowieso af, want de twee bronnen spellen hem verschillend: het RDW
  // schrijft "VOLKSWAGEN", TecDoc "VW". Zonder deze regel bleef er van
  // "VW ID.3 Pro Performance" een uitvoering "VW Pro Performance" over.
  const known = words(vehicleName(vehicle));
  const rest = parts
    .slice(1)
    .filter((word) => !known.some((item) => sameWord(item, word)));
  return rest.length > 0 ? rest.join(" ") : null;
}

/**
 * Volledige regel voor koppen en badges: "VW Golf 7 · 1.5 TSI · 2021".
 *
 * Middelpunt en geen streepje: het bouwjaar is een derde gegeven, niet een
 * bijzin. Ontbrekende delen vallen weg in plaats van een leeg scheidingsteken
 * achter te laten — bij een auto zonder kenteken kennen we het bouwjaar niet.
 */
export function vehicleLabel(
  vehicle: Pick<
    Vehicle,
    "brand" | "model" | "carName" | "firstAdmissionYear"
  >,
): string {
  return [
    vehicleName(vehicle),
    vehicleTrim(vehicle),
    vehicle.firstAdmissionYear?.toString(),
  ]
    .filter(Boolean)
    .join(" · ");
}
