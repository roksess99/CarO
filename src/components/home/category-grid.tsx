import { getLocale, getTranslations } from "next-intl/server";
import { CategoryTiles } from "@/components/home/category-tiles";
import type { FamilyNavItem } from "@/components/family-nav";
import { FAMILY_TILE_IMAGES } from "@/lib/catalog/category-tiles";
import { familySlug, PRODUCT_FAMILIES } from "@/lib/catalog/families";
import { getCatalogProvider } from "@/lib/catalog/provider";

/**
 * Catalogusblok: een beeldtegel per familie die uitklapt naar de
 * categorieën eronder.
 *
 * Uitklappen in plaats van doorlinken: de klant ziet zo in één klik wat er
 * ín een groep zit, zonder de homepage te verlaten en terug te moeten.
 */
export async function CategoryGrid() {
  const t = await getTranslations("categoryTiles");
  const tFamily = await getTranslations("family");
  const locale = await getLocale();

  const provider = getCatalogProvider();
  const items: FamilyNavItem[] = await Promise.all(
    PRODUCT_FAMILIES.map(async (family) => ({
      family,
      categories: await provider.getCategories(family),
    })),
  );

  const tiles = items.map(({ family, categories }) => ({
    family,
    slug: familySlug(family, locale),
    label: tFamily(`${family}.title`),
    image: FAMILY_TILE_IMAGES[family],
    categories: categories.map((category) => ({
      slug: category.slug,
      name: category.name,
    })),
  }));

  return (
    <section className="site-container py-12 md:py-16">
      <h2 className="text-center text-2xl md:text-3xl">{t("title")}</h2>
      <div className="mt-8">
        <CategoryTiles
          tiles={tiles}
          viewAllLabel={tFamily("viewAll")}
          closeLabel={t("close")}
        />
      </div>
    </section>
  );
}
