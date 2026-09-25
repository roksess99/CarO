/**
 * De vaste ingangen in de onderdelencatalogus: "Olie", "Filters" en de rij
 * "meest gezocht".
 *
 * ---------------------------------------------------------------------------
 * WAAROM HIER GEEN GROEP-IDS MEER STAAN — GEMETEN 2026-09-25
 * ---------------------------------------------------------------------------
 *
 * Hier stond een lijst met `assemblyGroupNodeId`s, met de aantekening dat die
 * op drie auto's gemeten en identiek waren. Dat identiek-zijn klopt nog
 * steeds — het zijn dezelfde nummers voor elke auto — maar **ze wijzen niet
 * meer naar wat er hier stond**. Tien van de elf zitten er één naast:
 *
 * | In de oude lijst | Wat daar vandaag staat | Waar de groep nu staat |
 * |---|---|---|
 * | 543 Oliefilter | `Filter` (hoofdgroep) | 544 |
 * | 544 Luchtfilter | `Oliefilter` | 545 |
 * | 546 Interieurfilter | `Brandstoffilter` | 547 |
 * | 568 Remblok | `Schijfrem` (hoofdgroep) | 569 |
 * | 569 Remschijf | `Remblok` | 570 |
 * | 1371 motorolie | `smeermiddelen` (hoofdgroep) | 1372 |
 * | 653 Batterij Accu | `Onderdelen` | 654 |
 * | 947 Wisserblad / Rubber | `Wisserbladen / Toebehoren` (hoofdgroep) | 948 |
 * | 634 Bougie | `Ontstekingsspoel- /eenheid` | 635 |
 * | 774 Schokdempers | `Vering` | 775 |
 * | 269 Distributieriem | `Distributieriem` | 269 — de enige die klopt |
 *
 * **Waarom niemand dat zag.** De boom staat een dag in de cache. Op een auto
 * die al eens bezocht was stond de oude nummering er dus nog en klopte het
 * scherm; op een auto die vers opgehaald werd sloeg alles één op. Zelfde
 * carId (115566), zelfde sessie, twee verschillende antwoorden — de pagina
 * las de gecachte boom, de controle hierboven een verse.
 *
 * Wat de eigenaar daarvan zag op zijn VW Polo: een tegel **"Onderdelen 81"**
 * waar de accu hoorde te staan, plus "Ontstekingsspoel- /eenheid" en
 * "Vering" in plaats van bougie en schokdemper, en tegels `Filter` en
 * `smeermiddelen` die niet naar artikelen leiden maar naar een tussenscherm.
 * De knoppen **Olie** en **Filters** in de header kwamen uit op
 * `/nl/onderdelen/filter-542`: **pagina niet gevonden**.
 *
 * Een vast nummer kan dus verschuiven zonder dat er iets stukgaat — het wijst
 * gewoon naar een ander onderdeel, en dat is precies het soort fout dat een
 * jaar kan blijven staan. Daarom staat hier nu een naam. Die komt van het
 * NL-platform van de leverancier; het nummer wordt opgezocht in de boom die
 * we tóch al ophalen, dus het kost geen extra verzoek.
 *
 * **Let op het verschil met `src/lib/admin/part-kinds.ts`.** Die nummers zijn
 * `genericArticleId`s — het soort artikel, niet de plek in de boom — en die
 * zijn wél overal gelijk. Die lijst blijft dus zoals hij is.
 */

/** Eén groep, herkend aan zijn naam in de boom van déze auto */
export interface PartGroupMatch {
  /** Stabiele sleutel, voor React en voor de tekening ervoor */
  key: string;
  /** De naam zoals de leverancier hem schrijft */
  match: RegExp;
  /**
   * Naam van een bovenliggende groep. Alleen nodig waar dezelfde naam twee
   * keer in de boom staat: "Oliefilter" hangt onder `Filter` én onder
   * `Oliedrukschakelaar/sensor/ventiel` (GEMETEN op de Polo: 544 en 299).
   */
  under?: RegExp;
}

/**
 * De twee hoofdgroepen achter de knoppen Olie en Filters.
 *
 * Ze blijven menu's: hun subgroepen verschillen per auto (een Citroën C3
 * heeft er zeven onder `Filter`, een McLaren 720S twee) en bestaan niet als
 * vaste pagina.
 */
export const MAINTENANCE_GROUPS: ReadonlyArray<PartGroupMatch> = [
  { key: "oils", match: /^smeermiddelen$/i },
  { key: "filters", match: /^filter$/i },
];

/**
 * De onderdelen waar de meeste klanten voor komen, in volgorde van vraag.
 *
 * Het categorierooster staat alfabetisch — "Aandrijfassen", "Accessoires",
 * "Airconditioning" bovenaan — en wie remblokken of een oliefilter zoekt moet
 * daar eerst 36 groepen langs en dan nog een niveau dieper. Deze rij zet de
 * gangbare onderhoudsdelen erbovenop.
 *
 * Het zijn **eindgroepen**: één klik naar de artikelen, geen tussenscherm.
 * Dat is ook precies de wens van de eigenaar (2026-09-25): *"ik moet hier op
 * filter klikken en dan het soort filter kiezen, ik wil meteen knoppen voor
 * oliefilter, brandstoffilter, luchtfilter zien, ook voor smeermiddelen wil
 * ik meteen knoppen zien voor motorolie, remolie."* Vandaar dat de vier
 * filtersoorten en de drie vloeistoffen hier los staan en niet achter hun
 * hoofdgroep.
 *
 * Een groep die deze auto niet heeft valt weg — niet elke auto heeft een
 * distributieriem (sommige hebben een ketting) of een interieurfilter.
 */
export const POPULAR_PART_GROUPS: ReadonlyArray<PartGroupMatch> = [
  { key: "oliefilter", match: /^oliefilter$/i, under: /^filter$/i },
  { key: "luchtfilter", match: /^luchtfilter$/i, under: /^filter$/i },
  { key: "brandstoffilter", match: /^brandstoffilter$/i, under: /^filter$/i },
  { key: "interieurfilter", match: /^interieurfilter$/i, under: /^filter$/i },
  { key: "remblok", match: /^remblok(ken)?$/i },
  // Let op de v/f-wisseling: "remschijven?" zou alleen het meervoud dekken
  { key: "remschijf", match: /^remschij(f|ven)$/i },
  { key: "motorolie", match: /^motorolie$/i, under: /^smeermiddelen$/i },
  { key: "remvloeistof", match: /^remvloeistof$/i, under: /^smeermiddelen$/i },
  { key: "koelvloeistof", match: /^koelvloeistof$/i, under: /^smeermiddelen$/i },
  { key: "accu", match: /^(batterij\s*)?accu$/i },
  { key: "wisserblad", match: /^wisserblad( \/ rubber)?$/i },
  { key: "bougie", match: /^bougies?$/i },
  { key: "schokdemper", match: /^schokdempers?$/i },
  { key: "distributieriem", match: /^distributieriem$/i },
];
