// TODO fase 4: order aanmaken in de database (PostgreSQL + Prisma) en
// inkoop bij de groothandel via Tyre24 POST /order (docs/api/TYRE24.md).
// TODO fase 5: betaling via Mollie (iDEAL) vóór het plaatsen van de order.
// Inputs straks: CheckoutDetails (lib/checkout/schema) + Cart (lib/cart/types).
// Tot die tijd bestaat dit alleen zodat de checkout er al tegenaan kan praten.
export function placeOrder(): never {
  throw new Error("Bestellen is nog niet beschikbaar (fase 4/5).");
}
