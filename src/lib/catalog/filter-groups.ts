// Welke filters de shop toont, en onder welke kop.
//
// De Tyre24-filterrespons bevat per categorie tientallen groepen, en het
// grootste deel daarvan is onbruikbaar voor een consument: "DA", "systeem",
// "RFID", "Inzet 2" en "aanwijzing" hebben waarden als "1 | 3" of "29 | 30",
// codes zonder betekenis buiten hun eigen database. Ze vullen de zijbalk en
// filteren niets zinnigs. Daarom een allowlist, net als bij het assortiment
// (src/lib/catalog/assortment.ts).
//
// LET OP: behalve `manufacturer` zijn de sleutels van de API de attribuutnaam
// zélf, in de taal van het platform. Banden en velgen draaien op het
// NL-platform (Nederlandse sleutels), toebehoren op het DE-platform (Duitse).
// Verandert het platform van een familie, dan moeten deze sleutels mee.

/** Sleutel van de merkgroep in de API; bij ons altijd groepssleutel "merk" */
export const API_MANUFACTURER_KEY = "manufacturer";

/**
 * Toegestane filtergroepen per productArea, in de volgorde waarin ze
 * getoond worden. Area zonder lijst → alle groepen (geen filter).
 */
const ALLOWED_FILTER_KEYS: Record<string, ReadonlyArray<string>> = {
  // Banden. De maat zit in de artikelnaam en niet in het filterblok, dus
  // veel meer dan merk en laadindex is er niet bruikbaars.
  "6": [API_MANUFACTURER_KEY, "laadindex"],
  // Velgen. Hier zijn de attributen wél concreet: steekcirkel, maat en ET
  // bepalen of een velg past.
  "7": [
    API_MANUFACTURER_KEY,
    "Velgverbinding",
    "Velgmaat",
    "ET",
    "Max. draagkracht",
    "wielmontage",
  ],
  // Toebehoren (DE-platform, Duitse sleutels én Duitse waarden).
  "1": [API_MANUFACTURER_KEY, "Farbe", "Material", "Größe"],
};

/**
 * Vertaalsleutel per filtergroep, onder `filters.labels` in messages/.
 * Staat er geen, dan gebruikt de UI het label van de API — dat is beter dan
 * een lege kop, ook al staat het dan in de taal van het platform.
 */
const LABEL_KEYS: Record<string, string> = {
  [API_MANUFACTURER_KEY]: "manufacturer",
  laadindex: "loadIndex",
  Velgverbinding: "boltPattern",
  Velgmaat: "rimSize",
  ET: "offset",
  "Max. draagkracht": "maxLoad",
  wielmontage: "wheelMounting",
  Farbe: "colour",
  Material: "material",
  "Größe": "size",
};

export function isFilterGroupAllowed(
  productAreaId: string,
  apiKey: string,
): boolean {
  const allowed = ALLOWED_FILTER_KEYS[productAreaId];
  if (!allowed) return true;
  return allowed.includes(apiKey);
}

/** Positie in de allowlist; onbekend achteraan. */
export function filterGroupOrder(
  productAreaId: string,
  apiKey: string,
): number {
  const index = ALLOWED_FILTER_KEYS[productAreaId]?.indexOf(apiKey) ?? -1;
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function filterLabelKey(apiKey: string): string | undefined {
  return LABEL_KEYS[apiKey];
}

/**
 * Beschrijvingen die de leverancier in het merkveld zet. Het zijn geen
 * merken maar kwaliteitsaanduidingen van staalvelgen, en tussen CONTINENTAL
 * en MICHELIN lezen ze als onzin.
 */
const NOT_A_BRAND = [
  "original equipment",
  "dimensionsgleich",
  "oe qualit",
  "oe-qualit",
];

/**
 * Is dit merk een echt merk? Een merknaam bevat geen dubbele punt en geen
 * opsomming — "STAHLRAD OE QUALITÄT: ALCAR,KPZ,SÜDRAD,MWD" is een
 * omschrijving van vier leveranciers, geen merk om op te filteren.
 */
export function isRealBrand(label: string): boolean {
  const value = label.trim().toLowerCase();
  if (value === "") return false;
  if (value.includes(":") || value.includes(",")) return false;
  return !NOT_A_BRAND.some((phrase) => value.includes(phrase));
}
