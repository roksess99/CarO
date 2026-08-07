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
    // Categorie- en productslugs komen uit de catalogus en zijn al
    // Nederlands (SEO-regel: /nl/remmen/remblokken, geen id's in de URL)
    "/[category]": "/[category]",
    "/[category]/[part]": "/[category]/[part]",
  },
});

export type Locale = (typeof routing.locales)[number];
