import type { ProductFamily } from "../catalog/families";

// Winkelwagen-datacontract. Framework-onafhankelijk: geen React, geen Next.
// De wagen bewaart id + familie + aantal; naam en prijs komen altijd vers
// uit de catalogus zodat een prijswijziging nooit een oude prijs afrekent.
// De familie moet mee: zonder die weten we niet in welke productArea we
// het artikel moeten opzoeken.

export interface CartItem {
  partId: string;
  family: ProductFamily;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
}

export const EMPTY_CART: Cart = { items: [] };

export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99;
