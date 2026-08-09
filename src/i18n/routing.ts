import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["nl", "en"],
  defaultLocale: "nl",
  // Nederlandse slugs op /nl (SEO-regel), Engelse op /en
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
