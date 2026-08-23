// Bedrijfsgegevens van CarO. Eén bron voor de orderbevestiging, en straks
// voor de factuur, de mailhandtekening en de algemene voorwaarden.
//
// TODO: alle waarden met PLACEHOLDER hieronder vervangen zodra de
// bedrijfsvorm rond is (docs/DECISIONS.md #3 — KvK-inschrijving en zakelijke
// rekening zijn ook de blokkade voor Mollie). Zolang die placeholders er
// staan is een gegenereerd document GEEN geldige factuur: een NL-factuur
// moet btw-nummer, KvK-nummer en een oplopend factuurnummer bevatten.
export interface CompanyDetails {
  name: string;
  legalName: string;
  street: string;
  postcode: string;
  city: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  /** Kamer van Koophandel-nummer */
  cocNumber: string;
  /** Btw-identificatienummer (NL………B01) */
  vatNumber: string;
  iban: string;
}

export const COMPANY: CompanyDetails = {
  name: "CarO",
  legalName: "Car Parts A-Z",
  street: "Gildebongerd 2",
  postcode: "7038 DE",
  city: "Zeddam",
  country: "Nederland",
  email: "PLACEHOLDER — bedrijfs-e-mailadres",
  phone: "PLACEHOLDER — telefoonnummer",
  website: "caro.nl",
  cocNumber: "93396252",
  vatNumber: "NL005015784B71",
  iban: "PLACEHOLDER — IBAN",
};

/** Staan er nog placeholders in? Dan zet het document een waarschuwing. */
export function hasPlaceholderCompanyData(
  company: CompanyDetails = COMPANY,
): boolean {
  return Object.values(company).some((value) => value.includes("PLACEHOLDER"));
}

/**
 * Een waarde die nog niet is ingevuld mag nooit in de winkel belanden: de
 * klant hoort geen "PLACEHOLDER — IBAN" te lezen. Null betekent hier
 * "toon de tekst 'volgt nog'".
 */
export function companyValue(value: string): string | null {
  return value.includes("PLACEHOLDER") ? null : value;
}

/** Vestigingsadres op één regel, of null zolang het onbekend is */
export function companyAddressLine(
  company: CompanyDetails = COMPANY,
): string | null {
  const street = companyValue(company.street);
  const city = companyValue(company.city);
  if (!street || !city) return null;
  return `${street}, ${company.postcode} ${city}`;
}
