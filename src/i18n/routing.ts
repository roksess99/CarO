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
    // Waar de klant landt als hij terugkomt van het betaalscherm. Draagt het
    // ordernummer en een toegangsteken in de querystring; staat op noindex.
    "/checkout/status": {
      nl: "/afrekenen/status",
      en: "/checkout/status",
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
    // Artikelen die nu in de korting zijn. Eén pagina, geen filters: het zijn
    // er hooguit een paar tientallen zolang de eigenaar de acties zelf aanzet.
    "/offers": {
      nl: "/aanbiedingen",
      en: "/offers",
    },
    // De beoordelingen van klanten, en het formulier waarmee ze binnenkomen.
    // Het token in de URL is de sleutel: er is geen account om mee in te
    // loggen, dus die link is het enige bewijs dat deze beoordeling bij een
    // echte, betaalde bestelling hoort.
    "/reviews": {
      nl: "/beoordelingen",
      en: "/reviews",
    },
    "/reviews/[token]": {
      nl: "/beoordelingen/[token]",
      en: "/reviews/[token]",
    },
    // Een retour aanmelden. De link uit de bevestigingsmail draagt het
    // ordernummer en het toegangsteken mee; zonder die link vraagt de pagina
    // om ordernummer én mailadres, want een kenmerk alleen is te raden
    // (docs/DECISIONS.md #20).
    "/returns": {
      nl: "/retour",
      en: "/returns",
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
    // Wie de winkel is en hoe hij werkt (docs/DECISIONS.md #37).
    "/about": {
      nl: "/over-caroparts",
      en: "/about",
    },
    // Uitleg per zoekvraag. De slug per gids staat in lib/guides.ts en is
    // per taal anders, net als de familieslugs.
    "/guides": {
      nl: "/gids",
      en: "/guides",
    },
    "/guides/[guide]": {
      nl: "/gids/[guide]",
      en: "/guides/[guide]",
    },
    // Drie niveaus: familie / categorie / product. De familieslug is
    // taalafhankelijk (onderdelen|banden vs parts|tyres, zie families.ts);
    // categorie- en productslugs komen uit de catalogus en zijn al
    // Nederlands (SEO-regel: /nl/banden/auto-suv-1, geen id's in de URL).
    "/[family]": "/[family]",
    "/[family]/[category]": "/[family]/[category]",
    "/[family]/[category]/[part]": "/[family]/[category]/[part]",
  },
  // Geen hreflang in de HTTP-header. De `<link rel="alternate">`-tags in de
  // HTML (lib/site.ts → localizedMetadata) zijn de enige bron. Met beide aan
  // spraken ze elkaar tegen: de header zette x-default op `/`, de HTML op
  // `/nl` (GEMETEN 2026-11-23 op caroparts.nl). De header kende bovendien
  // alleen vaste paden en geen productslugs.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];

