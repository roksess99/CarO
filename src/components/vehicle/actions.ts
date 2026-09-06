"use server";

import { vehiclesByPlate } from "@/lib/catalog/wearparts";
import { lookupVehicleByPlate } from "@/lib/vehicle/overheid-io";
import type { VehicleLookupResult } from "@/lib/vehicle/types";

// Enige brug tussen browser en de voertuigbronnen. Een Server Action i.p.v.
// een route handler: geen publiek endpoint dat misbruikt kan worden, en het
// kenteken blijft in de POST-body (nooit in een URL — AVG).
//
// Twee bronnen, elk voor iets anders:
// - overheid.io/RDW levert de gegevens die de klant herkent (merk, model,
//   brandstof, vermogen, APK);
// - Wearparts levert het TecDoc-voertuig-id waarmee we passende onderdelen
//   kunnen tonen.
// Valt de tweede weg, dan werkt de zoeker gewoon; de klant ziet dan alleen
// geen onderdelen op maat.
export async function lookupVehicleAction(
  plate: string,
): Promise<VehicleLookupResult> {
  const result = await lookupVehicleByPlate(plate);
  if (!result.ok) return result;

  try {
    const matches = await vehiclesByPlate(plate);
    const match = matches[0];
    if (match) {
      return {
        ...result,
        vehicle: {
          ...result.vehicle,
          carId: match.carId,
          carName: match.name || undefined,
        },
      };
    }
  } catch (error) {
    console.error(
      "Wearparts kentekenzoeker faalde:",
      error instanceof Error ? error.message : error,
    );
  }
  return result;
}
