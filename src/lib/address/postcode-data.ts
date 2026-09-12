import { z } from "zod";

/**
 * Straat en plaats opzoeken bij een postcode en huisnummer.
 *
 * Bron: gratis-postcodedata.nl (LJPc-solutions). Geen registratie en geen
 * sleutel nodig; de onderliggende data is de BAG met coördinaten van het
 * Kadaster, onder een CC0-licentie.
 *
 * GEMETEN 2026-09-12 op de echte dienst:
 *
 * | Aanvraag | Antwoord |
 * |---|---|
 * | `1012AB/1` | `Stationsplein`, `Amsterdam` — 70 ms |
 * | `7038DE/2` | `Gildebongerd`, `Zeddam` — ons eigen vestigingsadres |
 * | `1012 ab/1` | werkt ook met spatie en kleine letters |
 * | `9999ZZ/1` | HTTP 404, `{"error":"Adres niet gevonden"}` |
 * | `1012AB/9999` | HTTP 404 — bestaande postcode, onbekend huisnummer |
 *
 * **Dit is een gemak, geen voorwaarde.** Het is een gratis dienst zonder
 * uptimegarantie, dus elke fout eindigt hier in `unavailable` en het formulier
 * laat de klant straat en plaats gewoon zelf invullen. Een checkout die
 * vastloopt omdat een adressendienst offline is, is erger dan een checkout
 * zonder automatisch invullen.
 *
 * **Rate limit: 60 verzoeken per minuut per IP.** Dat geldt voor onze server,
 * dus voor de hele winkel tegelijk — net als bij Tyre24. Eén bestelling kost
 * één opzoekactie, dus dat is ruim; de `revalidate` hieronder scheelt bovendien
 * bij dezelfde postcode.
 *
 * **Privacy.** De aanvraag gaat via de server, niet vanuit de browser van de
 * klant: anders zou zijn IP-adres én zijn adres bij een partij belanden waar
 * hij niets mee te maken heeft. Postcode en huisnummer worden nooit gelogd —
 * dezelfde regel als bij het kenteken (docs/api/OVERHEID-IO.md).
 */

const BASE_URL = "https://gratis-postcodedata.nl/api/postcode";

/** `1012 ab` → `1012AB` */
export function normalizePostcode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

const POSTCODE_PATTERN = /^[1-9][0-9]{3}[A-Z]{2}$/;

/**
 * De API wil een getal, de klant typt "12", "12A" of "12-3". De cijfers vooraan
 * bepalen het pand; een huisletter of toevoeging verandert straat en plaats niet.
 */
function houseNumberOf(raw: string): string | null {
  const digits = raw.match(/\d+/)?.[0];
  return digits && digits.length <= 6 ? digits : null;
}

// De dienst levert meer velden (gemeente, provincie, lat, lon). We nemen alleen
// wat het formulier invult; de rest hoort niet in onze code te lekken.
const addressSchema = z.object({
  straat: z.string().min(1),
  plaats: z.string().min(1),
});

const responseSchema = z.array(addressSchema);

export type AddressLookup =
  | { ok: true; street: string; city: string }
  | { ok: false; error: "invalidInput" | "notFound" | "unavailable" };

export async function lookupAddress(
  rawPostcode: string,
  rawHouseNumber: string,
): Promise<AddressLookup> {
  if (typeof window !== "undefined") {
    throw new Error("postcode-data mag nooit in de browser draaien");
  }

  const postcode = normalizePostcode(rawPostcode);
  const houseNumber = houseNumberOf(rawHouseNumber);
  if (!POSTCODE_PATTERN.test(postcode) || !houseNumber) {
    return { ok: false, error: "invalidInput" };
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/${postcode}/${houseNumber}`, {
      // Een adres verhuist niet. Lang bewaren spaart de rate limit en scheelt
      // de klant wachttijd als hij zijn huisnummer corrigeert en teruggaat.
      next: { revalidate: 60 * 60 * 24 * 30 },
      // Een gratis dienst mag de bestelling niet ophouden. Vier seconden is
      // ruim: gemeten antwoordtijd is 70 ms.
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    return { ok: false, error: "unavailable" };
  }

  if (response.status === 404) {
    return { ok: false, error: "notFound" };
  }
  if (!response.ok) {
    // Bewust zonder postcode of huisnummer in de logregel (AVG)
    console.error(`gratis-postcodedata.nl: HTTP ${response.status}`);
    return { ok: false, error: "unavailable" };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { ok: false, error: "unavailable" };
  }

  const parsed = responseSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: "unavailable" };
  }

  const first = parsed.data[0];
  if (!first) {
    // Lege lijst met status 200; voor de klant hetzelfde als een 404
    return { ok: false, error: "notFound" };
  }

  return { ok: true, street: first.straat, city: first.plaats };
}
