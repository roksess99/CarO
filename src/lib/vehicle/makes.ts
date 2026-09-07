import { vehicleMakes } from "@/lib/catalog/wearparts";

/**
 * Merken voor de autokiezer, uit TecDoc.
 *
 * De kiezer moet uitkomen op een `carId`, dus merk, model en uitvoering komen
 * alle drie uit dezelfde boom (docs/api/WEARPARTS.md). Er was een vangnet uit
 * RDW open data, maar dat leverde alleen merknamen: de vervolgstappen konden
 * er niets mee, dus dat eindigde in een doodlopende keuzelijst. Valt de API
 * weg, dan is de lijst leeg en blijft de kentekenzoeker over.
 */
export async function vehicleMakeNames(): Promise<string[]> {
  try {
    return (await vehicleMakes()).map((make) => make.name);
  } catch (error) {
    console.error(
      "Merkenlijst uit Wearparts faalde:",
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}
