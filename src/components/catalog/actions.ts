"use server";

import { MAINTENANCE_LINKS } from "@/lib/catalog/quick-links";
import { articleCounts } from "@/lib/catalog/wearparts";
import { groupSlug, partGroups } from "@/lib/catalog/wearparts-provider";

export interface QuickLinkChild {
  /** URL-segment, inclusief het id achteraan */
  slug: string;
  name: string;
  articleCount?: number;
}

/**
 * Subgroepen achter de knoppen "Olie" en "Filters".
 *
 * Waarom een Server Action en geen vaste lijst: de categorieboom hangt aan de
 * auto en de kinderen verschillen echt. GEMETEN 2026-09-08 onder `Filter`
 * (542): een Citroën C3 heeft er zeven, een Chevrolet Aveo zes en een McLaren
 * 720S maar twee. Een vastgelegd menu zou de McLaren-eigenaar naar een
 * luchtfilter sturen die niet in zijn boom staat — en dus naar een 404.
 *
 * De aanroep gebeurt pas als de klant het menu opent, dus een bezoeker die
 * er niet op klikt kost niets.
 */
export async function quickLinkChildrenAction(
  carId: number,
  key: string,
): Promise<QuickLinkChild[]> {
  const link = MAINTENANCE_LINKS.find((entry) => entry.key === key);
  if (!link) return [];

  const parentId = Number(link.slug.split("-").pop());
  if (!Number.isInteger(parentId)) return [];

  const children = await partGroups(carId, parentId);
  const counts = await articleCounts(
    carId,
    // Alleen eindgroepen zijn te tellen; een subgroep met eigen kinderen
    // geeft HTTP 500 (zie articleCount).
    children.filter((child) => !child.hasChildren).map((child) => child.id),
  );

  return children
    .map((child) => ({
      slug: groupSlug(child),
      name: child.name,
      articleCount: counts.get(child.id),
    }))
    .filter((child) => child.articleCount !== 0);
}
