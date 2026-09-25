"use server";

import { articleCounts } from "@/lib/catalog/wearparts";
import {
  groupSlug,
  maintenanceGroup,
  partGroups,
} from "@/lib/catalog/wearparts-provider";

export interface QuickLinkChild {
  /** URL-segment, inclusief het id achteraan */
  slug: string;
  name: string;
  articleCount?: number;
}

export interface QuickLinkMenu {
  /** De hoofdgroep zelf, of `null` als deze auto hem niet heeft */
  slug: string | null;
  children: QuickLinkChild[];
}

/**
 * Het menu achter "Olie" of "Filters" voor één auto.
 *
 * Waarom een Server Action en geen vaste lijst: de categorieboom hangt aan de
 * auto. Dat geldt voor de kinderen — GEMETEN 2026-09-08 onder `Filter`: een
 * Citroën C3 heeft er zeven, een Chevrolet Aveo zes en een McLaren 720S maar
 * twee — én, sinds 2026-09-25, ook voor de hoofdgroep zelf. Die stond hier
 * als vast nummer en dat nummer betekent per auto iets anders: op een VW Polo
 * 6 kwam `filter-542` uit op **pagina niet gevonden**. Zie quick-links.ts.
 *
 * De aanroep gebeurt pas als de klant het menu opent, dus een bezoeker die er
 * niet op klikt kost niets.
 */
export async function quickLinkChildrenAction(
  carId: number,
  key: string,
): Promise<QuickLinkMenu> {
  const parent = await maintenanceGroup(carId, key);
  if (!parent) return { slug: null, children: [] };

  const children = await partGroups(carId, parent.id);
  const counts = await articleCounts(
    carId,
    // Alleen eindgroepen zijn te tellen; een subgroep met eigen kinderen
    // geeft HTTP 500 (zie articleCount).
    children.filter((child) => !child.hasChildren).map((child) => child.id),
  );

  return {
    slug: groupSlug(parent),
    children: children
      .map((child) => ({
        slug: groupSlug(child),
        name: child.name,
        articleCount: counts.get(child.id),
      }))
      .filter((child) => child.articleCount !== 0),
  };
}
