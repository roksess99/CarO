"use server";

import { isValidCartItem } from "@/lib/cart/cart";
import type { CartItem } from "@/lib/cart/types";
import { getCatalogProvider } from "@/lib/catalog/provider";
import type { Part } from "@/lib/catalog/types";

// De wagen leeft client-side, dus de server weet niet wat erin zit. Deze
// Server Action zoekt precies de artikelen op die de klant heeft gekozen.
//
// Waarom niet de hele catalogus meesturen: /items geeft altijd één
// categorie per aanroep. Een artikel uit een ándere categorie zat dan niet
// in de lijst en verdween uit de wagen. Opzoeken op id kent dat probleem niet.
export async function lookupCartParts(items: unknown): Promise<Part[]> {
  if (!Array.isArray(items)) return [];
  // Input uit de browser: valideren voordat we ermee de API in gaan
  const valid = items.filter((item): item is CartItem => isValidCartItem(item));
  if (valid.length === 0) return [];

  const provider = getCatalogProvider();
  const found = await Promise.all(
    valid.map((item) => provider.getPartById(item.family, item.partId)),
  );
  return found.filter((part): part is Part => part !== null);
}
