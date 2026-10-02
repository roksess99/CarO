import { routing } from "@/i18n/routing";
import { familySlug, PRODUCT_FAMILIES } from "@/lib/catalog/families";

/**
 * Welk soort pagina is dit? Afgeleid uit het pad, in de browser.
 *
 * **Niet het hele pad**, want dan zou de teller per artikel een rij krijgen en
 * groeit hij mee met de catalogus. Het soort pagina is wat de eigenaar wil
 * weten: komen mensen op een productpagina of blijven ze op de voorpagina
 * hangen.
 *
 * De vaste pagina's komen uit `routing.pathnames` en de familieslugs uit
 * `families.ts`, dus een nieuwe pagina of een hernoemde familie hoeft hier
 * niet nagelopen te worden.
 */

/** Eerste segment per taal → de naam die wij eraan geven ("/offers" → "offers") */
const STATIC = new Map<string, string>();
for (const [key, value] of Object.entries(routing.pathnames)) {
  if (key.includes("[")) continue;
  const paths = typeof value === "string" ? [value] : Object.values(value);
  for (const path of paths) {
    const segment = path.split("/").filter(Boolean)[0];
    if (segment) STATIC.set(segment, key.replace(/^\//, "").replace(/\//g, "-"));
  }
}

/** Alle familieslugs in alle talen */
const FAMILIES = new Set(
  routing.locales.flatMap((locale) =>
    PRODUCT_FAMILIES.map((family) => familySlug(family, locale)),
  ),
);

export function pageKind(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);

  // Het taalsegment eraf; een pad zonder taal komt in de praktijk niet voor,
  // maar een proxy die hem weglaat mag geen onzin opleveren.
  if (parts[0] && (routing.locales as ReadonlyArray<string>).includes(parts[0])) {
    parts.shift();
  }

  if (parts.length === 0) return "home";

  const first = parts[0];
  const vast = STATIC.get(first);
  if (vast) return vast;

  if (FAMILIES.has(first)) {
    if (parts.length === 1) return "familie";
    if (parts.length === 2) return "categorie";
    return "product";
  }

  return "overig";
}
