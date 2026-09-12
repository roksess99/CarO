"use server";

import { type AddressLookup, lookupAddress } from "@/lib/address/postcode-data";

/**
 * Straat en plaats opzoeken vanuit het afrekenformulier.
 *
 * De tussenstap bestaat om twee redenen. De adressendienst wordt zo vanaf
 * **onze** server bevraagd in plaats van vanuit de browser van de klant — die
 * zou anders zijn IP-adres én zijn adres afgeven aan een partij waar hij niets
 * mee te maken heeft. En wat hier binnenkomt is invoer uit de browser, dus het
 * wordt gekeurd voordat het de adapter in gaat.
 */
export async function lookupAddressAction(
  postcode: unknown,
  houseNumber: unknown,
): Promise<AddressLookup> {
  if (typeof postcode !== "string" || typeof houseNumber !== "string") {
    return { ok: false, error: "invalidInput" };
  }
  // Ruime bovengrens tegen onzin; de vorm zelf keurt de adapter
  if (postcode.length > 20 || houseNumber.length > 20) {
    return { ok: false, error: "invalidInput" };
  }
  return lookupAddress(postcode, houseNumber);
}
