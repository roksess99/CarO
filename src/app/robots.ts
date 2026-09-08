import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { FILTER_PARAM } from "@/lib/catalog/filter-params";
import { SITE_URL } from "@/lib/site";

/**
 * robots.txt.
 *
 * De proxy in `src/proxy.ts` laat alles met een punt in het pad met rust, dus
 * dit bestand komt zonder taalprefix binnen — precies zoals een crawler het
 * verwacht op `/robots.txt`.
 */
export default function robots(): MetadataRoute.Robots {
  // Winkelwagen en afrekenen zijn per bezoeker en hebben in een index niets
  // te zoeken. Per taal, want de paden zijn vertaald (/nl/winkelwagen).
  const privatePaths = routing.locales.flatMap((locale) => [
    getPathname({ locale, href: "/cart" }),
    getPathname({ locale, href: "/checkout" }),
  ]);

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          ...privatePaths,
          // Zoekresultaten: eindeloos veel varianten van dezelfde artikelen.
          "/*?*oen=",
          "/*?*q=",
          // Elke auto geeft zijn eigen versie van dezelfde categoriepagina.
          // Zonder auto toont die pagina toch alleen een uitnodiging, dus er
          // gaat geen inhoud verloren.
          "/*?*auto=",
          // "Meer laden" en filters maken varianten van een pagina die al in
          // de index staat.
          "/*?*toon=",
          `/*?*${FILTER_PARAM}=`,
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
