// Voertuigcontract. Wat de UI van een auto nodig heeft — niet de ~60 velden
// die de RDW-dataset teruggeeft. De adapter vertaalt (zie overheid-io.ts).

export interface Vehicle {
  /** Genormaliseerd, zonder streepjes: "RZ874H" */
  plate: string;
  /** Zoals de RDW het schrijft: "RZ-874-H" */
  plateFormatted: string;
  brand: string;
  /** handelsbenaming, bv. "MCLAREN 720S COUPE" */
  model: string;
  /** voertuigsoort, bv. "Personenauto" */
  vehicleType: string;
  /** Bouwjaar uit datum_eerste_toelating */
  firstAdmissionYear?: number;
  fuel?: string;
  /** Netto maximumvermogen in kW */
  powerKw?: number;
  /** Cilinderinhoud in cm³ */
  engineCapacityCc?: number;
  color?: string;
  /** ISO-datum, bv. "2024-02-26" */
  apkExpiry?: string;
}

export type VehicleLookupError =
  | "invalidPlate"
  | "notFound"
  /** Netwerk, ontbrekende sleutel, rate limit, onverwacht antwoord */
  | "unavailable";

export type VehicleLookupResult =
  | { ok: true; vehicle: Vehicle }
  | { ok: false; error: VehicleLookupError };
