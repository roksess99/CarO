"use server";

import { z } from "zod";
import { usesVehicleCatalog, type ProductFamily } from "@/lib/catalog/families";
import { articleFitsVehicle } from "@/lib/catalog/wearparts";
import { groupIdFromSlug } from "@/lib/catalog/wearparts-provider";

/**
 * Uitkomst van de passendheidscontrole.
 *
 * `unknown` is een volwaardig antwoord en geen fout: bij banden bestaat er
 * geen voertuigkoppeling, en bij een artikel dat via het zoekveld gevonden is
 * draagt de URL geen assemblagegroep. De badge zegt dan "controleer de
 * passing" — dat is waar, en beter dan een gok.
 */
export type FitmentResult = "fits" | "doesNotFit" | "unknown";

const inputSchema = z.object({
  articleId: z.string().min(1).max(64),
  categorySlug: z.string().min(1).max(120),
  carId: z.number().int().positive(),
});

/**
 * Past dit artikel op de auto van deze bezoeker?
 *
 * De auto leeft in localStorage en is dus pas ná hydratie bekend; daarom een
 * actie vanuit de browser en geen server-side render. De catalogus-call
 * hangt achter een cache van vijf minuten, zodat een populaire productpagina
 * de limiet van 100 calls per minuut niet opeet.
 */
export async function checkFitmentAction(
  family: ProductFamily,
  articleId: string,
  categorySlug: string,
  carId: number,
): Promise<FitmentResult> {
  // Alleen onderdelen hangen aan een TecDoc-voertuig. Banden passen op een
  // maat, velgen en toebehoren zoeken op merknaam — geen van drieën levert
  // een hard ja of nee (lib/catalog/vehicle-match.ts).
  if (!usesVehicleCatalog(family)) return "unknown";

  const input = inputSchema.safeParse({ articleId, categorySlug, carId });
  if (!input.success) return "unknown";

  const categoryId = groupIdFromSlug(input.data.categorySlug);
  if (categoryId === null) return "unknown";

  const fits = await articleFitsVehicle(
    input.data.articleId,
    input.data.carId,
    categoryId,
  );
  if (fits === null) return "unknown";
  return fits ? "fits" : "doesNotFit";
}
