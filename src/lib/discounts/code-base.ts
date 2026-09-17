/**
 * Het rekenwerk van een kortingscode, zonder database eromheen.
 *
 * Apart van `codes.ts` omdat het besteloverzicht in de browser draait en
 * hetzelfde bedrag moet uitrekenen als de server. Importeerde dat overzicht
 * `codes.ts`, dan kwam de MySQL-driver mee de bundel in en brak de hele
 * checkout op "Can't resolve 'net'" (GEMETEN 2026-09-17).
 */

/**
 * Het bedrag waar een code over mag rekenen: alles zonder eigen actie.
 *
 * Een code geldt niet op artikelen die al in de aanbieding zijn — twee
 * kortingen over elkaar zakken door de marge-ondergrens (docs/DECISIONS.md #14).
 */
export function codeBaseCents(
  lines: ReadonlyArray<{
    priceCents: number;
    quantity: number;
    discountPercent?: number;
  }>,
): number {
  return lines
    .filter((line) => !line.discountPercent || line.discountPercent <= 0)
    .reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
}

/**
 * Het kortingsbedrag. Naar beneden afgerond: liever een cent te weinig korting
 * dan een bedrag dat op de factuur niet terug te rekenen is.
 */
export function codeDiscountCents(
  baseGrossCents: number,
  percent: number,
): number {
  return Math.floor((baseGrossCents * percent) / 100);
}

/** De code zoals de klant hem intypt, opgeruimd */
export function normalizeCode(value: string): string {
  return value.trim().toUpperCase().slice(0, 32);
}
