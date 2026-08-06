import {
  type Cart,
  type CartItem,
  MAX_QUANTITY,
  MIN_QUANTITY,
} from "./types";

// Pure functies; elke operatie geeft een nieuwe Cart terug (immutable,
// zodat React-snapshots referentieel vergelijkbaar blijven).

function clampQuantity(quantity: number): number {
  if (!Number.isInteger(quantity)) {
    quantity = Math.trunc(quantity);
  }
  return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, quantity));
}

export function addItem(cart: Cart, partId: string, quantity = 1): Cart {
  const existing = cart.items.find((i) => i.partId === partId);
  if (existing) {
    return setItemQuantity(cart, partId, existing.quantity + quantity);
  }
  return {
    items: [...cart.items, { partId, quantity: clampQuantity(quantity) }],
  };
}

export function removeItem(cart: Cart, partId: string): Cart {
  return { items: cart.items.filter((i) => i.partId !== partId) };
}

export function setItemQuantity(
  cart: Cart,
  partId: string,
  quantity: number,
): Cart {
  return {
    items: cart.items.map((i) =>
      i.partId === partId ? { ...i, quantity: clampQuantity(quantity) } : i,
    ),
  };
}

export function countItems(cart: Cart): number {
  return cart.items.reduce((sum, i) => sum + i.quantity, 0);
}

/** Subtotaal in eurocenten (integer-rekenwerk, incl. btw omdat prijzen dat zijn) */
export function subtotalCents(
  entries: ReadonlyArray<{ quantity: number; priceCents: number }>,
): number {
  return entries.reduce((sum, e) => sum + e.quantity * e.priceCents, 0);
}

// TODO fase 4: serverside herberekening + voorraadcheck bij het plaatsen van
// een order. De client-subtotalen hieronder zijn alleen weergave.

export function isValidCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.partId === "string" &&
    item.partId.length > 0 &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity >= MIN_QUANTITY &&
    item.quantity <= MAX_QUANTITY
  );
}
