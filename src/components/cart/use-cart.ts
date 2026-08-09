"use client";

import { useSyncExternalStore } from "react";
import { addItem, removeItem, setItemQuantity } from "@/lib/cart/cart";
import {
  getCartSnapshot,
  loadCart,
  saveCart,
  subscribeToCart,
} from "@/lib/cart/storage";
import { type Cart, EMPTY_CART } from "@/lib/cart/types";
import type { Part } from "@/lib/catalog/types";

// localStorage ís de store; React abonneert zich er alleen op. Server-
// snapshot is de lege wagen — na hydration verschijnt de echte inhoud.
export function useCart(): Cart {
  return useSyncExternalStore(subscribeToCart, getCartSnapshot, () => EMPTY_CART);
}

// Acties lezen altijd de actuele opgeslagen staat (niet de render-snapshot),
// zodat twee snelle kliks elkaar niet overschrijven.
export function addToCart(part: Part, quantity = 1): void {
  saveCart(addItem(loadCart(), part.id, part.family, quantity));
}

export function removeFromCart(partId: string): void {
  saveCart(removeItem(loadCart(), partId));
}

export function setCartQuantity(partId: string, quantity: number): void {
  if (quantity <= 0) {
    removeFromCart(partId);
    return;
  }
  saveCart(setItemQuantity(loadCart(), partId, quantity));
}
