"use server";

import { isValidCartItem } from "@/lib/cart/cart";
import type { CartItem } from "@/lib/cart/types";
import { expectedDeliveryForAll } from "@/lib/catalog/delivery";
import { loadPartById } from "@/lib/catalog/lookup";
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

  const found = await Promise.all(
    valid.map((item) => loadPartById(item.family, item.partId)),
  );
  return found.filter((part): part is Part => part !== null);
}

/**
 * De verwachte leverdatum van de hele wagen, met de echte aantallen.
 *
 * Apart van `lookupCartParts`: prijzen moeten er zijn, een leverdatum is
 * extra. Mislukt dit, dan is het antwoord `null` en toont de wagen er niets
 * over — geen "onbekend", geen foutmelding. Een levertijd die je niet kunt
 * onderbouwen beloof je niet.
 *
 * Het aantal gaat mee, want de datum hangt ervan af: wie er meer bestelt dan
 * de goedkoopste groothandel heeft, schuift door naar de volgende met een
 * latere datum (GEMETEN 2026-10-03).
 */
export async function cartDelivery(items: unknown): Promise<string | null> {
  if (!Array.isArray(items)) return null;
  const valid = items.filter((item): item is CartItem => isValidCartItem(item));
  if (valid.length === 0) return null;

  try {
    const lines = await Promise.all(
      valid.map(async (item) => {
        const part = await loadPartById(item.family, item.partId);
        return part ? { part, quantity: item.quantity } : null;
      }),
    );
    const found = lines.filter(
      (line): line is { part: Part; quantity: number } => line !== null,
    );
    if (found.length !== valid.length) return null;
    return await expectedDeliveryForAll(found);
  } catch {
    return null;
  }
}
