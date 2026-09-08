import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // Arabisch staat erbij voor de grote Arabischtalige gemeenschap in
  // Nederland. De shop levert alleen in NL, dus prijzen en adressen blijven
  // Nederlands genoteerd — zie src/lib/format.ts.
  locales: ["nl", "en", "ar"],
  defaultLocale: "nl",
  // Nederlandse slugs op /nl (SEO-regel), Engelse op /en. Arabisch krijgt de
  // Engelse slugs: Arabisch schrift in een URL wordt percent-encoded en
  // levert onleesbare, moeilijk deelbare links op.
  pathnames: {
    "/": "/",
    "/cart": {
      nl: "/winkelwagen",
      en: "/cart",
      ar: "/cart",
    },
    "/checkout": {
      nl: "/afrekenen",
      en: "/checkout",
      ar: "/checkout",
    },
    "/search": {
      nl: "/zoeken",
      en: "/search",
      ar: "/search",
    },
    // Producten die bij de gekozen auto horen. Merk, model en bouwjaar staan
    // in de querystring — dat mag: het zijn geen persoonsgegevens. Een
    // kenteken hoort daar níet in (docs/api/OVERHEID-IO.md).
    "/my-car": {
      nl: "/mijn-auto",
      en: "/my-car",
      ar: "/my-car",
    },
    "/faq": {
      nl: "/veelgestelde-vragen",
      en: "/faq",
      ar: "/faq",
    },
    "/privacy": {
      nl: "/privacy-en-cookies",
      en: "/privacy-and-cookies",
      ar: "/privacy-and-cookies",
    },
    "/terms": {
      nl: "/algemene-voorwaarden",
      en: "/terms-and-conditions",
      ar: "/terms-and-conditions",
    },
    // Drie niveaus: familie / categorie / product. De familieslug is
    // taalafhankelijk (onderdelen|banden vs parts|tyres, zie families.ts);
    // categorie- en productslugs komen uit de catalogus en zijn al
    // Nederlands (SEO-regel: /nl/banden/auto-suv-1, geen id's in de URL).
    "/[family]": "/[family]",
    "/[family]/[category]": "/[family]/[category]",
    "/[family]/[category]/[part]": "/[family]/[category]/[part]",
  },
});

export type Locale = (typeof routing.locales)[number];

/** Talen die van rechts naar links lezen */
const RTL_LOCALES: ReadonlyArray<string> = ["ar"];

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.includes(locale);
}

/** Waarde voor het `dir`-attribuut op <html> */
export function textDirection(locale: string): "rtl" | "ltr" {
  return isRtl(locale) ? "rtl" : "ltr";
}
