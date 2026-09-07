"use server";

import {
  vehicleDetailsByCarId,
  vehiclesByPlate,
} from "@/lib/catalog/wearparts";
import { lookupVehicleByPlate } from "@/lib/vehicle/overheid-io";
import { isValidPlate, normalizePlate } from "@/lib/vehicle/plate";
import type { Vehicle, VehicleLookupResult } from "@/lib/vehicle/types";

// Enige brug tussen browser en de voertuigbronnen. Een Server Action i.p.v.
// een route handler: geen publiek endpoint dat misbruikt kan worden, en het
// kenteken blijft in de POST-body (nooit in een URL — AVG).
//
// Twee bronnen, en de volgorde is belangrijk:
//
// 1. **Wearparts is leidend.** Die levert het TecDoc-voertuig-id waarmee we
//    passende onderdelen tonen — dat is de kern van de shop.
// 2. **overheid.io/RDW verrijkt.** Kleur, APK en de datum eerste toelating
//    van dít exemplaar; gegevens die Wearparts niet heeft.
//
// Andersom was fout: de RDW-lookup stond eerst en stopte bij een 404. Op de
// gratis tier van overheid.io — een steekproef van 10.000 uit 15 miljoen
// voertuigen — is dat vrijwel elk kenteken, waardoor de zoeker "onbekend
// kenteken" zei terwijl Wearparts de auto wél kende. Gemeten 2026-09-07.

export async function lookupVehicleAction(
  plate: string,
): Promise<VehicleLookupResult> {
  const normalized = normalizePlate(plate);
  if (!isValidPlate(normalized)) {
    return { ok: false, error: "invalidPlate" };
  }

  // Beide bronnen tegelijk; geen van beide mag de ander ophouden.
  const [tecdoc, rdw] = await Promise.all([
    vehiclesByPlate(normalized).catch((error: unknown) => {
      console.error(
        "Wearparts kentekenzoeker faalde:",
        error instanceof Error ? error.message : error,
      );
      return [];
    }),
    lookupVehicleByPlate(normalized),
  ]);

  const match = tecdoc[0];

  // Kent alleen het RDW de auto, dan tonen we die gegevens zonder fitment.
  if (!match) return rdw;

  const details = await vehicleDetailsByCarId(match.carId).catch(() => null);
  const rdwVehicle = rdw.ok ? rdw.vehicle : null;

  // RDW wint waar hij iets heeft: dat is het voertuig van déze klant, terwijl
  // TecDoc het model beschrijft.
  const vehicle: Vehicle = {
    source: "plate",
    plate: normalized,
    plateFormatted: rdwVehicle?.plateFormatted ?? normalized,
    brand: rdwVehicle?.brand || details?.brand || "",
    model: rdwVehicle?.model || details?.model || "",
    vehicleType: rdwVehicle?.vehicleType || details?.bodyType || "",
    firstAdmissionYear: rdwVehicle?.firstAdmissionYear,
    fuel: rdwVehicle?.fuel ?? details?.fuel,
    powerKw: rdwVehicle?.powerKw ?? details?.powerKw,
    engineCapacityCc: rdwVehicle?.engineCapacityCc ?? details?.engineCapacityCc,
    color: rdwVehicle?.color,
    apkExpiry: rdwVehicle?.apkExpiry,
    carId: match.carId,
    carName: details?.type ?? match.name ?? undefined,
  };

  return { ok: true, vehicle };
}
