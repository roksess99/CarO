"use client";

import { useEffect, useState } from "react";
import { lookupCartParts } from "@/components/cart/actions";
import { useCart } from "@/components/cart/use-cart";
import type { Cart } from "@/lib/cart/types";
import type { Part } from "@/lib/catalog/types";

export interface CartEntry {
  part: Part;
  quantity: number;
}

/**
 * Zet de winkelwagen (id's in localStorage) om naar echte artikelen via de
 * Server Action. Laadt opnieuw zodra de wagen wijzigt.
 */
export function useCartParts(): { entries: CartEntry[]; loading: boolean } {
  const cart: Cart = useCart();
  // De opgehaalde artikelen mét de wagen-inhoud waarvoor ze gelden. Zo weten
  // we of het resultaat nog actueel is na een wijziging.
  const [resolved, setResolved] = useState<{ key: string; parts: Part[] } | null>(
    null,
  );

  const itemsKey = JSON.stringify(cart.items);

  useEffect(() => {
    const items = JSON.parse(itemsKey) as Cart["items"];
    // Lege wagen: niets op te halen. Bewust géén setState hier — die
    // toestand wordt hieronder afgeleid.
    if (items.length === 0) return;

    let cancelled = false;
    lookupCartParts(items)
      .then((parts) => {
        if (!cancelled) setResolved({ key: itemsKey, parts });
      })
      .catch(() => {
        if (!cancelled) setResolved({ key: itemsKey, parts: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [itemsKey]);

  if (cart.items.length === 0) {
    return { entries: [], loading: false };
  }
  // Nog niets opgehaald, of het resultaat hoort bij een oudere wagen
  if (resolved?.key !== itemsKey) {
    return { entries: [], loading: true };
  }

  const partById = new Map(resolved.parts.map((p) => [p.id, p]));
  // Artikelen die niet (meer) bestaan tonen we niet; ze verdwijnen
  // definitief zodra de klant de wagen aanpast.
  const entries = cart.items.flatMap((item) => {
    const part = partById.get(item.partId);
    return part ? [{ part, quantity: item.quantity }] : [];
  });

  return { entries, loading: false };
}
