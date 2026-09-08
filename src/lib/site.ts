import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Basis-URL van de shop. Eén plek, want hij zit in élke canonical- en
 * hreflang-tag: staat hier localhost, dan verwijst de hele site zoekmachines
 * naar een adres dat alleen op een ontwikkelmachine bestaat.
 *
 * Zet `NEXT_PUBLIC_SITE_URL` zodra het eigen domein er is (docs/DECISIONS.md #2).
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://caro-two-swart.vercel.app";

/**
 * `metadataBase` + canonical + hreflang voor één pagina.
 *
 * `pathFor` geeft het pad per taal terug. Dat moet een functie zijn en geen
 * vast pad, omdat onze routes vertaalde slugs hebben: `/nl/winkelwagen` is in
 * het Engels `/en/cart`, niet `/en/winkelwagen`.
 *
 * De talen komen uit `routing.locales`, zodat een nieuwe taal niet in zeven
 * bestanden vergeten kan worden. `x-default` wijst naar het Nederlands: dat is
 * de standaardtaal van de routing en onze markt.
 */
export function localizedMetadata(
  locale: string,
  pathFor: (locale: Locale) => string,
): Pick<Metadata, "metadataBase" | "alternates"> {
  const languages: Record<string, string> = {};
  for (const other of routing.locales) {
    languages[other] = pathFor(other);
  }
  languages["x-default"] = pathFor(routing.defaultLocale);

  return {
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: pathFor(locale as Locale), languages },
  };
}

/**
 * `og:locale` wil een taal-én-landcode, niet onze kale taalcode. Nederland is
 * onze markt, dus `en` en `ar` krijgen bewust géén NL-land: die pagina's zijn
 * vertalingen voor bezoekers hier, niet aparte landversies.
 */
const OG_LOCALE: Record<Locale, string> = {
  nl: "nl_NL",
  en: "en_US",
  ar: "ar_AR",
};

/**
 * Open Graph + Twitter card voor één pagina.
 *
 * Zonder deze tags toont WhatsApp of Facebook alleen de kale URL. Het pad is
 * relatief: Next maakt het absoluut met de `metadataBase` uit
 * {@link localizedMetadata}, dus beide horen altijd samen op een route.
 *
 * Geef `image` alleen mee als er een échte productfoto is. Laat je hem weg,
 * dan valt Next terug op `app/[locale]/opengraph-image.tsx` — de merkkaart.
 */
export function socialMetadata({
  locale,
  title,
  description,
  path,
  image,
}: {
  locale: string;
  title: string;
  description: string;
  path: string;
  image?: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  // Geen productfoto? Dan de merkkaart uit app/[locale]/opengraph-image.tsx.
  // Die wordt bewust expliciet gezet: Next koppelt zo'n bestand alleen aan de
  // routesegmenten waar het zelf staat, dus de familie-, categorie- en
  // productpagina's kregen anders helemaal geen `og:image` mee.
  const images = image
    ? [{ url: image, alt: title }]
    : [
        {
          url: `/${locale}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: "CarO — onderdelen, banden, velgen en toebehoren",
        },
      ];

  return {
    openGraph: {
      type: "website",
      siteName: "CarO",
      title,
      description,
      url: path,
      locale: OG_LOCALE[locale as Locale] ?? OG_LOCALE.nl,
      alternateLocale: routing.locales
        .filter((other) => other !== locale)
        .map((other) => OG_LOCALE[other]),
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

/**
 * `BreadcrumbList` voor Google's kruimelpad in de zoekresultaten.
 *
 * Zonder dit toont Google de kale URL onder de titel; mét dit staat er
 * "CarO › Banden › Auto/SUV". De paden zijn dezelfde die de zichtbare
 * `<nav>` gebruikt — één bron, zodat de twee niet uit elkaar lopen.
 */
export function breadcrumbJsonLd(
  items: ReadonlyArray<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
