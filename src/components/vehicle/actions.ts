"use server";

import { lookupVehicleByPlate } from "@/lib/vehicle/overheid-io";
import type { VehicleLookupResult } from "@/lib/vehicle/types";

// Enige brug tussen browser en overheid.io. Een Server Action i.p.v. een
// route handler: geen publiek endpoint dat misbruikt kan worden, en het
// kenteken blijft in de POST-body (nooit in een URL — AVG).
export async function lookupVehicleAction(
  plate: string,
): Promise<VehicleLookupResult> {
  return lookupVehicleByPlate(plate);
}
