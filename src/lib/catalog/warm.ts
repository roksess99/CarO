import {
  PRODUCT_FAMILIES,
  usesVehicleCatalog,
  type ProductFamily,
} from "@/lib/catalog/families";
import { HOME_TYRE_SIZE } from "@/lib/catalog/popular-tyre-sizes";
import { getCatalogProvider } from "@/lib/catalog/provider";
import {
  SEASON_LANDINGS,
  seasonSearchTerm,
  TYRE_FETCH_SIZE,
  tyreSearchTerm,
} from "@/lib/catalog/tyre-size";

/**
 * De catalogus één keer aanraken, zodat de eerste echte bezoeker niet wacht.
 *
 * ---------------------------------------------------------------------------
 * WAAROM DIT EEN AANRAKING IS EN GEEN WARMHOUDRONDE — GEMETEN 2026-10-11
 * ---------------------------------------------------------------------------
 *
 * Een categoriepagina kost koud zes tot acht seconden, en dat is bijna
 * helemaal wachten op de leverancier (@docs/DECISIONS.md #32). De vraag was
 * hoe vaak je die cache moet verversen om dat weg te houden. Antwoord: niet.
 *
 * Gemeten met `PARTS_REVALIDATE` tijdelijk op 10 seconden, zodat het
 * vervallen van een ingang binnen een testronde paste:
 *
 * | Aanroep | Tijd |
 * |---|---|
 * | koud, geen ingang in de cache | **7,7 s** |
 * | meteen daarna | 0,085 s |
 * | **na 14 s, de ingang is dus verlopen** | **0,091 s** |
 * | nog eens 14 s later | 0,096 s |
 *
 * Een verlopen ingang wordt gewoon uitgeserveerd terwijl hij op de achtergrond
 * ververst. **De zes seconden treffen alleen een categorie die nog nooit is
 * opgehaald.** Dat is precies één situatie: een verse `.next/cache`, dus na
 * elke deploy.
 *
 * Daarom loopt dit één rondje en niet elke paar minuten. Elk uur opnieuw is
 * dan bijna gratis — alles staat er al — en het vangt het geval af waarin de
 * cache tussendoor is opgeruimd.
 *
 * ---------------------------------------------------------------------------
 * WAT HET AANRAAKT, EN WAAROM PRECIES DAT
 * ---------------------------------------------------------------------------
 *
 * Dezelfde aanroepen als de pagina's zelf doen, met dezelfde aantallen. Dat
 * is geen detail: Next sleutelt zijn cache op de volledige URL, dus een
 * rondje met `limit: 24` warmt niets op voor een pagina die er 20 vraagt.
 * Vandaar dat `CATEGORY_PAGE_SIZE` hieronder een kopie is van `PAGE_SIZE` in
 * `app/[locale]/[family]/[category]/page.tsx`, en dat de zoekopdrachten op
 * band dezelfde constanten importeren als de pagina's (`TYRE_FETCH_SIZE`,
 * `HOME_TYRE_SIZE`). Verandert de kopie, dan verliest dit bestand stil zijn
 * nut — er gaat niets stuk, het wordt alleen weer traag.
 *
 * **Sinds 2026-11-23 ook vier zoekopdrachten op band:** de rij "Banden in
 * maat 205/55 R16" op de homepage en de drie seizoenspagina's (winter, zomer,
 * all-season). Die kostten koud 19, 24 en 14 seconden (GEMETEN, één verzoek
 * per stuk). De oude homepagerijen — vier
 * artikelen per familie — bestaan niet meer (#36) en zijn hier weg.
 *
 * **Onderdelen doen niet mee.** Die catalogus hangt aan een gekozen auto
 * (`/category` zonder `carId` geeft ERR_MISSING_MANDATORY_PARAMETER, #7), dus
 * er valt niets te warmen zonder te raden welke auto's bezoekers hebben. Die
 * familiepagina is ook niet het probleem: GEMETEN 1 call en 0,18 s.
 *
 * **Het filterblok komt gratis mee.** `getFilters()` haalt exact dezelfde URL
 * op als `getParts()` voor dezelfde categorie — dat is de dubbeling uit #32,
 * en sinds beide dezelfde `revalidate` dragen is het één ingang in de cache.
 */

/** Gelijk aan `PAGE_SIZE` in de categoriepagina */
const CATEGORY_PAGE_SIZE = 20;


/**
 * Rust tussen twee aanroepen.
 *
 * De leverancier staat 100 verzoeken per minuut toe voor de **hele winkel**,
 * dus een taak die daar met volle snelheid doorheen gaat, gaat ten koste van
 * bezoekers die op dat moment aan het winkelen zijn. 2 seconden is 30 per
 * minuut: ruim onder de helft, en het mag rustig een minuut duren — er kijkt
 * niemand naar.
 */
const PAUSE_MS = 2_000;

export interface WarmResult {
  /** Aantal categorieën dat is aangeraakt */
  categories: number;
  /** Aantal aanroepen dat de provider heeft gedaan (gecacht of niet) */
  calls: number;
  ms: number;
  errors: string[];
}

const rust = (ms: number) => new Promise((klaar) => setTimeout(klaar, ms));

/**
 * Twee rondjes tegelijk zouden het dubbele aan verzoeken kosten zonder iets
 * extra's op te leveren. Dit slot is in het proces en niet in de database:
 * warmen is geen boekhouding, en twee servers die het allebei doen is geen
 * probleem — ze vullen elk hun eigen schijfcache.
 */
let running = false;

export async function warmCatalog(): Promise<WarmResult & { skipped: boolean }> {
  const begin = Date.now();
  const leeg = { categories: 0, calls: 0, ms: 0, errors: [] as string[] };
  if (running) return { ...leeg, skipped: true };
  running = true;

  const provider = getCatalogProvider();
  const errors: string[] = [];
  let categories = 0;
  let calls = 0;

  const bladerbaar: ProductFamily[] = PRODUCT_FAMILIES.filter(
    (family) => !usesVehicleCatalog(family),
  );

  // Zoekopdrachten op band die een vaste pagina hebben: de rij op de
  // homepage en de seizoenspagina's. Zelfde term en zelfde limit als daar.
  const bandenZoeken = [
    tyreSearchTerm(HOME_TYRE_SIZE, null),
    ...SEASON_LANDINGS.map(seasonSearchTerm),
  ];

  try {
    for (const search of bandenZoeken) {
      try {
        await provider.getParts({
          family: "banden",
          search,
          limit: TYRE_FETCH_SIZE,
        });
        calls += 1;
      } catch (error) {
        errors.push(`banden "${search}": ${melding(error)}`);
      }
      await rust(PAUSE_MS);
    }

    for (const family of bladerbaar) {
      // 1. De categorieboom. Die zit een uur in de cache en wordt door de
      //    navigatie, het kruimelpad en de familiepagina gedeeld.
      let lijst: { slug: string }[] = [];
      try {
        lijst = await provider.getCategories(family);
        calls += 1;
      } catch (error) {
        errors.push(`${family} (categorieën): ${melding(error)}`);
        continue;
      }
      await rust(PAUSE_MS);

      // 2. De eerste pagina van elke categorie — dit is wat zes seconden kost.
      for (const category of lijst) {
        try {
          await provider.getParts({
            family,
            categorySlug: category.slug,
            limit: CATEGORY_PAGE_SIZE,
          });
          categories += 1;
          calls += 1;
        } catch (error) {
          errors.push(`${family}/${category.slug}: ${melding(error)}`);
        }
        await rust(PAUSE_MS);
      }
    }
  } finally {
    running = false;
  }

  return { categories, calls, ms: Date.now() - begin, errors, skipped: false };
}

function melding(error: unknown): string {
  return error instanceof Error ? error.message : "onbekende fout";
}
