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
} as const;

function token(): string | null {
  return process.env.TYRE24_WEARPARTS_TOKEN ?? null;
}

export function hasWearpartsToken(): boolean {
  return Boolean(token());
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
});

export interface AssemblyGroup {
  id: number;
  name: string;
  hasChildren: boolean;
  /** Icoon van de leverancier; niet elke groep heeft er een */
  iconUrl?: string;
}

/**
 * Categorieboom voor één auto. Zonder `parentNodeId` de hoofdgroepen
 * (Remsysteem, Filter, Carrosserie…), anders de subgroepen daarvan.
 *
 * De boom hángt aan de auto: er is geen algemene categorielijst. Dat is een
 * eigenschap van de API, geen keuze van ons — `/category` zonder `carId`
 * antwoordt met ERR_MISSING_MANDATORY_PARAMETER.
 */
/** Formaat waarin we categorie-iconen opvragen */
const ICON_SIZE = 64;

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
    .map((group) => ({
      id: group.assemblyGroupNodeId,
      name: group.assemblyGroupName,
      hasChildren: group.hasChilds ?? false,
      iconUrl: iconUrl(group.icon),
    }));
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
  if (!node) return null;
  return {
    id: node.assemblyGroupNodeId,
    name: node.assemblyGroupName,
    hasChildren: node.hasChilds ?? false,
    iconUrl: iconUrl(node.icon),
  };
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
  brandName: z.string().optional().catch(undefined),
  eanNumber: z.array(z.string()).optional().catch(undefined),
  // GEMETEN: quality komt als getal terug, niet als tekst. Een strikt
  // stringschema liet hier élk artikel afvallen.
  quality: z.coerce.string().optional().catch(undefined),
  // Productfoto. Anders dan bij de Products-API is dit een kant-en-klare
  // URL zonder plaatshouders, op een eigen CDN (cdn01.alzura.com).
  image: z.string().optional().catch(undefined),
  offerList: z.array(offerSchema).optional(),
  thumbnails: z.array(thumbnailSchema).optional().catch(undefined),
  attr: z.record(z.string(), z.unknown()).optional().catch(undefined),
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
 * Eén artikel op zijn id. De `ID`-prefix is een exacte sleutel: gemeten geeft
 * hij precies één treffer, waar hetzelfde nummer zonder prefix er drie geeft.
 */
export async function articleById(
  id: string,
): Promise<WearpartsArticle | null> {
  const { articles } = await searchArticles({ search: `ID${id}`, limit: 1 });
  return articles[0] ?? null;
}
