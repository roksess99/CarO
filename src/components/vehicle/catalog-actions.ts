"use server";

import {
  vehicleMakes,
  vehicleModels,
  vehicleTypes,
} from "@/lib/catalog/wearparts";

/**
 * De autokiezer zonder kenteken, gevoed door TecDoc (Wearparts-API).
 *
 * Was eerst een uit RDW open data geoogste merk/model-lijst. Die leverde wel
 * herkenbare namen, maar geen `carId` — en zonder dat id kan de shop geen
 * passende onderdelen tonen. Nu loopt de keuze door dezelfde boom die ook
 * achter de kentekenzoeker zit, zodat beide routes op hetzelfde uitkomen:
 * merk → model → uitvoering → carId.
 *
 * De client werkt met namen in plaats van id's; het vertalen naar id's
 * gebeurt hier, op de gecachte merken- en modellenlijst.
 */

async function makeIdByName(name: string): Promise<number | null> {
  const makes = await vehicleMakes();
  const match = makes.find(
    (make) => make.name.toLowerCase() === name.trim().toLowerCase(),
  );
  return match?.id ?? null;
}

async function modelIdByName(
  manuId: number,
  name: string,
): Promise<number | null> {
  const models = await vehicleModels(manuId);
  const match = models.find(
    (model) => model.name.toLowerCase() === name.trim().toLowerCase(),
  );
  return match?.id ?? null;
}

export async function makesAction(): Promise<string[]> {
  return (await vehicleMakes()).map((make) => make.name);
}

export async function modelsForMakeAction(make: string): Promise<string[]> {
  const manuId = await makeIdByName(make);
  if (manuId === null) return [];
  // Dubbele modelnamen bestaan (verschillende bouwperioden); de keuzelijst
  // toont ze één keer, de uitvoeringstap maakt het onderscheid alsnog.
  return [...new Set((await vehicleModels(manuId)).map((model) => model.name))];
}

export interface VehicleTypeOption {
  carId: number;
  /** Wat de klant leest: "1.2 PureTech 110 · Benzine · 81 kW · 2017–" */
  label: string;
  fuel?: string;
  powerKw?: number;
  engineCapacityCc?: number;
  bodyType?: string;
}

/** JJJJMM → "2017" */
function year(value: number | undefined): string {
  const text = value ? String(value) : "";
  return /^\d{6}$/.test(text) ? text.slice(0, 4) : "";
}

export async function typesForModelAction(
  make: string,
  model: string,
): Promise<VehicleTypeOption[]> {
  const manuId = await makeIdByName(make);
  if (manuId === null) return [];
  const modelId = await modelIdByName(manuId, model);
  if (modelId === null) return [];

  return (await vehicleTypes(manuId, modelId)).map((type) => {
    const from = year(type.from);
    const until = year(type.until);
    const period = from ? `${from}–${until}` : "";
    return {
      carId: type.carId,
      label: [
        type.name,
        type.fuel,
        type.powerKw ? `${type.powerKw} kW` : undefined,
        period || undefined,
      ]
        .filter(Boolean)
        .join(" · "),
      fuel: type.fuel,
      powerKw: type.powerKw,
      engineCapacityCc: type.engineCapacityCc,
      bodyType: type.bodyType,
    };
  });
}
