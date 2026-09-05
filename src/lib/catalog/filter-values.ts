/**
 * Filterwaarden vertalen.
 *
 * De waarden in het filterblok zijn vrije tekst van de groothandel, in de
 * taal van het platform: "kegel", "anthrazit matt", "gummi / metall". Een
 * complete vertaling bestaat niet — het zijn er honderden en er komen er bij.
 * Daarom een eigen woordenlijst onder `filters.values` met twee vangnetten:
 *
 * 1. samenstellingen worden per deel vertaald, zodat "blau / schwarz" met
 *    twee woorden in de lijst al goed komt;
 * 2. wat we niet kennen blijft staan zoals de leverancier het schrijft.
 *    Liever Duits dan een lege regel of een verkeerde gok.
 */

/** Vertaler met `has`, zoals next-intl die geeft */
export interface Translator {
  (key: string): string;
  has(key: string): boolean;
}

/** "anthrazit matt" → "anthrazit-matt", "grün" → "gr-n" */
function valueKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function translateWord(word: string, t: Translator): string {
  const key = `values.${valueKey(word)}`;
  return t.has(key) ? t(key) : word;
}

function translateSegment(segment: string, t: Translator): string {
  const whole = `values.${valueKey(segment)}`;
  if (t.has(whole)) return t(whole);

  const words = segment.split(/\s+/);
  if (words.length < 2) return segment;
  const translated = words.map((word) => translateWord(word, t));
  // Alleen gebruiken als er écht iets vertaald is; anders blijft het origineel
  // netter dan een half omgezette zin.
  return translated.some((word, index) => word !== words[index])
    ? translated.join(" ")
    : segment;
}

export function filterValueLabel(value: string, t: Translator): string {
  // Scheidingstekens behouden: "blau / schwarz" blijft twee kleuren.
  return value
    .split(/\s*([/,])\s*/)
    .map((part) => (part === "/" || part === "," ? ` ${part} ` : translateSegment(part, t)))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
