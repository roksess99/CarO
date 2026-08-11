"use server";

import { listModels, listYears } from "@/lib/vehicle/catalog";

/**
 * Modellen en bouwjaren per stap ophalen.
 *
 * De catalogus is ~90 kB; die in zijn geheel naar de browser sturen zou het
 * budget uit .claude/rules/frontend.md ver overschrijden voor data waarvan
 * een klant hooguit één merk gebruikt. Deze acties lezen een lokaal bestand,
 * dus ze kosten geen netwerkverkeer naar buiten en zijn direct klaar.
 */

export async function modelsForMakeAction(make: string): Promise<string[]> {
  return listModels(make).map((model) => model.name);
}

export async function yearsForModelAction(
  make: string,
  model: string,
): Promise<number[]> {
  return listYears(make, model);
}
