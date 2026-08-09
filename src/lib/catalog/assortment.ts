// Welke categorieën CarO verkoopt. Bewuste winkelkeuze: alleen auto's en
// tweewielers — geen vrachtwagens, landbouw, grondverzet of industrie.
// Zie docs/DECISIONS.md #7.
//
// De categorie-id's komen uit Tyre24 en zijn per productArea anders. Daarom
// per area een lijst. Een area die hier niet staat wordt niet gefilterd,
// zodat een nieuwe area niet stil een lege shop oplevert.

/** productAreaId → toegestane categorie-id's (met naam als toelichting) */
const ALLOWED_CATEGORIES: Record<string, ReadonlyMap<number, string>> = {
  // Area 6 = Banden (NL-platform).
  // Niet verkocht: Vrachtwagen (4), Landbouw (7), Grondverzet/MPT (8),
  // Industrie (9) en Overige (14) — die laatste omdat onbekend is wat
  // erin zit; allowlist betekent: eerst kijken, dan toelaten.
  "6": new Map([
    [1, "Auto / SUV"],
    [2, "Offroad"],
    [3, "Transporter"],
    [5, "Tweewieler"],
    [6, "Quad / ATV"],
    [11, "Kleine banden"],
  ]),
};

/**
 * Verkopen we deze categorie? Onbekende area → ja (geen filter).
 * Bewust een allowlist en geen blocklist: nieuwe categorieën uit de API
 * verschijnen dan niet automatisch in de shop.
 */
export function isCategoryInAssortment(
  productAreaId: string,
  categoryId: number,
): boolean {
  const allowed = ALLOWED_CATEGORIES[productAreaId];
  if (!allowed) return true;
  return allowed.has(categoryId);
}

export function hasAssortmentFilter(productAreaId: string): boolean {
  return productAreaId in ALLOWED_CATEGORIES;
}
