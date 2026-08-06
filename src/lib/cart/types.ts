// Winkelwagen-datacontract. Framework-onafhankelijk: geen React, geen Next.
// De wagen bewaart alleen id + aantal; prijs en naam komen altijd vers uit
// de catalogus zodat een prijswijziging nooit een oude prijs afrekent.

export interface CartItem {
  partId: string;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
}

export const EMPTY_CART: Cart = { items: [] };

export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99;
