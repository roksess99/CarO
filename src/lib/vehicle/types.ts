// Voertuigcontract. Wat de UI van een auto nodig heeft — niet de ~60 velden
// die de RDW-dataset teruggeeft. De adapter vertaalt (zie overheid-io.ts).

/**
 * Hoe de klant zijn auto heeft opgegeven. Bepaalt wat we zeker weten:
 * bij een kenteken komt alles uit de RDW-registratie, bij een handmatige
 * keuze weten we alleen merk, model en bouwjaar.
 */
export type VehicleSource = "plate" | "manual";

export interface Vehicle {
  source: VehicleSource;
  /** Genormaliseerd, zonder streepjes: "RZ874H". Ontbreekt bij "manual". */
  plate?: string;
  /** Zoals de RDW het schrijft: "RZ-874-H". Ontbreekt bij "manual". */
  plateFormatted?: string;
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
  /**
   * TecDoc-voertuig-id uit de Wearparts-API. Hiermee tonen we onderdelen die
   * op déze auto passen; zonder dit id kan de catalogus alleen zoeken op naam
   * (docs/api/WEARPARTS.md).
   */
  carId?: number;
  /** Voertuignaam zoals TecDoc hem schrijft, bv. "CITROËN C3 AIRCROSS II 1.2" */
  carName?: string;
}

export type VehicleLookupError =
  | "invalidPlate"
  | "notFound"
  /** Netwerk, ontbrekende sleutel, rate limit, onverwacht antwoord */
  | "unavailable";

export type VehicleLookupResult =
  | { ok: true; vehicle: Vehicle }
  | { ok: false; error: VehicleLookupError };
