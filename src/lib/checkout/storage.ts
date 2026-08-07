import { checkoutDetailsSchema, type CheckoutDetails } from "./schema";

// localStorage-opslag van checkoutgegevens (fase 2/3: puur client-side).
// Fase 4 vervangt dit door orders in de database. Geen React hierin.

const STORAGE_KEY = "caro-checkout";
const SCHEMA_VERSION = 1;

// localStorage is externe input: alles wat niet valideert → null
export function loadCheckoutDetails(): CheckoutDetails | null {
  const json = localStorage.getItem(STORAGE_KEY);
  if (!json) return null;
  try {
    const data: unknown = JSON.parse(json);
    if (typeof data !== "object" || data === null) return null;
    const record = data as Record<string, unknown>;
    if (record.v !== SCHEMA_VERSION) return null;
    const parsed = checkoutDetailsSchema.safeParse(record.details);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveCheckoutDetails(details: CheckoutDetails): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ v: SCHEMA_VERSION, details }),
  );
}
