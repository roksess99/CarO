import { getTranslations } from "next-intl/server";
import { categoryLabel } from "./category-labels";
import type { Category } from "./types";

/**
 * Categorienamen in de taal van de shop.
 *
 * Bewust hier, vlak achter de provider: dan hoeft geen enkel component te
 * weten dat de leverancier zijn eigen taal spreekt, en zijn de namen overal
 * gelijk — navigatie, kruimelpad, tegels en koppen.
 */
export async function localizeCategories(
  categories: ReadonlyArray<Category>,
): Promise<Category[]> {
  const t = await getTranslations("categories");
  return categories.map((category) => ({
    ...category,
    name: categoryLabel(category, t),
  }));
}
