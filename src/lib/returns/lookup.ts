import { readOrder } from "@/lib/orders/store";
import type { StoredOrder } from "@/lib/orders/types";
import {
  returnableLines,
  withdrawalDeadline,
  type ReturnableLine,
} from "./eligibility";
import { hasOpenReturn, returnedQuantities } from "./store";

/**
 * Wie mag een retour aanmelden, en wat mag hij dan zien.
 *
 * **Waarom er altijd twee gegevens nodig zijn.** Een ordernummer is
 * `CARO-20260924-G5QG`: de datum is te raden en er blijven vier tekens over.
 * Een formulier dat op een kaal nummer antwoordt "deze bestelling bestaat en
 * is betaald" is dus een raadmachine waarmee af te lezen valt dat er op een
 * bepaalde dag besteld is. Daarom **ordernummer + het mailadres waarmee
 * besteld is**, of de link uit de bevestigingsmail die het toegangsteken van
 * de bestelling draagt — dat teken is lang en willekeurig en is op zichzelf
 * bewijs genoeg (lib/orders/types.ts).
 *
 * Kloppen de twee niet bij elkaar, dan is er één antwoord: niet gevonden.
 * Nooit "het nummer bestaat maar het adres klopt niet" — dat is precies de
 * mededeling die het raden weer mogelijk maakt.
 *
 * Staat dit apart van de Server Action omdat een pagina hem ook aanroept: in
 * een bestand met `"use server"` wordt élke export een ingang vanuit de
 * browser, en dat hoort dit niet te zijn.
 */

export interface LookupResult {
  status:
    /** Nog niets gezocht */
    | "idle"
    | "ok"
    | "unknown"
    | "notPaid"
    | "openReturn"
    | "nothingLeft"
    | "rateLimit"
    | "error";
  order?: {
    reference: string;
    /** Gaat mee bij het versturen, zodat de controle daar opnieuw kan */
    email: string;
    lines: ReturnableLine[];
    /** Wat het formulier nodig heeft om hetzelfde bedrag uit te rekenen */
    itemsGrossCents: number;
    discountCents: number;
    shippingGrossCents: number;
    /** ISO-datum; null als de betaaldatum ontbreekt */
    withdrawalUntil: string | null;
  };
}

export async function verifyOrder(input: {
  reference: string;
  email?: string;
  token?: string;
}): Promise<StoredOrder | null> {
  const reference = input.reference.trim().toUpperCase();
  if (!/^CARO-\d{8}-[A-Z0-9]{4}$/.test(reference)) return null;

  const order = await readOrder(reference);
  if (!order) return null;

  if (input.token) {
    return input.token === order.accessToken ? order : null;
  }

  const given = (input.email ?? "").trim().toLowerCase();
  const known = order.document.customer.email.trim().toLowerCase();
  return given && given === known ? order : null;
}

/** Wat het formulier van een gevonden bestelling moet weten */
export async function describeOrder(order: StoredOrder): Promise<LookupResult> {
  // Niet betaald is geen retour maar een afgebroken bestelling; daar valt
  // niets terug te boeken.
  if (order.status !== "paid") return { status: "notPaid" };

  if (await hasOpenReturn(order.reference)) return { status: "openReturn" };

  const lines = returnableLines(order, await returnedQuantities(order.reference));
  if (lines.every((line) => line.returnable === 0)) {
    return { status: "nothingLeft" };
  }

  const deadline = withdrawalDeadline(order);
  return {
    status: "ok",
    order: {
      reference: order.reference,
      email: order.document.customer.email,
      lines,
      itemsGrossCents: order.document.itemsGrossCents,
      discountCents: order.document.discount?.grossCents ?? 0,
      shippingGrossCents: order.document.shippingGrossCents,
      withdrawalUntil: deadline ? deadline.toISOString() : null,
    },
  };
}
