import { getLocale, getTranslations } from "next-intl/server";
import { CategoryTiles } from "@/components/home/category-tiles";
import { FAMILY_TILE_IMAGES } from "@/lib/catalog/category-tiles";
import { familySlug, PRODUCT_FAMILIES } from "@/lib/catalog/families";

/**
 * Catalogusblok: een beeldtegel per familie, rechtstreeks naar die familie.
 *
 * Haalt sinds 2026-09-17 geen categorieën meer op. De tegels klappen niet
 * meer uit (zie category-tiles.tsx), en daarmee vervalt de reden om bij het
 * renderen van de homepage vier categorielijsten bij de leverancier op te
 * vragen — de drukste pagina van de winkel werd daar alleen maar trager van.
 */
export async function CategoryGrid() {
  const t = await getTranslations("categoryTiles");
  const tFamily = await getTranslations("family");
  const locale = await getLocale();

  const tiles = PRODUCT_FAMILIES.map((family) => ({
    family,
    slug: familySlug(family, locale),
    label: tFamily(`${family}.title`),
    image: FAMILY_TILE_IMAGES[family],
  }));

  return (
    <section className="site-container py-12 md:py-16">
      <h2 className="text-center text-2xl md:text-3xl">{t("title")}</h2>
      <div className="mt-8">
        <CategoryTiles tiles={tiles} />
      </div>
    </section>
  );
}
