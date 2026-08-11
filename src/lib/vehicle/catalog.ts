import catalog from "./vehicle-catalog.json";

/**
 * Merk/model-catalogus voor klanten die geen kenteken bij de hand hebben.
 *
 * Geoogst uit RDW open data door `scripts/harvest-vehicle-catalog.mjs`, niet
 * live opgevraagd: een keuzelijst mag niet stukgaan als een externe dienst
 * eruit ligt, en zo kost hij geen enkel verzoek.
 *
 * Belangrijk: dit is dezelfde bron als de kentekenzoeker. Merk en model die
 * de klant hier kiest zijn dus dezelfde tekst als bij een kentekencheck, en
 * de twee manieren om een auto op te geven zijn uitwisselbaar.
 *
 * Het bestand is ~90 kB. Alleen server-side importeren; de kiezer haalt per
 * stap op via een Server Action zodat de browser niets overbodigs krijgt.
 */

export interface CatalogModel {
  name: string;
  /** Bouwjaar van de oudste registratie in Nederland */
  from?: number;
  /** Bouwjaar van de nieuwste registratie */
  to?: number;
}

export interface CatalogMake {
  name: string;
  /** Schrijfwijzen waaronder de RDW dit merk registreert */
  rdwNames: string[];
  models: CatalogModel[];
}

const MAKES = catalog.makes as CatalogMake[];

export function listMakes(): string[] {
  return MAKES.map((make) => make.name);
}

export function findMake(name: string): CatalogMake | null {
  const wanted = name.trim().toLowerCase();
  return MAKES.find((make) => make.name.toLowerCase() === wanted) ?? null;
}

export function listModels(makeName: string): CatalogModel[] {
  return findMake(makeName)?.models ?? [];
}

export function findModel(
  makeName: string,
  modelName: string,
): CatalogModel | null {
  const wanted = modelName.trim().toLowerCase();
  return (
    listModels(makeName).find((model) => model.name.toLowerCase() === wanted) ??
    null
  );
}

/**
 * Bouwjaren voor een model, nieuwste eerst.
 *
 * De grenzen komen uit de registratiedata en kunnen ver teruglopen — de
 * Volkswagen Transporter staat vanaf 1954 in het register. We tonen niet
 * meer dan een halve eeuw, want daaronder is de keuze niet meer betekenisvol
 * voor onderdelen.
 */
export function listYears(makeName: string, modelName: string): number[] {
  const model = findModel(makeName, modelName);
  if (!model) return [];

  const now = new Date().getFullYear();
  const last = Math.min(model.to ?? now, now);
  const first = Math.max(model.from ?? last, last - 50);
  if (first > last) return [last];

  const years: number[] = [];
  for (let year = last; year >= first; year--) years.push(year);
  return years;
}
