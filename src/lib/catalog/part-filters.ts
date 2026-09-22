import type { FilterGroup, SelectedFilters } from "./types";
import type { WearpartsArticle } from "./wearparts";

/**
 * Filteren op eigenschap bij onderdelen.
 *
 * **Winkelkeuze 2026-09-21 door de eigenaar: filters staan weer aan, overal
 * waar de data ze draagt.** Dat draait de keuze van 2026-09-11 terug
 * (@docs/DECISIONS.md #7), die filters had beperkt tot motorolie.
 *
 * De twee bezwaren van toen blijven waar, en ze zijn hier allebei belegd:
 *
 * 1. **Leveranciersjargon als kop.** Daar helpt geen code tegen, maar de
 *    dekkingsgrens hieronder zeeft het ergste eruit: velden die de fabrikant
 *    bij een minderheid invult zijn vrijwel altijd administratie
 *    (`OCS 1 / J9131003 / LS 7` stond op 5 van de 73 oliefilters).
 * 2. **Filteren verbergt artikelen die wél passen.** GEMETEN: van 261
 *    remblokken voor één auto dragen er 116 een `Inbouwplaats`; wie op
 *    "Vooras" filtert ziet er 82 en mist de 145 waarvoor het veld leeg is.
 *    Dát is de reden dat de filters er toen uit gingen.
 *
 *    Daarom telt elke filtergroep nu **hoeveel artikelen de eigenschap niet
 *    hebben** (`missingCount`), en zegt het paneel dat erbij. De klant leest
 *    dan "145 artikelen hebben dit niet ingevuld" in plaats van te denken dat
 *    meer er niet is. Verbergen doen we nog steeds — anders filtert het
 *    filter niet — maar niet meer stilletjes.
 *
 * **Welke eigenschappen het worden, bepaalt de data en niet een lijst.** Elk
 * artikeltype heeft eigen attributen; een allowlist van ids zou bij de
 * volgende categorie weer leeg zijn. De regels staan in `usable()`.
 *
 * **Het filteren gebeurt hier, niet bij de leverancier.** Drie redenen, in
 * volgorde van zwaarte:
 *
 * 1. De API kent viscositeit onder twee attribuut-ids. GEMETEN op carId
 *    115566: 276 artikelen dragen `attr_2467`, 21 dragen `attr_1054`, geen
 *    enkele allebei — en in de facetten komt `attr_1054` helemaal niet voor.
 *    Filteren via `filter[attr_2467]=5W-30` laat die 21 dus stil vallen.
 *    Hier voegen we samen op kop, en dan klopt het aantal wél.
 * 2. Eén ongefilterde vraag bedient élke filtercombinatie. De call heeft
 *    daarmee steeds dezelfde cachesleutel; filteren bij de leverancier zou
 *    per combinatie een nieuwe zijn, en die limiet is 100 per minuut voor de
 *    hele winkel.
 * 3. De aantallen achter de opties tellen dan echt mee wat er ná filteren
 *    overblijft.
 */

/**
 * Hoeveel van de artikelen de eigenschap moeten dragen voordat we hem als
 * filter aanbieden.
 *
 * GEMETEN over vijf categorieën (@docs/api/WEARPARTS.md): bruikbare
 * eigenschappen zitten op 40% of hoger (Inbouwplaats bij remschijven 114/283),
 * leveranciersadministratie op 7% of lager (5/73, 3/55, 3/283). De grens ligt
 * in dat gat, en 35% houdt de passing-filters er net binnen — precies de
 * filters waar de eigenaar om vroeg.
 */
const COVERAGE_MIN = 0.35;

/** Eén optie filtert niets; boven de acht is het een lijst en geen keuze. */
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 8;

/**
 * **Voor merk geldt geen bovengrens.** Dat is geen eigenschap maar een naam:
 * wie BOSCH zoekt wil hem kunnen aanwijzen, ook als de lijst lang is. Het
 * paneel laat lange lijsten scrollen, en bij banden staan er 191 in.
 *
 * GEMETEN 2026-09-21 op carId 128598: 124 oliefilters van **77 merken**, 192
 * remschijven van **67 merken**. Met een grens van 40 viel merk op allebei de
 * pagina's weg — juist het filter waar de eigenaar als eerste om vroeg.
 */

/** Langer dan dit is een omschrijving, geen filterwaarde */
const MAX_VALUE_LENGTH = 40;

/** Groepssleutels in de URL: `?f=merk:BOSCH&f=inbouwplaats:Vooras` */
export const PART_FILTER_KEYS = {
  brand: "merk",
  viscosity: "viscositeit",
  volume: "inhoud",
} as const;

/**
 * Eigenschappen die we bij naam kennen, omdat ze iets nodig hebben wat de
 * algemene regels niet geven: een vaste sleutel, een eigen vertaling, een
 * eenheid of een sortering. Al het andere komt uit de data.
 */
const SPECIALS: ReadonlyArray<{
  key: string;
  labelKey: string;
  attrs: string[];
  /** Getalwaarden mogen hier wél; zie `usable()` */
  numeric?: boolean;
  unit?: string;
}> = [
  {
    key: PART_FILTER_KEYS.viscosity,
    labelKey: "viscosity",
    attrs: ["2467", "1054"],
  },
  {
    key: PART_FILTER_KEYS.volume,
    labelKey: "volume",
    attrs: ["423"],
    numeric: true,
    unit: "L",
  },
];

const SPECIAL_ATTRS = new Set(SPECIALS.flatMap((special) => special.attrs));

/** Eén filter: waar de waarde vandaan komt en hoe hij heet */
export interface PartFilterDef {
  key: string;
  /** Kop van de leverancier; `labelKey` wint als die er is */
  label: string;
  labelKey?: string;
  /** Attribuut-ids, of `null` voor het merk (dat staat niet in `attr`) */
  attrs: string[] | null;
  unit?: string;
}

/** "Inbouwplaats" → "inbouwplaats", "Positie op voertuig" → "positie-op-voertuig" */
function slugify(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isNumeric(value: string): boolean {
  return /^[\d.,]+$/.test(value);
}

function attrValue(
  article: WearpartsArticle,
  ids: ReadonlyArray<string>,
): string | undefined {
  for (const id of ids) {
    const value = article.attr?.[id]?.value?.trim();
    if (value) return value;
  }
  return undefined;
}

/** De waarde van één filter op één artikel */
function valueFor(
  article: WearpartsArticle,
  def: PartFilterDef,
): string | undefined {
  if (def.attrs === null) return article.brandName?.trim() || undefined;
  return attrValue(article, def.attrs);
}

/**
 * Welke filters deze artikelen dragen.
 *
 * Merk staat er altijd bij (100% dekking, per definitie). De rest wordt
 * gegroepeerd op kop, niet op id: dezelfde eigenschap komt bij de leverancier
 * soms onder twee nummers binnen, en dan hoort het één filter te zijn.
 */
export function buildPartFilters(
  articles: ReadonlyArray<WearpartsArticle>,
): PartFilterDef[] {
  if (articles.length === 0) return [];

  const kandidaten: PartFilterDef[] = [
    { key: PART_FILTER_KEYS.brand, label: "merk", labelKey: "manufacturer", attrs: null },
  ];

  for (const special of SPECIALS) {
    if (articles.some((article) => attrValue(article, special.attrs))) {
      kandidaten.push({
        key: special.key,
        label: special.key,
        labelKey: special.labelKey,
        attrs: special.attrs,
        unit: special.unit,
      });
    }
  }

  // Alles wat de leverancier verder meestuurt, op kop gegroepeerd. De kop
  // staat niet in de facetten maar op elk artikel dat hem draagt, dus we
  // lopen ze allemaal langs: bij wisserbladen droeg het eerste artikel geen
  // `Inbouwplaats` terwijl de helft van de lijst hem heeft.
  const opKop = new Map<string, { label: string; attrs: Set<string> }>();
  for (const article of articles) {
    for (const [id, attr] of Object.entries(article.attr ?? {})) {
      if (SPECIAL_ATTRS.has(id)) continue;
      const label = attr?.translation?.trim();
      if (!label || !attr?.value?.trim()) continue;
      const key = slugify(label);
      if (!key || key === PART_FILTER_KEYS.brand) continue;
      const bestaand = opKop.get(key);
      if (bestaand) bestaand.attrs.add(id);
      else opKop.set(key, { label, attrs: new Set([id]) });
    }
  }

  for (const [key, { label, attrs }] of opKop) {
    kandidaten.push({ key, label, attrs: [...attrs] });
  }

  return kandidaten.filter((def) => usable(def, articles));
}

/**
 * Is dit een filter waar een klant iets aan heeft?
 *
 * Vier zeven, en de eerste doet het meeste werk: een eigenschap die de
 * fabrikant bij de meerderheid leeg laat is administratie, geen keuze.
 */
function usable(
  def: PartFilterDef,
  articles: ReadonlyArray<WearpartsArticle>,
): boolean {
  const special = SPECIALS.find((s) => s.key === def.key);
  const waarden = new Set<string>();
  let metWaarde = 0;

  for (const article of articles) {
    const value = valueFor(article, def);
    if (!value) continue;
    if (value.length > MAX_VALUE_LENGTH) return false;
    // Getallen zijn maatvoering (remschijfdikte, boutlengte) en horen in de
    // artikelgegevens, niet als filterknop. De inhoud van een fles olie is de
    // uitzondering, en die staat bij naam in SPECIALS.
    if (!special?.numeric && isNumeric(value)) return false;
    metWaarde++;
    waarden.add(value);
  }

  if (metWaarde / articles.length < COVERAGE_MIN) return false;
  if (waarden.size < MIN_OPTIONS) return false;

  // De bovengrens geldt alleen voor wat we uit de data oprapen. Merk en de
  // filters uit SPECIALS zijn met opzet gekozen en mogen lang zijn.
  // GEVONDEN bij het testen: "Inhoud" bij motorolie heeft er elf (1, 2, 4, 5,
  // 20, 60, 208 liter …) en verdween daardoor — terwijl dat juist een van de
  // drie filters is waar de eigenaar in september om vroeg.
  if (def.attrs === null || special) return true;
  return waarden.size <= MAX_OPTIONS;
}

export function articleMatchesFilters(
  article: WearpartsArticle,
  selected: SelectedFilters,
  defs: ReadonlyArray<PartFilterDef>,
): boolean {
  for (const [key, chosen] of Object.entries(selected)) {
    if (chosen.length === 0) continue;
    const def = defs.find((d) => d.key === key);
    // Onbekende sleutel in de URL: negeren in plaats van alles wegfilteren.
    // Anders geeft een oude link uit een zoekmachine een lege categorie.
    if (!def) continue;
    const value = valueFor(article, def);
    // Binnen een groep is het "of", tussen groepen "en" — zelfde gedrag als
    // het filterpaneel bij banden en velgen.
    if (value === undefined || !chosen.includes(value)) return false;
  }
  return true;
}

/**
 * "5W-30" vóór "5W-40" vóór "10W-40": op het winterdeel, dan op het
 * zomerdeel. Alfabetisch zou 10W-40 vóór 5W-30 komen.
 */
function viscosityOrder(value: string): number {
  const match = /^(\d+)W-?(\d+)?/i.exec(value);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 1000 + Number(match[2] ?? 0);
}

function optionSorter(def: PartFilterDef): (a: string, b: string) => number {
  if (def.key === PART_FILTER_KEYS.volume) {
    return (a, b) => Number(a) - Number(b);
  }
  if (def.key === PART_FILTER_KEYS.viscosity) {
    return (a, b) => viscosityOrder(a) - viscosityOrder(b) || a.localeCompare(b);
  }
  return (a, b) => a.localeCompare(b, "nl");
}

/** "5" → "5 L". De eenheid staat niet in de waarde; die zetten wij ervoor. */
function optionLabel(def: PartFilterDef, value: string): string {
  return def.unit ? `${value} ${def.unit}` : value;
}

/**
 * De filtergroepen met hun aantallen.
 *
 * Per groep tellen we op de artikelen die aan de **andere** groepen voldoen.
 * Anders zou de laatste keuze binnen een groep alle andere opties daar op nul
 * zetten en kon de klant er niet meer bijkiezen.
 */
export function partFilterGroups(
  articles: ReadonlyArray<WearpartsArticle>,
  selected: SelectedFilters,
  defs: ReadonlyArray<PartFilterDef>,
): FilterGroup[] {
  const groups: FilterGroup[] = [];

  for (const def of defs) {
    const others = Object.fromEntries(
      Object.entries(selected).filter(([other]) => other !== def.key),
    );
    const counts = new Map<string, number>();
    let zonderWaarde = 0;

    for (const article of articles) {
      if (!articleMatchesFilters(article, others, defs)) continue;
      const value = valueFor(article, def);
      if (!value) {
        zonderWaarde++;
        continue;
      }
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    // Eén optie filtert niets: elk artikel valt er toch al onder.
    if (counts.size < MIN_OPTIONS) continue;

    groups.push({
      key: def.key,
      // Het label komt uit messages/ als er een `labelKey` is; anders is dit
      // de kop van de leverancier.
      label: def.label,
      labelKey: def.labelKey,
      // Wat er wegvalt als je hier filtert. Zie de kop van dit bestand:
      // dit getal is de reden dat de filters terug kúnnen.
      missingCount: zonderWaarde,
      options: [...counts.keys()]
        .sort(optionSorter(def))
        .map((value) => ({
          value,
          label: optionLabel(def, value),
          count: counts.get(value),
        })),
    });
  }

  return groups;
}
