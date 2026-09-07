import { vehicleMakes } from "@/lib/catalog/wearparts";
import { listMakes } from "@/lib/vehicle/catalog";

/**
 * Merken voor de autokiezer.
 *
 * Uit TecDoc, want de kiezer moet uitkomen op een `carId` en dan moeten merk,
 * model en uitvoering uit dezelfde boom komen. De uit RDW open data geoogste
 * lijst blijft als vangnet: valt de API weg, dan kan de klant nog steeds een
 * auto kiezen — alleen zonder passende onderdelen.
 */
export async function vehicleMakeNames(): Promise<string[]> {
  try {
    const makes = await vehicleMakes();
    if (makes.length > 0) return makes.map((make) => make.name);
  } catch (error) {
    console.error(
      "Merkenlijst uit Wearparts faalde:",
      error instanceof Error ? error.message : error,
    );
  }
  return listMakes();
}
