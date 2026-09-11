// Onderdelen uit de Wearparts-API, vertaald naar het datacontract van de
// shop (types.ts). Zie docs/api/WEARPARTS.md voor de gemeten eigenschappen.
//
// Deze familie werkt anders dan de rest: bladeren kan alleen mét een auto,
// omdat de categorieboom aan een TecDoc-voertuig hangt. Zoeken op naam kan
// altijd. De pagina's regelen dat verschil; de mapping hieronder niet.

import { consumerPriceCents } from "@/lib/pricing";
import {
  type AssemblyGroup,
  articleById,
  articleCounts,
  assemblyGroupById,
  assemblyGroups,
  assemblyTree,
  searchArticles,
  type WearpartsArticle,
} from "./wearparts";
import { POPULAR_PART_GROUP_IDS } from "./quick-links";
import type { Category, Part } from "./types";

/**
 * Attributen die niets zeggen over het product zelf en dus niet op de
 * productkaart horen. In de specificatietabel mogen ze wel blijven staan.
 *
 * "Goederentariefnummer: 6815994170" stond er zo een; dat is een douanecode.
 */
const NOT_A_VARIANT = [
  "goederentarief",
  "tariefnummer",
  "aanvullende",
  "gewicht",
];

/**
 * "Hoogte [mm]" → "Hoogte". De eenheid staat al achter de waarde, dus twee
 * keer is rommelig op een smalle productkaart.
 */
function stripUnitBrackets(label: string): string {
  const open = label.lastIndexOf(String.fromCharCode(91));
  return (open === -1 ? label : label.slice(0, open)).trim();
}

/** Prijzen komen als euro's met decimalen; wij rekenen in centen */
function toCents(amount: number | undefined): number | null {
  if (amount === undefined || !Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

function slugifyPart(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Artikel-id uit een slug. De id van de Wearparts-API is geen getal maar een
 * sleutel als "101-3231363633", dus die zetten we achteraan met een dubbele
 * streep ertussen — één streep zou niet te onderscheiden zijn van de streepjes
 * in de naam zelf.
 */
const ID_SEPARATOR = "--";

/**
 * Naam zoals de klant hem leest: **merk + soortnaam + productlijn +
 * fabrikantsnummer**, bv. "MAHLE Oliefilter OC 977/1".
 *
 * De leverancier levert die vier los. Alleen `articleName` gebruiken gaf
 * vijftig identieke "Oliefilter"-kaarten; met merk en fabrikantsnummer erbij
 * is elke kaart uniek én herkenbaar — dat nummer is waar monteurs en
 * webshops op zoeken.
 */
export function displayName(article: WearpartsArticle): string {
  return [
    article.brandName,
    article.articleName,
    article.articleAddName,
    article.articleId,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

export function partSlug(article: WearpartsArticle): string {
  return `${slugifyPart(displayName(article))}${ID_SEPARATOR}${article.id}`;
}

export function idFromPartSlug(slug: string): string | null {
  const index = slug.lastIndexOf(ID_SEPARATOR);
  if (index === -1) return null;
  const id = slug.slice(index + ID_SEPARATOR.length);
  return id.length > 0 ? id : null;
}

/**
 * Categoriesegment voor artikelen die niet uit een categorie komen maar uit
 * een zoekopdracht. De URL heeft drie niveaus nodig; zonder dit segment
 * ontstaat "/nl/onderdelen//artikel" en dat is geen geldige route.
 */
export const SEARCH_CATEGORY_SLUG = "zoekresultaat";

export function groupSlug(group: AssemblyGroup): string {
  return `${slugifyPart(group.name)}-${group.id}`;
}

export function groupIdFromSlug(slug: string): number | null {
  const match = /-(\d+)$/.exec(slug);
  return match ? Number(match[1]) : null;
}

/**
 * Groepsnaam terug uit de slug, zonder de API te bevragen.
 *
 * `generateMetadata` heeft een titel nodig, maar de categorieboom hangt aan
 * een auto: zonder `?auto=` valt de echte naam niet op te halen. De slug is
 * wél uit die naam gemaakt, dus draaien we hem terug. Leestekens ("&") zijn
 * daarbij verloren gegaan; voor een titel is dat geen bezwaar, en zodra er
 * een auto in de URL staat gebruiken we alsnog de echte naam.
 */
export function groupNameFromSlug(slug: string): string {
  const words = slug.replace(/-\d+$/, "").replace(/-/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
}

/**
 * Artikel → Part. Het goedkoopste aanbod telt: de klant koopt er één, en de
 * `offerList` staat niet gegarandeerd op prijs gesorteerd.
 */
export function toPart(
  article: WearpartsArticle,
  categorySlug: string,
  categoryName: string,
): Part | null {
  const offers = article.offerList ?? [];
  const priced = offers
    .map((offer) => ({
      purchase: toCents(offer.price),
      recommended: toCents(offer.retailPrice),
      stock: offer.stock ?? 0,
    }))
    .filter((offer): offer is { purchase: number; recommended: number | null; stock: number } =>
      offer.purchase !== null && offer.purchase > 0,
    )
    .sort((a, b) => a.purchase - b.purchase);

  const best = priced[0];
  // Zonder inkoopprijs kunnen we niet verkopen — zelfde regel als bij banden.
  if (!best) return null;

  // Attributen eerst: die zeggen wat dit artikel onderscheidt (bandenmaat,
  // gewicht, aantal per verpakking). De leverancier levert het label al
  // vertaald mee, dus dat gebruiken we boven onze eigen sleutels.
  //
  // `quality` is een cijfercode zonder betekenis buiten hun database (1, 2, 3)
  // en laten we weg, net als de codefilters bij banden.
  const specs: Array<{ key: string; value: string; label?: string }> = [];
  for (const [id, attribute] of Object.entries(article.attr ?? {})) {
    const label = attribute.translation?.trim();
    const value = attribute.value?.trim();
    if (!label || !value) continue;
    specs.push({
      key: `attr-${id}`,
      label,
      // De eenheid staat vaak al in het label ("Gewicht [kg]"); alleen
      // toevoegen als hij er nog niet in zit.
      value:
        attribute.unit && !label.includes(attribute.unit)
          ? `${value} ${attribute.unit}`
          : value,
    });
  }
  if (article.quantityPerPackingUnit && article.quantityPerPackingUnit > 1) {
    specs.push({
      key: "packSize",
      value: String(article.quantityPerPackingUnit),
    });
  }
  if (article.eanNumber?.[0]) {
    specs.push({ key: "ean", value: article.eanNumber[0] });
  }
  if (article.articleId) {
    specs.push({ key: "itemNumber", value: article.articleId });
  }

  // Eerste attribuut als ondersteunende regel, mét zijn label. Zonder label
  // stond er op de kaart een kale "76" — dat is de buitendiameter in mm,
  // maar zo leest het als ruis.
  const first = specs.find(
    (spec) =>
      spec.key.startsWith("attr-") &&
      !NOT_A_VARIANT.some((word) =>
        (spec.label ?? "").toLowerCase().includes(word),
      ),
  );
  const variant = first?.label
    ? `${stripUnitBrackets(first.label)}: ${first.value}`
    : first?.value;

  return {
    id: article.id,
    slug: partSlug(article),
    name: displayName(article),
    variant,
    brand: article.brandName ?? "",
    family: "onderdelen",
    oeNumber: article.articleId ?? "",
    categorySlug,
    categoryName,
    priceCents: consumerPriceCents({
      purchaseCents: best.purchase,
      recommendedCents: best.recommended,
    }),
    availability: best.stock > 0 ? "in-stock" : "out-of-stock",
    imageUrl: article.image,
    specs,
    stock: best.stock,
  };
}

/** Hoofdgroepen van een auto, als categorieën voor de navigatie */
export async function partCategories(carId: number): Promise<Category[]> {
  const groups = await assemblyGroups(carId);
  return groups.map((group) => ({ slug: groupSlug(group), name: group.name }));
}

export async function partGroupById(
  carId: number,
  groupId: number,
): Promise<AssemblyGroup | null> {
  return assemblyGroupById(carId, groupId);
}

export async function partGroups(
  carId: number,
  parentNodeId?: number,
): Promise<AssemblyGroup[]> {
  return assemblyGroups(carId, parentNodeId);
}

/** Een rij bladgroepen onder de kop van hun tussenliggende groep */
export interface GroupSection {
  /** Kop boven de rij; leeg als de bladeren direct onder de hoofdgroep hangen */
  title: string;
  groups: AssemblyGroup[];
}

/**
 * Wat een klant te zien krijgt als hij een hoofdgroep opent.
 *
 * Twee dingen die de oude opzet fout deed, allebei gemeten op één auto
 * (carId 128214, 2026-09-08):
 *
 * 1. **Te veel klikken.** De boom is vier niveaus diep — 36 hoofdgroepen,
 *    775 knopen. Wie remblokken zocht klikte Remsysteem → Rem­schijf/-trommel
 *    → Remblokken → artikelen. Hier slaan we de tussenniveaus over en tonen
 *    we meteen álle bladeren, met hun tussengroep als kop erboven.
 * 2. **Doodlopende wegen.** `Bediening / Hydraulica` (1089) is een blad met
 *    nul artikelen. Zulke groepen laten we weg; wie erop klikte kreeg een
 *    lege pagina en moest terug.
 *
 * De telling kost één call per blad, maar die zijn een dag gecacht en lopen
 * met hoogstens zes tegelijk (`articleCounts`).
 */
export async function partLeafGroups(
  carId: number,
  rootId: number,
): Promise<GroupSection[]> {
  const tree = await assemblyTree(carId);
  const childrenOf = new Map<number, AssemblyGroup[]>();
  for (const node of tree) {
    if (node.parentId === undefined) continue;
    const siblings = childrenOf.get(node.parentId);
    if (siblings) siblings.push(node);
    else childrenOf.set(node.parentId, [node]);
  }

  // Bladeren verzamelen en onthouden onder welke tussengroep ze hingen. De
  // hoofdgroep zelf levert een lege kop op: daar staat de <h1> al boven.
  const sections: GroupSection[] = [];
  const seen = new Set<number>();

  function collect(id: number, title: string): void {
    if (seen.has(id)) return; // de boom is plat aangeleverd; lussen uitsluiten
    seen.add(id);
    const children = childrenOf.get(id) ?? [];
    if (children.length === 0) return;

    const leaves = children.filter((child) => !childrenOf.has(child.id));
    if (leaves.length > 0) {
      const section = sections.find((entry) => entry.title === title);
      if (section) section.groups.push(...leaves);
      else sections.push({ title, groups: [...leaves] });
    }
    for (const child of children) {
      if (childrenOf.has(child.id)) collect(child.id, child.name);
    }
  }

  collect(rootId, "");

  const counts = await articleCounts(
    carId,
    sections.flatMap((section) => section.groups.map((group) => group.id)),
  );

  return sections
    .map((section) => ({
      title: section.title,
      groups: section.groups
        .map((group) => ({ ...group, articleCount: counts.get(group.id) }))
        // -1 is "telling mislukt": dan tonen we hem, want een onvindbaar
        // artikel is erger dan een lege pagina.
        .filter((group) => group.articleCount !== 0),
    }))
    .filter((section) => section.groups.length > 0);
}

/**
 * Hoofdgroepen voor het raster op de familiepagina, zonder de lege.
 *
 * Alleen de hoofdgroepen die zélf een eindgroep zijn worden geteld —
 * `Koplampreiniging` heeft geen enkele subgroep en is voor de meeste auto's
 * niets. Die hoort niet in het raster.
 *
 * De rest blijft ongeteld staan, en dat is een bewuste keuze: `/articles`
 * geeft HTTP 500 op een groep met subgroepen (gemeten op alle 36), dus het
 * aantal van een hoofdgroep is alleen te krijgen door al zijn eindgroepen op
 * te tellen. Voor 620 bladeren zijn dat 620 calls op een limiet van 100 per
 * minuut. Dat is de paginaweergave niet waard; de lege takken vallen een
 * niveau dieper alsnog weg (zie `partLeafGroups`).
 */
export async function partGroupsWithCounts(
  carId: number,
): Promise<AssemblyGroup[]> {
  const { groups } = await partGroupsAndPopular(carId);
  return groups;
}

/**
 * De veelgevraagde eindgroepen voor deze auto, in de volgorde van
 * `POPULAR_PART_GROUP_IDS`.
 *
 * Kost geen extra boom-call: `/category` levert de hele platte boom en die
 * is een dag gecacht, dus dit is dezelfde call als het categorierooster
 * eronder. Wat er wél bij komt is de telling per groep — en die is nodig,
 * want een snelkoppeling die op een lege pagina uitkomt is erger dan geen
 * snelkoppeling. Ook die tellingen staan een dag in de cache.
 *
 * Een groep die deze auto niet heeft valt weg: niet elke auto heeft een
 * distributieriem (ketting) of een interieurfilter.
 */
export async function popularPartGroups(
  carId: number,
): Promise<AssemblyGroup[]> {
  const { popular } = await partGroupsAndPopular(carId);
  return popular;
}

/**
 * Het rooster én de rij "meest gezocht" uit één telling.
 *
 * Beide lijsten hebben aantallen nodig en beide lezen dezelfde gecachte boom.
 * Los van elkaar zetten ze allebei een eigen wachtrij op van zes tegelijk —
 * samen twaalf gelijktijdige calls op een limiet van honderd per minuut voor
 * de héle winkel. In één batch blijft dat er zes, en tellen we een groep die
 * in allebei de lijsten staat maar één keer.
 */
async function partGroupsAndPopular(
  carId: number,
): Promise<{ groups: AssemblyGroup[]; popular: AssemblyGroup[] }> {
  const tree = await assemblyTree(carId);
  const byId = new Map(tree.map((group) => [group.id, group]));
  // Zelfde toets als `assemblyGroups()` zonder parentNodeId: een hoofdgroep
  // heeft geen ouder. Niet `=== undefined` — de API levert daar ook 0 voor.
  const mainGroups = tree.filter((group) => !group.parentId);

  const present = POPULAR_PART_GROUP_IDS.map((id) => byId.get(id)).filter(
    (group): group is AssemblyGroup => group !== undefined,
  );

  // Alleen eindgroepen zijn te tellen: /articles geeft HTTP 500 op een groep
  // met subgroepen (zie articleCount).
  const ids = new Set<number>();
  for (const group of mainGroups) if (!group.hasChildren) ids.add(group.id);
  for (const group of present) if (!group.hasChildren) ids.add(group.id);

  const counts = await articleCounts(carId, [...ids]);
  const withCount = (group: AssemblyGroup) => ({
    ...group,
    articleCount: counts.get(group.id),
  });

  return {
    // -1 is "telling mislukt": dan tonen we hem, net als in partLeafGroups.
    groups: mainGroups.map(withCount).filter((g) => g.articleCount !== 0),
    popular: present.map(withCount).filter((g) => g.articleCount !== 0),
  };
}

/**
 * Onderdelen zoeken op vrije tekst; werkt zonder gekozen auto.
 *
 * Geef `carId` mee zodra de klant zijn auto heeft opgegeven. GEMETEN
 * 2026-09-08: zoeken op "olie" mét auto gaf 797 treffers met "Olie" van FEBI
 * BILSTEIN bovenaan; zonder auto zoekt de API de hele catalogus af en komen
 * er olieaftappluggen en -schroeven bovendrijven waar de klant niets aan
 * heeft.
 */
export async function searchParts(
  term: string,
  limit = 20,
  page = 0,
  carId?: number,
): Promise<{ parts: Part[]; total: number }> {
  const { articles, total } = await searchArticles({
    search: term,
    carId,
    limit,
    page,
  });
  return {
    parts: rankByName(
      articles.flatMap((article) => {
        const part = toPart(article, SEARCH_CATEGORY_SLUG, "");
        return part ? [part] : [];
      }),
      term,
    ),
    total,
  };
}

/**
 * Treffers waarvan de naam met de zoekterm begint naar voren halen.
 *
 * De leverancier zoekt over meerdere velden tegelijk, dus "olie" matcht ook
 * op een schroef die "olieaftapplug" heet of op een merk. Een artikel dat
 * letterlijk "Olie" heet is bijna altijd wat de klant bedoelde; dat hoort
 * bovenaan. Een stabiele sortering, zodat de volgorde van de API verder
 * intact blijft.
 */
function rankByName(parts: Part[], term: string): Part[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return parts;

  const score = (part: Part): number => {
    const name = part.name.toLowerCase();
    if (name === needle) return 0;
    if (name.startsWith(needle)) return 1;
    if (name.includes(needle)) return 2;
    return 3;
  };

  return parts
    .map((part, index) => ({ part, index, score: score(part) }))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.part);
}

/** Onderdelen binnen één categorie van één auto */
export async function partsInGroup({
  carId,
  categoryId,
  categorySlug,
  categoryName,
  genericArticleId,
  limit = 20,
  page = 0,
}: {
  carId: number;
  categoryId: number;
  categorySlug: string;
  categoryName: string;
  /** Beperk tot het soort waar de groep over gaat; zie ArticleQuery */
  genericArticleId?: string;
  limit?: number;
  page?: number;
}): Promise<{ parts: Part[]; total: number }> {
  const { articles, total } = await searchArticles({
    carId,
    categoryId,
    genericArticleId,
    limit,
    page,
  });
  return {
    parts: articles.flatMap((article) => {
      const part = toPart(article, categorySlug, categoryName);
      return part ? [part] : [];
    }),
    total,
  };
}

export async function partById(id: string): Promise<Part | null> {
  const article = await articleById(id);
  return article ? toPart(article, SEARCH_CATEGORY_SLUG, "") : null;
}
