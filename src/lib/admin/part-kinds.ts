/**
 * Soorten onderdelen waar de beheerder een prijs op kan zetten.
 *
 * Het getal is het TecDoc-`genericArticleId`. Dat is bewust niet de
 * categorie: de categorieboom van Wearparts hangt aan een auto, en een
 * artikel dat via het zoekveld binnenkomt draagt helemaal geen categorie
 * (docs/DECISIONS.md #7). Een prijsregel op een categorie zou dus op de
 * productpagina wél gelden en bij het afrekenen niet — dan betaalt de klant
 * een ander bedrag dan hij zag. Het soortnummer zit op het artikel zelf en is
 * overal hetzelfde.
 *
 * GEMETEN 2026-09-19 op twee auto's (Citroën C3 Aircross 128136 en VW Golf 7
 * 115566): alle elf nummers zijn in beide bomen identiek. Ze komen uit
 * `defaultGenericArticleId` van de eindgroepen in `quick-links.ts`, dus dit is
 * precies de rij "meest gezocht" die de klant op de onderdelenpagina ziet.
 *
 * Staat er een soort niet bij die de beheerder wil? Dan is dat één regel hier
 * plus de meting waar het nummer vandaan komt — nooit een nummer overtypen
 * uit een voorbeeld op internet, want een verkeerd nummer levert stil een
 * regel op die niets doet.
 */
export interface PartKind {
  /** TecDoc-soortnummer, zoals het op het artikel staat */
  id: string;
  name: string;
}

export const PART_KINDS: ReadonlyArray<PartKind> = [
  { id: "7", name: "Oliefilter" },
  { id: "8", name: "Luchtfilter" },
  { id: "424", name: "Interieurfilter" },
  { id: "402", name: "Remblok" },
  { id: "82", name: "Remschijf" },
  { id: "3224", name: "Motorolie" },
  { id: "1", name: "Accu" },
  { id: "298", name: "Wisserblad" },
  { id: "686", name: "Bougie" },
  { id: "854", name: "Schokdemper" },
  { id: "1123", name: "Distributieriem" },
];

export function partKindName(id: string): string | undefined {
  return PART_KINDS.find((kind) => kind.id === id)?.name;
}

export function isKnownPartKind(id: string): boolean {
  return PART_KINDS.some((kind) => kind.id === id);
}
