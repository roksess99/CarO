"use client";

import { useEffect } from "react";
import { saveCart } from "@/lib/cart/storage";
import { EMPTY_CART } from "@/lib/cart/types";

/**
 * Leegt de winkelwagen na een geslaagde betaling.
 *
 * De wagen leeft in `localStorage`, dus de server kan hem niet legen — dat
 * moet in de browser gebeuren. Pas hier, op de bevestigingspagina, en niet bij
 * het starten van de betaling: breekt de klant het betaalscherm af, dan moet
 * zijn wagen er nog staan.
 */
export function ClearCart() {
  useEffect(() => {
    saveCart(EMPTY_CART);
  }, []);
  return null;
}
