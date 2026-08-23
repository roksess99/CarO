"use server";

import { lookupCartParts } from "@/components/cart/actions";
import { isValidCartItem } from "@/lib/cart/cart";
import type { CartItem } from "@/lib/cart/types";
import { buildOrderDocument } from "@/lib/checkout/order-document";
import { renderOrderPdf } from "@/lib/checkout/order-pdf";
import { validateCheckoutDetails } from "@/lib/checkout/schema";

// De orderbevestiging wordt server-side gemaakt, niet in de browser. Twee
// redenen: de prijzen moeten vers uit de catalogus komen (een klant kan
// localStorage aanpassen) en straks stuurt dezelfde functie het document als
// bijlage mee — zie TODO onderaan.

export type OrderPdfResult =
  | { ok: true; fileName: string; base64: string }
  | { ok: false; error: "invalidDetails" | "emptyCart" | "failed" };

export async function createOrderPdf(
  rawDetails: unknown,
  rawItems: unknown,
): Promise<OrderPdfResult> {
  const details = validateCheckoutDetails(rawDetails);
  if (!details.success) return { ok: false, error: "invalidDetails" };

  if (!Array.isArray(rawItems)) return { ok: false, error: "emptyCart" };
  const items = rawItems.filter((item): item is CartItem =>
    isValidCartItem(item),
  );
  if (items.length === 0) return { ok: false, error: "emptyCart" };

  try {
    const parts = await lookupCartParts(items);
    const partById = new Map(parts.map((part) => [part.id, part]));
    // Prijs en naam komen uit de catalogus, het aantal uit de wagen
    const entries = items.flatMap((item) => {
      const part = partById.get(item.partId);
      return part
        ? [
            {
              name: part.name,
              brand: part.brand,
              oeNumber: part.oeNumber,
              priceCents: part.priceCents,
              quantity: item.quantity,
            },
          ]
        : [];
    });
    if (entries.length === 0) return { ok: false, error: "emptyCart" };

    const order = buildOrderDocument({ details: details.data, entries });
    const bytes = await renderOrderPdf(order);

    // TODO fase 4/5: order opslaan (Prisma) en dit document als bijlage naar
    // de klant én naar het bedrijfsadres mailen zodra dat adres bekend is.
    return {
      ok: true,
      fileName: `orderbevestiging-${order.reference}.pdf`,
      base64: Buffer.from(bytes).toString("base64"),
    };
  } catch {
    // Een kapotte catalogus-call mag de checkout niet opblazen
    return { ok: false, error: "failed" };
  }
}
