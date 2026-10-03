"use client";

import { useEffect, useState } from "react";
import { cartDelivery } from "@/components/cart/actions";
import { useCart } from "@/components/cart/use-cart";
import type { Cart } from "@/lib/cart/types";

/**
 * De verwachte leverdatum van de hele wagen, met de echte aantallen.
 *
 * **Waarom hier en niet in `useCartParts`.** Die haalt prijzen op, en zonder
 * prijzen is er geen winkelwagen. Een leverdatum is prettig om te weten; valt
 * hij weg, dan hoort de wagen gewoon te werken. Twee aanroepen die los van
 * elkaar kunnen mislukken is hier dus de bedoeling, geen verspilling.
 *
 * Opnieuw ophalen zodra het **aantal** verandert, want daar hangt de datum van
 * af: de goedkoopste groothandel heeft er maar zoveel, en wie er meer bestelt
 * schuift door naar de volgende met een latere datum (GEMETEN 2026-10-03,
 * @docs/api/WEARPARTS.md).
 */
/**
 * Eén vlucht per winkelwagen, gedeeld door elke component die de datum toont.
 * Op het afrekenscherm staan dat er twee — de regel bij het bezorgadres en
 * het besteloverzicht ernaast — en dat zou anders twee keer dezelfde Server
 * Action zijn. Alleen de lópende aanvraag wordt gedeeld, niet het antwoord:
 * dat hoort bij de wagen van dat moment, en de server cachet zelf al een uur.
 */
const openAanvragen = new Map<string, Promise<string | null>>();

function leverdatumVoor(
  key: string,
  items: Cart["items"],
): Promise<string | null> {
  const open = openAanvragen.get(key);
  if (open) return open;
  const aanvraag = cartDelivery(items).catch(() => null);
  openAanvragen.set(key, aanvraag);
  void aanvraag.finally(() => {
    if (openAanvragen.get(key) === aanvraag) openAanvragen.delete(key);
  });
  return aanvraag;
}

export function useCartDelivery(): string | null {
  const cart: Cart = useCart();
  const [resolved, setResolved] = useState<{ key: string; date: string | null }>(
    { key: "", date: null },
  );

  const itemsKey = JSON.stringify(cart.items);

  useEffect(() => {
    const items = JSON.parse(itemsKey) as Cart["items"];
    // Lege wagen: niets op te halen, en bewust géén setState — die toestand
    // wordt hieronder afgeleid. Zelfde opzet als `useCartParts`.
    if (items.length === 0) return;

    let cancelled = false;
    void leverdatumVoor(itemsKey, items).then((date) => {
      if (!cancelled) setResolved({ key: itemsKey, date });
    });
    return () => {
      cancelled = true;
    };
  }, [itemsKey]);

  if (cart.items.length === 0) return null;
  // Hoort het antwoord bij een oudere wagen, dan niets tonen: een datum die
  // bij een ander aantal hoort is erger dan geen datum.
  return resolved.key === itemsKey ? resolved.date : null;
}
