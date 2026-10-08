// Bedrijfsgegevens van CarO. Eén bron voor de orderbevestiging, en straks
// voor de factuur, de mailhandtekening en de algemene voorwaarden.
//
// Nog één onbekende: de zakelijke rekening. Die is geen blokkade voor de
// winkel — een orderbevestiging vraagt er niet om — maar wel voor de
// betaalkoppeling en voor een échte factuur, want een NL-factuur moet naast
// btw- en KvK-nummer ook een oplopend factuurnummer en een rekening dragen
// (docs/DECISIONS.md #3).
export interface CompanyDetails {
  name: string;
  legalName: string;
  street: string;
  postcode: string;
  city: string;
  country: string;
  email: string;
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
  email: "info@caroparts.nl",
  // Bewust geen telefoonnummer: een webshop is niet verplicht er een te
  // hebben (art. 6:230m BW vraagt om "een" doeltreffend communicatiemiddel,
  // en dat is hier het e-mailadres plus het contactformulier). Een nummer
  // publiceren dat niet wordt opgenomen is slechter dan geen nummer.
  website: "caroparts.nl",
  cocNumber: "93396252",
  vatNumber: "NL005015784B71",
  iban: "NL37 KNAB 0775 4708 80",
};

/**
 * Een waarde die nog niet is ingevuld mag nooit in de winkel belanden: de
 * klant hoort geen "PLACEHOLDER — IBAN" te lezen. Null betekent hier: laat de
 * regel wég. Niet "volgt nog" tonen — een klant heeft niets aan een
 * aankondiging van een gegeven dat hij niet nodig heeft.
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
