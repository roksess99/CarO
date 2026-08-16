import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CATEGORY_TILES } from "@/lib/catalog/category-tiles";
import { familySlug } from "@/lib/catalog/families";

/**
 * Catalogusblok: de meestgezochte categorieën als beeldtegels.
 *
 * Beeldvullend en niet als uitgeknipt product op wit, omdat de foto's
 * verschillende verhoudingen en achtergronden hebben — de een op wit, de
 * ander in een donkere werkplaats. Beeldvullend bijsnijden maakt daar één
 * consistent raster van, en werkt in beide thema's.
 */
export async function CategoryGrid() {
  const t = await getTranslations("categoryTiles");
  const locale = await getLocale();

  return (
    <section className="site-container py-12 md:py-16">
      <h2 className="text-center text-2xl md:text-3xl">{t("title")}</h2>

      <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORY_TILES.map((tile) => {
          const slug = familySlug(tile.family, locale);
          const href = tile.category
            ? ({
                pathname: "/[family]/[category]",
                params: { family: slug, category: tile.category },
              } as const)
            : ({ pathname: "/[family]", params: { family: slug } } as const);

          return (
            <li key={tile.key}>
              <Link
                href={href}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-background transition-colors hover:border-caro-orange"
              >
                <div className="relative aspect-square overflow-hidden bg-surface">
                  <Image
                    src={tile.image}
                    alt=""
                    fill
                    // Twee kolommen op mobiel, zes op desktop: zo haalt de
                    // browser nooit een grotere variant dan nodig
                    sizes="(min-width: 1024px) 12rem, (min-width: 640px) 30vw, 45vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                </div>

                <div className="flex flex-1 flex-col items-center gap-2 px-2 py-3 text-center">
                  {/* Oranje stip als scheiding: oranje mag als vlak, niet als
                      tekst op een lichte achtergrond (BRAND.md) */}
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-caro-orange"
                  />
                  <span className="text-sm font-semibold">{t(tile.key)}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
