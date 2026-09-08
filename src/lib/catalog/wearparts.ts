// Client voor de Tyre24/ALZURA Wearparts REST API v1.6 — zie
// docs/api/WEARPARTS.md. Dit is een ándere API dan de Products-API v1.3
// (tyre24-provider.ts) met een eigen token en een eigen base path.
//
// Wat deze API kan en de andere niet: een Nederlands kenteken omzetten naar
// een TecDoc-voertuig, een categorieboom per auto leveren, en onderdelen op
// naam doorzoeken. Daarmee vervalt product area 3 voor de familie onderdelen.

import { z } from "zod";

const BASE = "https://tyre24.alzura.com/nl/nl/rest/V16/wearparts";

/** `keySystemType` 1 = Nederlands kenteken (de API kent er ruim twintig) */
const KEY_SYSTEM_DUTCH_PLATE = 1;

/** Cache-duur per soort antwoord, in seconden */
const CACHE = {
  /** Voertuiggegevens veranderen niet */
  vehicle: 86_400,
  /** Categorieboom per auto is stabiel */
  category: 86_400,
  /** Prijzen en voorraad: kort, net als bij de Products-API */
  articles: 300,
  /**
   * Aantallen per categorie. Lang, want dit is een structureel gegeven: of
   * er voor een auto überhaupt remschijven bestaan verandert niet per uur.
   * Zonder die lange cache betaalt elke bezoeker opnieuw tientallen calls,
   * en de leverancier staat er maar 100 per minuut toe voor de hele winkel.
   */
  counts: 86_400,
} as const;

function token(): string | null {
  return process.env.TYRE24_WEARPARTS_TOKEN ?? null;
}

async function get(
  path: string,
  params: Record<string, string | number | undefined>,
  revalidate: number,
): Promise<unknown> {
  const key = token();
  if (!key) throw new Error("TYRE24_WEARPARTS_TOKEN ontbreekt");

  const url = new URL(BASE + path);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(name, String(value));
  }

  const response = await fetch(url, {
    headers: { "X-AUTH-TOKEN": key },
    next: { revalidate },
  });
  if (!response.ok) {
    throw new Error(`Wearparts ${path} gaf HTTP ${response.status}`);
  }
  return response.json();
}

const vehicleByKeySchema = z.object({
  carId: z.coerce.number(),
  carName: z.string().optional(),
  manuId: z.coerce.number().optional(),
  modelId: z.coerce.number().optional(),
});

export interface WearpartsVehicle {
  carId: number;
  /** Bv. "CITROËN C3 AIRCROSS II (2R_, 2C_) 1.2 PureTech 110" */
  name: string;
}

/**
 * Kenteken → TecDoc-voertuig.
 *
 * Streepjes en kleine letters maken niet uit (gemeten). Meerdere treffers
 * komen voor als de registratie meerdere uitvoeringen dekt; we geven ze
 * allemaal terug en laten de UI kiezen.
 */
export async function vehiclesByPlate(
  plate: string,
): Promise<WearpartsVehicle[]> {
  const data = await get(
    "/vehicleByKey",
    {
      keySystemType: KEY_SYSTEM_DUTCH_PLATE,
      keySystemNumber: plate.trim().toUpperCase(),
    },
    CACHE.vehicle,
  );
  const parsed = z.array(vehicleByKeySchema).safeParse(data);
  if (!parsed.success) return [];
  return parsed.data.map((vehicle) => ({
    carId: vehicle.carId,
    name: vehicle.carName ?? "",
  }));
}

const categorySchema = z.object({
  assemblyGroupName: z.string(),
  assemblyGroupNodeId: z.coerce.number(),
  hasChilds: z.boolean().optional(),
  icon: z.string().optional(),
  parentNodeId: z.coerce.number().optional(),
  /** Waar deze groep eigenlijk over gaat; alleen eindgroepen hebben er een */
  defaultGenericArticleId: z.coerce.string().optional().catch(undefined),
});

export interface AssemblyGroup {
  id: number;
  name: string;
  hasChildren: boolean;
  /** Bovenliggende groep; ontbreekt bij de hoofdgroepen */
  parentId?: number;
  /**
   * Het TecDoc-soortnummer waar deze groep om draait.
   *
   * GEMETEN 2026-09-08: de groep "Oliefilter" (543) heeft er 7, en van de
   * eerste veertig artikelen dragen er maar zeven dat nummer. De rest zijn
   * afsluitschroeven (593) en afdichtringen (135) — ze horen bij een
   * olieverversing, maar wie op "Oliefilter" klikt wil eerst een filter zien.
   * Alleen eindgroepen hebben dit veld.
   */
  defaultGenericArticleId?: string;
  /** Icoon van de leverancier; niet elke groep heeft er een */
  iconUrl?: string;
  /**
   * Aantal artikelen voor de gekozen auto. Alleen gevuld waar we het echt
   * nodig hebben (zie `articleCounts`); `-1` betekent "telling mislukt, bij
   * twijfel tonen".
   */
  articleCount?: number;
}

/**
 * Categorieboom voor één auto. Zonder `parentNodeId` de hoofdgroepen
 * (Remsysteem, Filter, Carrosserie…), anders de subgroepen daarvan.
 *
 * De boom hángt aan de auto: er is geen algemene categorielijst. Dat is een
 * eigenschap van de API, geen keuze van ons — `/category` zonder `carId`
 * antwoordt met ERR_MISSING_MANDATORY_PARAMETER.
 */
/**
 * Formaat waarin we categorie-iconen opvragen.
 *
 * GEMETEN 2026-09-07: de bron is 240x150 en schaalt niet verder op — vraag je
 * 400, dan komt er alsnog 240x150 terug. Dit is dus de scherpste variant, en
 * daarmee groot genoeg voor de beeldtegels op de categoriepagina (80px breed
 * op een 3x-scherm). Het zijn pictogrammen, geen productfoto's: zwarte
 * silhouetten op transparant, vandaar dat de UI ze op een wit vlak zet.
 */
const ICON_SIZE = 240;

/**
 * Icoon-URLs dragen twee %d-plaatshouders voor breedte en hoogte, net als de
 * productfotos van de Products-API hun %s. Onbewerkt geeft de URL HTTP 400.
 */
function iconUrl(link: string | undefined): string | undefined {
  if (!link) return undefined;
  return link.replace("w%d-h%d", `w${ICON_SIZE}-h${ICON_SIZE}`);
}

export async function assemblyGroups(
  carId: number,
  parentNodeId?: number,
): Promise<AssemblyGroup[]> {
  const data = await get("/category", { carId, parentNodeId }, CACHE.category);
  const parsed = z.array(categorySchema).safeParse(data);
  if (!parsed.success) return [];
  // GEMETEN: /category geeft de héle boom plat terug (692 knopen voor één
  // auto), niet alleen het gevraagde niveau. Zelf filteren dus: zonder
  // parentNodeId de 33 hoofdgroepen, anders de directe kinderen.
  return parsed.data
    .filter((group) =>
      parentNodeId === undefined
        ? !group.parentNodeId
        : group.parentNodeId === parentNodeId,
    )
    .map(toGroup);
}

/**
 * De hele boom in één keer, plat.
 *
 * `/category` levert hem toch al compleet (gemeten: 775 knopen voor één
 * auto), dus dit is dezelfde gecachte call als `assemblyGroups()`. Wie de
 * boom wil aflopen — om bladeren te verzamelen of een pad te bepalen — heeft
 * hier alles, zonder extra verkeer.
 */
export async function assemblyTree(carId: number): Promise<AssemblyGroup[]> {
  const data = await get("/category", { carId }, CACHE.category);
  const parsed = z.array(categorySchema).safeParse(data);
  return parsed.success ? parsed.data.map(toGroup) : [];
}

function toGroup(group: z.infer<typeof categorySchema>): AssemblyGroup {
  return {
    id: group.assemblyGroupNodeId,
    name: group.assemblyGroupName,
    hasChildren: group.hasChilds ?? false,
    parentId: group.parentNodeId,
    defaultGenericArticleId: group.defaultGenericArticleId,
    iconUrl: iconUrl(group.icon),
  };
}

/**
 * Eén groep opzoeken, op welk niveau dan ook. De boom komt plat terug, dus
 * dit is dezelfde (gecachte) call als assemblyGroups() — geen extra verkeer.
 */
export async function assemblyGroupById(
  carId: number,
  groupId: number,
): Promise<AssemblyGroup | null> {
  const data = await get("/category", { carId }, CACHE.category);
  const parsed = z.array(categorySchema).safeParse(data);
  if (!parsed.success) return null;
  const node = parsed.data.find(
    (group) => group.assemblyGroupNodeId === groupId,
  );
  return node ? toGroup(node) : null;
}

const offerSchema = z.object({
  price: z.coerce.number().optional(),
  retailPrice: z.coerce.number().optional(),
  stock: z.coerce.number().optional(),
  sellerName: z.string().optional(),
});

const thumbnailSchema = z.object({
  thumbFileName: z.string().optional(),
});

const articleSchema = z.object({
  id: z.string(),
  articleId: z.string().optional(),
  articleName: z.string(),
  // Productlijn van de fabrikant, bv. "PROTRAC 4FUN". Pas samen met
  // articleName onderscheidend: vijftig sneeuwkettingen heten allemaal
  // "Sneeuwketting".
  articleAddName: z.string().optional().catch(undefined),
  brandName: z.string().optional().catch(undefined),
  eanNumber: z.array(z.string()).optional().catch(undefined),
  /**
   * TecDoc-soortnummer: 7 = oliefilter, 8 = luchtfilter, 593 = afsluitschroef.
   * Komt soms als lijst terug ("135,2048"), dus als tekst behandelen.
   * Hiermee scheiden we het echte product van de bijbehorende schroefjes —
   * zie `defaultGenericArticleId` op de groep.
   */
  genericArticleId: z.coerce.string().optional().catch(undefined),
  // GEMETEN: quality komt als getal terug, niet als tekst. Een strikt
  // stringschema liet hier élk artikel afvallen.
  quality: z.coerce.string().optional().catch(undefined),
  // Productfoto. Anders dan bij de Products-API is dit een kant-en-klare
  // URL zonder plaatshouders, op een eigen CDN (cdn01.alzura.com).
  image: z.string().optional().catch(undefined),
  offerList: z.array(offerSchema).optional(),
  thumbnails: z.array(thumbnailSchema).optional().catch(undefined),
  // Attributen met een door de leverancier vertaald label:
  // { "71": { translation: "Bandenmaat", value: "155/80-15", unit: "" } }
  attr: z
    .record(
      z.string(),
      z.object({
        translation: z.string().optional(),
        value: z.coerce.string().optional(),
        unit: z.string().optional(),
      }),
    )
    .optional()
    .catch(undefined),
  packingUnit: z.coerce.number().optional().catch(undefined),
  quantityPerPackingUnit: z.coerce.number().optional().catch(undefined),
});

const articlesResponseSchema = z.object({
  response: z.object({
    numFound: z.coerce.number().optional(),
    docs: z.array(z.unknown()).optional(),
  }),
});

export type WearpartsArticle = z.infer<typeof articleSchema>;

export interface ArticleQuery {
  /** Vrije tekst. Prefixen: OEN…, EAN…, TNS…, AID…, ID… */
  search?: string;
  carId?: number;
  /** `assemblyGroupNodeId`; vereist samen met carId */
  categoryId?: number;
  /**
   * Beperk tot één TecDoc-soort, bv. 7 voor oliefilters.
   *
   * GEMETEN 2026-09-08: groep 543 "Oliefilter" geeft 125 artikelen, waarvan
   * 65 echte filters; de rest zijn afsluitschroeven en afdichtringen die
   * bovenaan in de lijst stonden. Met dit filter komt de klant binnen bij
   * waar hij voor kwam.
   */
  genericArticleId?: string;
  limit?: number;
  page?: number;
}

/**
 * Artikelen zoeken.
 *
 * Twee ingangen: vrije tekst (werkt zonder auto — "remschijf" geeft ruim
 * zevenduizend treffers) of categorie + auto. De API eist bij een
 * categoriezoekopdracht beide filters.
 */
export async function searchArticles(
  query: ArticleQuery,
): Promise<{ articles: WearpartsArticle[]; total: number }> {
  let data: unknown;
  try {
    data = await get(
      "/articles",
      {
        search: query.search,
        "filter[carId]": query.carId,
        "filter[category]": query.categoryId,
        "filter[genericArticleId]": query.genericArticleId,
        limit: query.limit ?? 20,
        page: query.page ?? 0,
      },
      CACHE.articles,
    );
  } catch (error) {
    // Eén kapotte categorie mag geen foutpagina opleveren; dezelfde regel als
    // bij de Products-API.
    console.error(
      "Wearparts /articles faalde:",
      error instanceof Error ? error.message : error,
    );
    return { articles: [], total: 0 };
  }
  const parsed = articlesResponseSchema.safeParse(data);
  if (!parsed.success) return { articles: [], total: 0 };

  const articles = (parsed.data.response.docs ?? []).flatMap((raw) => {
    const article = articleSchema.safeParse(raw);
    return article.success ? [article.data] : [];
  });
  return { articles, total: parsed.data.response.numFound ?? articles.length };
}

/**
 * Aantal artikelen in één groep, zonder de artikelen zelf op te halen.
 *
 * GEMETEN 2026-09-08: `/articles` geeft `response.numFound`. Daarmee kunnen we
 * een lege eindgroep herkennen vóór de klant erop klikt — `Bediening /
 * Hydraulica` (1089) is er zo een: een blad met nul artikelen.
 *
 * **Alleen op eindgroepen.** Een groep die zelf nog subgroepen heeft geeft
 * HTTP 500, ook de hoofdgroepen (890, 1342, 542… allemaal gemeten). Roep dit
 * dus nooit aan op een knoop met kinderen: je krijgt gegarandeerd -1 terug en
 * verbruikt een call uit de limiet van 100 per minuut voor niets.
 *
 * `limit: 1` omdat we de artikelen niet nodig hebben; alleen het getal.
 */
export async function articleCount(
  carId: number,
  categoryId: number,
): Promise<number> {
  let data: unknown;
  try {
    data = await get(
      "/articles",
      {
        "filter[carId]": carId,
        "filter[category]": categoryId,
        limit: 1,
      },
      CACHE.counts,
    );
  } catch {
    // Een mislukte telling mag geen categorie laten verdwijnen: bij twijfel
    // tonen we hem gewoon. Liever een lege pagina dan een onvindbaar artikel.
    return -1;
  }
  const parsed = articlesResponseSchema.safeParse(data);
  return parsed.success ? (parsed.data.response.numFound ?? 0) : -1;
}

/**
 * Tel meerdere groepen tegelijk, maar niet allemaal tegelijk.
 *
 * De leverancier staat 100 requests per minuut toe voor de hele winkel; een
 * hoofdgroep met veertig bladeren zou daar in één paginaweergave doorheen
 * gaan. Zes tegelijk houdt het snel (gemeten: elf tellingen in ~700 ms) en
 * laat ruimte voor andere bezoekers.
 */
const COUNT_CONCURRENCY = 6;

export async function articleCounts(
  carId: number,
  categoryIds: readonly number[],
): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  const queue = [...categoryIds];

  async function worker(): Promise<void> {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      result.set(id, await articleCount(carId, id));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(COUNT_CONCURRENCY, queue.length) }, worker),
  );
  return result;
}

/**
 * Eén artikel op zijn id. De `ID`-prefix is een exacte sleutel: gemeten geeft
 * hij precies één treffer, waar hetzelfde nummer zonder prefix er drie geeft.
 */
export async function articleById(
  id: string,
): Promise<WearpartsArticle | null> {
  const { articles } = await searchArticles({ search: `ID${id}`, limit: 1 });
  return articles[0] ?? null;
}

const vehicleDetailsSchema = z.object({
  vehicleDetails: z
    .object({
      manuName: z.string().optional(),
      modelName: z.string().optional(),
      typeName: z.string().optional(),
      fuelType: z.string().optional(),
      powerKwFrom: z.coerce.number().optional(),
      cylinderCapacityCcm: z.coerce.number().optional(),
      constructionType: z.string().optional(),
    })
    .optional(),
});

export interface WearpartsVehicleDetails {
  brand?: string;
  model?: string;
  /** Motorvariant, bv. "1.2 PureTech 110 (2RHNZB, …)" */
  type?: string;
  fuel?: string;
  powerKw?: number;
  engineCapacityCc?: number;
  /** Carrosserievorm, bv. "SUV" */
  bodyType?: string;
}

/**
 * Details van één voertuig. Genoeg om de klant te laten herkennen dat dit
 * zijn auto is, ook als de RDW-gegevens ontbreken.
 *
 * Let op: `yearOfConstrFrom` is het bouwjaar van het *model*, niet van dít
 * exemplaar. Dat nemen we bewust niet over — anders zou de shop een bouwjaar
 * tonen dat niet van de auto van de klant is.
 */
export async function vehicleDetailsByCarId(
  carId: number,
): Promise<WearpartsVehicleDetails | null> {
  const data = await get(
    "/vehiclesByCarIds",
    { "carId[]": carId },
    CACHE.vehicle,
  );
  const parsed = z.array(vehicleDetailsSchema).safeParse(data);
  const details = parsed.success ? parsed.data[0]?.vehicleDetails : undefined;
  if (!details) return null;
  return {
    brand: details.manuName,
    model: details.modelName,
    type: details.typeName,
    fuel: details.fuelType,
    powerKw: details.powerKwFrom,
    engineCapacityCc: details.cylinderCapacityCcm,
    bodyType: details.constructionType,
  };
}

const manufacturerSchema = z.object({
  manuId: z.coerce.number(),
  manuName: z.string(),
});

const modelSeriesSchema = z.object({
  modelId: z.coerce.number(),
  modelname: z.string(),
  yearOfConstrFrom: z.coerce.number().optional(),
  yearOfConstrTo: z.coerce.number().optional().catch(undefined),
});

export interface VehicleMake {
  id: number;
  name: string;
}

export interface VehicleModel {
  id: number;
  name: string;
  /** Bouwjaren van het model, als JJJJMM */
  from?: number;
  until?: number;
}

/** Alle voertuigmerken die TecDoc kent (469 op het NL-platform) */
export async function vehicleMakes(): Promise<VehicleMake[]> {
  const data = await get("/manufacturers", {}, CACHE.vehicle);
  const parsed = z.array(manufacturerSchema).safeParse(data);
  if (!parsed.success) return [];
  return parsed.data.map((make) => ({ id: make.manuId, name: make.manuName }));
}

export async function vehicleModels(manuId: number): Promise<VehicleModel[]> {
  const data = await get(
    "/modelSeries",
    { manufacturerId: manuId },
    CACHE.vehicle,
  );
  const parsed = z.array(modelSeriesSchema).safeParse(data);
  if (!parsed.success) return [];
  return parsed.data.map((model) => ({
    id: model.modelId,
    name: model.modelname,
    from: model.yearOfConstrFrom,
    until: model.yearOfConstrTo,
  }));
}

const vehicleTypeSchema = z.object({
  carId: z.coerce.number(),
  vehicleDetails: z
    .object({
      typeName: z.string().optional(),
      fuelType: z.string().optional(),
      powerKwFrom: z.coerce.number().optional(),
      powerHpFrom: z.coerce.number().optional(),
      cylinderCapacityCcm: z.coerce.number().optional(),
      constructionType: z.string().optional(),
      yearOfConstrFrom: z.coerce.number().optional(),
      yearOfConstrTo: z.coerce.number().optional().catch(undefined),
    })
    .optional(),
});

export interface VehicleType {
  carId: number;
  /** Motorvariant, bv. "1.2 PureTech 110" */
  name: string;
  fuel?: string;
  powerKw?: number;
  powerHp?: number;
  engineCapacityCc?: number;
  bodyType?: string;
  from?: number;
  until?: number;
}

/**
 * Uitvoeringen van één model. Dit is de stap die fitment mogelijk maakt: pas
 * hier ontstaat een carId, en dat bepaalt welke onderdelen passen. Bouwjaar
 * alleen is niet genoeg — een Golf uit 2015 heeft zes motorvarianten met
 * verschillende remmen.
 */
export async function vehicleTypes(
  manuId: number,
  modelId: number,
): Promise<VehicleType[]> {
  const data = await get(
    "/vehicles",
    { manufacturerId: manuId, modelId },
    CACHE.vehicle,
  );
  const parsed = z.array(vehicleTypeSchema).safeParse(data);
  if (!parsed.success) return [];
  return parsed.data.map((entry) => ({
    carId: entry.carId,
    name: entry.vehicleDetails?.typeName ?? "",
    fuel: entry.vehicleDetails?.fuelType,
    powerKw: entry.vehicleDetails?.powerKwFrom,
    powerHp: entry.vehicleDetails?.powerHpFrom,
    engineCapacityCc: entry.vehicleDetails?.cylinderCapacityCcm,
    bodyType: entry.vehicleDetails?.constructionType,
    from: entry.vehicleDetails?.yearOfConstrFrom,
    until: entry.vehicleDetails?.yearOfConstrTo,
  }));
}
