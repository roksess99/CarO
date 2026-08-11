import { z } from "zod";
import { isValidPlate, normalizePlate } from "./plate";
import type { Vehicle, VehicleLookupResult } from "./types";

// overheid.io-adapter voor RDW-voertuiggegevens (docs/api/OVERHEID-IO.md).
// Draait UITSLUITEND server-side: de API-sleutel is een secret.
// Een kenteken is persoonsgegeven (AVG) — nooit in een URL of logregel.

const BASE_URL = "https://api.overheid.io/voertuiggegevens";

// Alleen de velden die we gebruiken; de dataset heeft er ~60.
// Numerieke velden komen als getal, maar zekerheidshalve coerce.
const brandstofSchema = z.object({
  brandstof_omschrijving: z.string().optional(),
  nettomaximumvermogen: z.coerce.number().optional(),
});

const vehicleResponseSchema = z.object({
  kenteken: z.string().optional(),
  kentekenplaat: z.string().optional(),
  merk: z.string().optional(),
  handelsbenaming: z.string().optional(),
  voertuigsoort: z.string().optional(),
  datum_eerste_toelating: z.string().optional(),
  eerste_kleur: z.string().optional(),
  cilinderinhoud: z.coerce.number().optional(),
  vervaldatum_apk: z.string().optional(),
  brandstof: z.array(brandstofSchema).optional(),
});

function toVehicle(
  raw: z.infer<typeof vehicleResponseSchema>,
  fallbackPlate: string,
): Vehicle {
  const plate = raw.kenteken ? normalizePlate(raw.kenteken) : fallbackPlate;
  const fuel = raw.brandstof?.[0];
  // "2018-02-26" → 2018
  const year = raw.datum_eerste_toelating?.slice(0, 4);

  return {
    source: "plate",
    plate,
    plateFormatted: raw.kentekenplaat ?? plate,
    brand: raw.merk ?? "",
    model: raw.handelsbenaming ?? "",
    vehicleType: raw.voertuigsoort ?? "",
    firstAdmissionYear: year && /^\d{4}$/.test(year) ? Number(year) : undefined,
    fuel: fuel?.brandstof_omschrijving,
    powerKw: fuel?.nettomaximumvermogen,
    engineCapacityCc: raw.cilinderinhoud,
    color: raw.eerste_kleur,
    apkExpiry: raw.vervaldatum_apk,
  };
}

export async function lookupVehicleByPlate(
  input: string,
): Promise<VehicleLookupResult> {
  if (typeof window !== "undefined") {
    throw new Error("overheid-io mag nooit in de browser draaien");
  }

  const plate = normalizePlate(input);
  if (!isValidPlate(plate)) {
    return { ok: false, error: "invalidPlate" };
  }

  const apiKey = process.env.OVERHEID_IO_API_KEY;
  if (!apiKey) {
    // Geen sleutel → functie is niet beschikbaar, geen harde crash
    return { ok: false, error: "unavailable" };
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/${plate}`, {
      headers: { "ovio-api-key": apiKey },
      // Voertuiggegevens wijzigen zelden; dag-cache spaart de rate limit
      next: { revalidate: 86_400 },
    });
  } catch {
    return { ok: false, error: "unavailable" };
  }

  if (response.status === 404) {
    return { ok: false, error: "notFound" };
  }
  if (!response.ok) {
    // Kenteken bewust niet meeloggen (AVG)
    console.error(`overheid.io: HTTP ${response.status}`);
    return { ok: false, error: "unavailable" };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { ok: false, error: "unavailable" };
  }

  const parsed = vehicleResponseSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: "unavailable" };
  }
  // Zonder merk is het antwoord voor ons waardeloos
  if (!parsed.data.merk) {
    return { ok: false, error: "notFound" };
  }

  return { ok: true, vehicle: toVehicle(parsed.data, plate) };
}
