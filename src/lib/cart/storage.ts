import { isValidCartItem } from "./cart";
import { type Cart, EMPTY_CART } from "./types";

// localStorage-adapter voor de winkelwagen (fase 2: puur client-side).
// Browser-API's, maar geen React — de React-binding zit in
// src/components/cart/use-cart.ts.

const STORAGE_KEY = "caro-cart";
/** Zelfde tab: "storage" vuurt alleen in ándere tabs, dus eigen event */
export const CART_EVENT = "caro-cart";
const SCHEMA_VERSION = 1;

// localStorage is externe input: alles wat niet exact klopt → lege wagen.
// Handmatige validatie i.p.v. Zod zolang die dependency er nog niet in zit.
export function parseCart(json: string | null): Cart {
  if (!json) return EMPTY_CART;
  try {
    const data: unknown = JSON.parse(json);
    if (typeof data !== "object" || data === null) return EMPTY_CART;
    const record = data as Record<string, unknown>;
    if (record.v !== SCHEMA_VERSION || !Array.isArray(record.items)) {
      return EMPTY_CART;
    }
    return { items: record.items.filter(isValidCartItem) };
  } catch {
    return EMPTY_CART;
  }
}

export function loadCart(): Cart {
  return parseCart(localStorage.getItem(STORAGE_KEY));
}

export function saveCart(cart: Cart): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ v: SCHEMA_VERSION, items: cart.items }),
  );
  window.dispatchEvent(new Event(CART_EVENT));
}

export function subscribeToCart(onChange: () => void): () => void {
  window.addEventListener(CART_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CART_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Voor useSyncExternalStore: zelfde JSON → zelfde referentie */
let cachedJson: string | null | undefined;
let cachedCart: Cart = EMPTY_CART;

export function getCartSnapshot(): Cart {
  const json = localStorage.getItem(STORAGE_KEY);
  if (json !== cachedJson) {
    cachedJson = json;
    cachedCart = parseCart(json);
  }
  return cachedCart;
}
