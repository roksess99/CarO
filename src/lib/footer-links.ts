/**
 * De rijtjes in de footer: automerken, onderdelenmerken en veelgezochte
 * onderdelen.
 *
 * **Bij merken is de naam tegelijk de zoekterm.** De catalogus van de
 * leverancier is Nederlands (docs/api/WEARPARTS.md: er is geen Engels
 * platform), dus die labels blijven in beide talen staan zoals ze zijn — een
 * merknaam vertaal je sowieso niet.
 *
 * Bij de **onderdelen** was dat tot 2026-11-24 ook zo, en dat ging mis; zie
 * `POPULAR_PARTS` hieronder. Die wijzen nu een groep aan in plaats van een
 * zoekterm, en dus mag hun label wél vertaald worden.
 *
 * Alles hier verwijst naar een pagina die bestaat en resultaten geeft; er
 * staat geen link in die op een lege pagina uitkomt.
 */
import type { PartGroupKey } from "@/lib/catalog/quick-links";

/**
 * Automerken → de zoekbrug op merk en model (`/mijn-auto`).
 *
 * GEMETEN 2026-09-10 hoeveel artikelen elk merk oplevert: Audi, BMW, Ford,
 * Opel en Volkswagen elk 47, Peugeot 45, Mercedes-Benz 41, Renault 33.
 * Citroën gaf er drie en staat er daarom niet bij — een merk aanbieden dat
 * op een vrijwel lege pagina uitkomt is erger dan het weglaten.
 */
export const CAR_MAKES = [
  "Audi",
  "BMW",
  "Ford",
  "Mercedes-Benz",
  "Opel",
  "Peugeot",
  "Renault",
  "Volkswagen",
] as const;

/** Fabrikanten van onderdelen → vrije zoekopdracht */
export const PART_BRANDS = [
  "Bosch",
  "Brembo",
  "Febi",
  "Hella",
  "Mann-Filter",
  "Sachs",
  "Valeo",
  "Vemo",
] as const;

/**
 * De onderdelen waar het meest op gezocht wordt, als tegel op de homepage en
 * als rijtje in de voettekst.
 *
 * **Dit is een groep in de boom, geen zoekterm — en dat verschil is gemeten.**
 * Tot 2026-11-24 linkte elke tegel naar `/zoeken?q=<naam>`. De leverancier
 * zoekt over meerdere velden tegelijk, dus "Remschijf" matcht net zo goed op
 * "Schroef, remschijf". GEMETEN 2026-11-24 over de eerste twaalf treffers:
 *
 * | Tegel | Raak | Wat er in plaats daarvan stond |
 * |---|---|---|
 * | Remblokken | 12/12 | — |
 * | Bougie | 11/12 | — |
 * | Luchtfilter | 3/12 | houder, afdichting, aanzuigslang |
 * | Accu | 3/12 | accuvet, accupoolklem, batterijkast |
 * | Oliefilter | 2/12 | afdichtring, pakking oliefilterhuis |
 * | Remschijf | **0/12** | schroef, schroevenset, dekplaat |
 * | Distributieriem | **0/12** | afscherming, spanrol, geleiderol |
 * | Schokdemper | **0/12** | beschermkap, ophanging |
 *
 * Dieper halen lost het niet op: van 240 treffers op "Remschijf" zijn er 19
 * van soort 82, en bij schokdemper en distributieriem **nul** — hoe diep je
 * ook gaat. Bij de leverancier valt het ook niet af te vangen:
 * `filter[genericArticleId]` geeft 400 zonder `search` en 500 met (gemeten op
 * alle elf soorten), en `exact=1` geeft willekeurig 500 of juist méér ruis.
 *
 * Wat wél werkt staat al in de winkel: de eindgroep opzoeken in de boom van
 * de gekozen auto (`POPULAR_PART_GROUPS` in `lib/catalog/quick-links.ts`),
 * precies zoals de rij "meest gezocht" op de onderdelenpagina. Die hangt aan
 * een `carId`, en daarom wijst een tegel nu naar `/nl/onderdelen?deel=<key>`:
 * mét auto springt hij door naar de groep, zonder auto vraagt hij er eerst
 * één. Dat is één klik meer en het juiste onderdeel in plaats van nul.
 */
export interface PopularPart {
  /** Sleutel uit `POPULAR_PART_GROUPS`; TypeScript bewaakt de tikfout */
  key: PartGroupKey;
  /** Sleutel uit `lib/catalog/group-photos.ts` */
  photo: string;
  /** Vertaalsleutel onder `partNames` in messages/ */
  label: string;
}

export const POPULAR_PARTS: ReadonlyArray<PopularPart> = [
  { key: "remschijf", photo: "remschijf", label: "remschijf" },
  { key: "remblok", photo: "remblok", label: "remblok" },
  { key: "oliefilter", photo: "oliefilter", label: "oliefilter" },
  { key: "luchtfilter", photo: "luchtfilter", label: "luchtfilter" },
  { key: "schokdemper", photo: "schokdemper", label: "schokdemper" },
  { key: "bougie", photo: "bougie", label: "bougie" },
  { key: "distributieriem", photo: "distributieriem", label: "distributieriem" },
  { key: "accu", photo: "accu", label: "accu" },
];
