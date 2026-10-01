import {
  type ProductFamily,
  usesVehicleCatalog,
} from "@/lib/catalog/families";
import { loadPartById } from "@/lib/catalog/lookup";
import { getCatalogProvider } from "@/lib/catalog/provider";
import type { Part } from "@/lib/catalog/types";
import { partKindName } from "@/lib/admin/part-kinds";
import { activeRules, type DiscountRule } from "./rules";

/**
 * Wat er nú in de aanbieding is, als dia's voor de hero en de
 * aanbiedingenpagina.
 *
 * Andersom geredeneerd dan de rest van de winkel: die kijkt per artikel of er
 * een regel op past, dit begint bij de regel en zoekt de artikelen erbij. Dat
 * kost API-verkeer, dus het antwoord blijft een kwartier staan — de homepage is
 * de drukste pagina van de winkel en dit rijtje verandert hooguit een paar keer
 * per week (docs/DECISIONS.md #14).
 *
 * **Niet elke regel levert artikelen op, en toch moet elke regel te zien zijn.**
 * Onderdelen hangen aan een auto: hun categorieboom en artikellijst zijn niet
 * op te vragen zonder `carId`. Een korting op alle onderdelen werkte daardoor
 * wél in de winkel maar was nergens aangekondigd — de eigenaar zag zijn eigen
 * actie niet terug op de homepage. Zo'n regel wordt hier een **aankondiging**:
 * een dia met de familiefoto die de klant naar de onderdelenpagina stuurt, waar
 * hij zijn kenteken invult. Eén artikel aanwijzen kan altijd en levert gewoon
 * een artikeldia op.
 */

export type OfferSlide =
  | { kind: "part"; key: string; part: Part }
  | {
      kind: "promo";
      key: string;
      family: ProductFamily;
      percent: number;
      /** De soort onderdeel bij een `kind`-regel; leeg = de hele familie */
      subject: string | null;
    };

/** Hoeveel artikelen we per regel ophalen om uit te kiezen */
const PER_RULE = 24;

/** Meer regels dan dit tegelijk uitpluizen is het niet waard; vijf acties is al veel */
const MAX_RULES = 6;

const CACHE_MS = 15 * 60_000;
let cache: { at: number; signature: string; parts: Part[] } | null = null;

/**
 * Welke acties er lopen, als één tekenreeks.
 *
 * Het kwartier geheugen is voor het API-verkeer, maar het mag geen actie laten
 * doorlopen die er niet meer is: een regel die op zijn einddatum afloopt komt
 * langs niemand die de cache kan wissen. Verandert de verzameling regels, dan
 * wordt het rijtje opnieuw opgehaald — ook binnen het kwartier.
 */
function signatureOf(rules: ReadonlyArray<DiscountRule>): string {
  return rules
    .map((rule) => `${rule.id}:${rule.percent}`)
    .sort()
    .join("|");
}

/**
 * Een regel die wél geldt maar geen lijst oplevert: alles op een catalogus die
 * aan een auto hangt, behalve één aangewezen artikel.
 *
 * Een categorieregel valt er bewust buiten. Die bestaat hier niet — bij
 * onderdelen kán hij niet eens worden aangemaakt (de categorieboom hangt aan
 * een auto) — en zou hij ooit toch opduiken, dan is "alle onderdelen" een
 * bredere belofte dan de regel waarmaakt.
 */
function toPromo(rule: DiscountRule): OfferSlide[] {
  if (!usesVehicleCatalog(rule.family)) return [];
  if (rule.scope !== "family" && rule.scope !== "kind") return [];

  // Bij een soortregel moet de aankondiging die soort kunnen noemen. Lukt dat
  // niet — een soortnummer dat niet (meer) in PART_KINDS staat — dan zwijgen
  // we liever: "korting op alle onderdelen" zou meer beloven dan de regel geeft.
  const subject = rule.scope === "kind" ? partKindName(rule.target) : null;
  if (rule.scope === "kind" && !subject) return [];

  return [
    {
      kind: "promo",
      key: `promo-${rule.id}`,
      family: rule.family,
      percent: rule.percent,
      subject: subject ?? null,
    },
  ];
}

async function partsForRule(rule: DiscountRule): Promise<Part[]> {
  if (!rule.family) return [];

  if (rule.scope === "part") {
    const part = await loadPartById(rule.family, rule.target);
    return part ? [part] : [];
  }

  // De catalogus van onderdelen is niet te bevragen zonder gekozen auto; die
  // regel is hierboven al een aankondiging geworden
  if (usesVehicleCatalog(rule.family)) return [];

  return getCatalogProvider().getParts({
    family: rule.family,
    categorySlug: rule.scope === "category" ? rule.target : undefined,
    limit: PER_RULE,
  });
}

/** De artikelen achter de regels, met het kwartier geheugen eromheen */
async function offerPartsFor(
  rules: ReadonlyArray<DiscountRule>,
): Promise<Part[]> {
  const now = Date.now();
  const signature = signatureOf(rules);

  if (cache && cache.signature === signature && now - cache.at < CACHE_MS) {
    return cache.parts;
  }

  if (rules.length === 0) {
    cache = { at: now, signature, parts: [] };
    return [];
  }

  try {
    const lists = await Promise.all(rules.map((rule) => partsForRule(rule)));
    // Alleen artikelen waar de korting ook echt op uitkomt: de
    // marge-ondergrens kan hem bij een deel van een categorie opeten, en dan
    // is er niets aan te kondigen.
    const byId = new Map<string, Part>();
    for (const part of lists.flat()) {
      if ((part.discountPercent ?? 0) > 0) byId.set(part.id, part);
    }
    const found = [...byId.values()].sort(
      (a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0),
    );
    cache = { at: now, signature, parts: found };
    return found;
  } catch (error) {
    // Ligt de leverancier eruit, dan tonen we wat we nog hadden. De
    // aankondigingen hierboven komen uit onze eigen database en blijven staan.
    console.error("Aanbiedingen konden niet geladen worden", error);
    return cache?.parts ?? [];
  }
}

/**
 * De dia's, aankondigingen eerst.
 *
 * Die volgorde is met opzet. Een aankondiging is er hooguit één of twee en hij
 * is het enige dat anders onzichtbaar blijft; een artikeldia staat verderop in
 * de carrousel nog steeds. Het beeld van een aankondiging staat bovendien in
 * onze eigen `public/`-map, dus het grootste beeld van de homepage komt van
 * onze eigen server in plaats van van de media-servers van de leverancier.
 */
export async function offerSlides(limit = 8): Promise<OfferSlide[]> {
  const rules = (await activeRules()).slice(0, MAX_RULES);
  const promos = rules.flatMap(toPromo);
  const parts = await offerPartsFor(rules);

  return [
    ...promos,
    ...parts.map(
      (part): OfferSlide => ({ kind: "part", key: part.id, part }),
    ),
  ].slice(0, limit);
}

/** Na een wijziging in het paneel hoeft niemand een kwartier te wachten */
export function forgetOffers(): void {
  cache = null;
}
