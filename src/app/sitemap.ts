import type { MetadataRoute } from "next";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import {
  familySlug,
  PRODUCT_FAMILIES,
  usesVehicleCatalog,
} from "@/lib/catalog/families";
import {
  POPULAR_TYRE_SIZES,
  tyreSizeQuery,
} from "@/lib/catalog/popular-tyre-sizes";
import { getCatalogProvider } from "@/lib/catalog/provider";
import { SEASON_LANDINGS } from "@/lib/catalog/tyre-size";
import { GUIDES, guideSlug } from "@/lib/guides";
import { SITE_URL } from "@/lib/site";

/**
 * sitemap.xml.
 *
 * Bewust zónder productpagina's. De catalogus telt honderdduizenden artikelen
 * die dagelijks wisselen; die in een sitemap zetten levert een bestand op dat
 * vaker fout dan goed is. Zoekmachines vinden ze via de categoriepagina's.
 *
 * Onderdelen hebben om dezelfde reden geen categorieën in deze lijst: die
 * boom hangt aan een gekozen auto (docs/api/WEARPARTS.md), dus elke categorie
 * bestaat in tienduizenden varianten. `robots.ts` sluit die querystring uit.
 */

/** Eens per dag opnieuw: categorieën komen en gaan bij de groothandel. */
export const revalidate = 86400;

/**
 * Eén regel per pagina, met een `hreflang` naar dezelfde pagina in de andere
 * talen. Google leest die alternates uit de sitemap net zo goed als uit de
 * `<head>`, en hier staan ze op één plek in plaats van in elke route.
 */
function entry(
  pathFor: (locale: Locale) => string,
  options: Pick<
    MetadataRoute.Sitemap[number],
    "changeFrequency" | "priority"
  > = {},
): MetadataRoute.Sitemap {
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((locale) => [locale, `${SITE_URL}${pathFor(locale)}`]),
  );
  // Zelfde afspraak als in `localizedMetadata`: wie geen van onze talen
  // spreekt krijgt het Nederlands.
  languages["x-default"] = `${SITE_URL}${pathFor(routing.defaultLocale)}`;

  return routing.locales.map((locale) => ({
    url: `${SITE_URL}${pathFor(locale)}`,
    alternates: { languages },
    ...options,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const provider = getCatalogProvider();

  // Alleen de families die zonder auto te doorbladeren zijn hebben
  // categoriepagina's die op zichzelf staan.
  const browsable = PRODUCT_FAMILIES.filter(
    (family) => !usesVehicleCatalog(family),
  );
  const categoriesPerFamily = await Promise.all(
    browsable.map(async (family) => ({
      family,
      categories: await provider.getCategories(family),
    })),
  );

  return [
    // `/` stuurt door naar `/nl`; een sitemap hoort de eindbestemming te
    // noemen, geen omleiding.
    ...entry((locale) => `/${locale}`, {
      changeFrequency: "daily",
      priority: 1,
    }),

    ...PRODUCT_FAMILIES.flatMap((family) =>
      entry(
        (locale) =>
          getPathname({
            locale,
            href: {
              pathname: "/[family]",
              params: { family: familySlug(family, locale) },
            },
          }),
        { changeFrequency: "daily", priority: 0.9 },
      ),
    ),

    // De gangbare bandenmaten als eigen pagina (lib/catalog/popular-tyre-
    // sizes.ts). Met de maat in de querystring, want zo staat ook de
    // canonical op die pagina; een sitemap die iets anders noemt dan de
    // canonical spreekt zichzelf tegen.
    //
    // De `&` gaat er als `&amp;` in, met de hand: Next zet de URL zonder
    // escapen in de XML (GEMETEN 2026-11-23 op een productiebuild), en een
    // kale `&` maakt de héle sitemap ongeldig, niet alleen deze regel.
    ...POPULAR_TYRE_SIZES.flatMap((size) =>
      entry(
        (locale) =>
          `${getPathname({
            locale,
            href: {
              pathname: "/[family]",
              params: { family: familySlug("banden", locale) },
            },
          })}?${new URLSearchParams(tyreSizeQuery(size))
            .toString()
            .replaceAll("&", "&amp;")}`,
        { changeFrequency: "daily", priority: 0.7 },
      ),
    ),

    // De seizoenspagina's (`?seizoen=winter`), om dezelfde reden: zo staat
    // hun canonical. Eén parameter, dus geen `&` om te escapen.
    ...SEASON_LANDINGS.flatMap((season) =>
      entry(
        (locale) =>
          `${getPathname({
            locale,
            href: {
              pathname: "/[family]",
              params: { family: familySlug("banden", locale) },
            },
          })}?seizoen=${season}`,
        { changeFrequency: "daily", priority: 0.8 },
      ),
    ),

    ...categoriesPerFamily.flatMap(({ family, categories }) =>
      categories.flatMap((category) =>
        entry(
          (locale) =>
            getPathname({
              locale,
              href: {
                pathname: "/[family]/[category]",
                params: {
                  family: familySlug(family, locale),
                  category: category.slug,
                },
              },
            }),
          { changeFrequency: "daily", priority: 0.8 },
        ),
      ),
    ),

    // De autokiezer is een ingang, geen resultaatpagina: zonder auto in de
    // querystring staat er gewoon het formulier.
    ...entry((locale) => getPathname({ locale, href: "/my-car" }), {
      changeFrequency: "monthly",
      priority: 0.5,
    }),

    // Wat er in de aanbieding staat wisselt; daarom dagelijks, en met een
    // hogere prioriteit dan de statische pagina's.
    ...entry((locale) => getPathname({ locale, href: "/offers" }), {
      changeFrequency: "daily",
      priority: 0.7,
    }),

    // Beoordelingen zijn juist wat een zoekende klant wil lezen, en er komen
    // er regelmatig bij. Het formulier (`/beoordelingen/<token>`) staat er
    // bewust níet in: dat is een persoonlijke link.
    ...entry((locale) => getPathname({ locale, href: "/reviews" }), {
      changeFrequency: "weekly",
      priority: 0.6,
    }),

    ...entry((locale) => getPathname({ locale, href: "/faq" }), {
      changeFrequency: "monthly",
      priority: 0.6,
    }),

    // Wie de winkel is, en de gidsen per zoekvraag (#37). Die laatste zijn
    // ingangen voor wie nog niet weet welke maat of olie hij zoekt.
    ...entry((locale) => getPathname({ locale, href: "/about" }), {
      changeFrequency: "yearly",
      priority: 0.5,
    }),
    ...entry((locale) => getPathname({ locale, href: "/guides" }), {
      changeFrequency: "monthly",
      priority: 0.5,
    }),
    ...GUIDES.flatMap((guide) =>
      entry(
        (locale) =>
          getPathname({
            locale,
            href: {
              pathname: "/guides/[guide]",
              params: { guide: guideSlug(guide, locale) },
            },
          }),
        { changeFrequency: "monthly", priority: 0.6 },
      ),
    ),
    // Hoe je iets terugstuurt is een vraag die mensen googelen vóórdat ze
    // bestellen; die pagina hoort dus vindbaar te zijn. De varianten met een
    // ordernummer erin sluit robots.ts uit.
    ...entry((locale) => getPathname({ locale, href: "/returns" }), {
      changeFrequency: "yearly",
      priority: 0.5,
    }),
    ...entry((locale) => getPathname({ locale, href: "/contact" }), {
      changeFrequency: "yearly",
      priority: 0.5,
    }),

    ...entry((locale) => getPathname({ locale, href: "/terms" }), {
      changeFrequency: "yearly",
      priority: 0.3,
    }),
    ...entry((locale) => getPathname({ locale, href: "/privacy" }), {
      changeFrequency: "yearly",
      priority: 0.3,
    }),
  ];
}
