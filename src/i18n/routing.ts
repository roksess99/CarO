import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["nl", "en"],
  defaultLocale: "nl",
  // Nederlandse slugs op /nl (SEO-regel), Engelse op /en.
  pathnames: {
    "/": "/",
    "/cart": {
      nl: "/winkelwagen",
      en: "/cart",
    },
    "/checkout": {
      nl: "/afrekenen",
      en: "/checkout",
    },
    "/search": {
      nl: "/zoeken",
      en: "/search",
    },
    // Producten die bij de gekozen auto horen. Merk, model en bouwjaar staan
    // in de querystring — dat mag: het zijn geen persoonsgegevens. Een
    // kenteken hoort daar níet in (docs/api/OVERHEID-IO.md).
    "/my-car": {
      nl: "/mijn-auto",
      en: "/my-car",
    },
    "/faq": {
      nl: "/veelgestelde-vragen",
      en: "/faq",
    },
    "/contact": {
      nl: "/contact",
      en: "/contact",
    },
    "/privacy": {
      nl: "/privacy-en-cookies",
      en: "/privacy-and-cookies",
    },
    "/terms": {
      nl: "/algemene-voorwaarden",
      en: "/terms-and-conditions",
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

