import type { Locale } from "@/i18n/routing";
import { partTyreSeason } from "@/lib/catalog/tyre-size";
import type { Part } from "@/lib/catalog/types";

/**
 * De gidsen: uitleg per zoekvraag (docs/DECISIONS.md #37).
 *
 * Elke gids beantwoordt één vraag die mensen stellen vóórdat ze iets kopen —
 * "wat betekent 205/55 R16", "welke olie moet erin" — en eindigt bij de plek
 * in de winkel waar ze het antwoord gebruiken. Ze kosten geen verzoek bij de
 * leverancier: de tekst staat in messages/, onder `guides.<key>`.
 *
 * **Alleen wat op de band, de fles of in het instructieboekje staat.** Geen
 * advies dat een monteur hoort te geven, en geen bewering over de catalogus
 * die niet gemeten is. Een gids toevoegen is één regel hier plus zijn tekst
 * in beide talen.
 *
 * De slug is per taal anders, net als de familieslugs: een Engelse bezoeker
 * zoekt niet op "bandenmaat-aflezen".
 */
export const GUIDES = [
  {
    key: "tyreSize",
    slug: { nl: "bandenmaat-aflezen", en: "reading-your-tyre-size" },
    updated: "2026-11-23",
  },
  {
    key: "winterTyres",
    slug: { nl: "winterbanden", en: "winter-tyres" },
    updated: "2026-11-23",
  },
  {
    key: "engineOil",
    slug: { nl: "motorolie-kiezen", en: "choosing-engine-oil" },
    updated: "2026-11-23",
  },
] as const satisfies ReadonlyArray<{
  key: string;
  slug: Record<Locale, string>;
  /** Laatst inhoudelijk nagekeken; staat op de pagina en in de markering */
  updated: string;
}>;

export type Guide = (typeof GUIDES)[number];
export type GuideKey = Guide["key"];

export function guideSlug(guide: Guide, locale: string): string {
  return guide.slug[locale as Locale] ?? guide.slug.nl;
}

export function guideBySlug(slug: string, locale: string): Guide | null {
  return GUIDES.find((guide) => guideSlug(guide, locale) === slug) ?? null;
}

export function guideByKey(key: GuideKey): Guide {
  // De sleutel komt uit het type van GUIDES zelf, dus hij bestaat altijd.
  return GUIDES.find((guide) => guide.key === key) ?? GUIDES[0];
}

/**
 * Het TecDoc-soortnummer van motorolie. Stabiel, anders dan een groep-id in
 * de boom (docs/DECISIONS.md #7); zelfde nummer als in
 * `lib/admin/part-kinds.ts`.
 */
const ENGINE_OIL_KIND = "3224";

/**
 * Welke gidsen bij een artikel horen, voor het blok "Hulp bij het kiezen" op
 * de productpagina. Een band krijgt de uitleg over de maat, een winterband
 * daarnaast die over winterbanden, en motorolie de olie-uitleg. De rest krijgt
 * niets: een gids die niet over het artikel gaat is een advertentie.
 */
export function guidesForPart(part: Part): Guide[] {
  const keys: GuideKey[] = [];
  if (part.family === "banden") {
    keys.push("tyreSize");
    if (partTyreSeason(part) === "winter") keys.push("winterTyres");
  }
  if (part.kinds?.includes(ENGINE_OIL_KIND)) keys.push("engineOil");
  return keys.map(guideByKey);
}
