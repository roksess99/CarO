import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { GroupList } from "@/components/catalog/group-list";
import { ProductGrid } from "@/components/product-grid";
import { SelectedCarInUrl } from "@/components/vehicle/use-selected-car";
import { Link } from "@/i18n/navigation";
import type { ProductFamily } from "@/lib/catalog/families";
import {
  groupIdFromSlug,
  partGroupById,
  partGroups,
  partsInGroup,
} from "@/lib/catalog/wearparts-provider";

/** Artikelen per stap; "meer laden" telt hier telkens bij op */
const PAGE_SIZE = 20;

/**
 * Categoriepagina voor onderdelen.
 *
 * Apart van de gewone categoriepagina omdat de Wearparts-API anders werkt:
 * de categorieboom hangt aan een TecDoc-voertuig, dus zonder `auto` in de
 * URL valt er niets te tonen. De boom is bovendien dieper dan bij banden —
 * "Remsysteem" heeft subgroepen als "Remschijf" en "Remblokken".
 */
export async function PartsCategoryPage({
  family,
  familySlugParam,
  categorySlug,
  carId,
  limit,
}: {
  family: ProductFamily;
  familySlugParam: string;
  categorySlug: string;
  carId: number | null;
  limit: number;
}) {
  const t = await getTranslations("category");
  const tFamily = await getTranslations("family");
  const tFilters = await getTranslations("filters");

  const groupId = groupIdFromSlug(categorySlug);
  if (groupId === null) notFound();

  if (!carId) {
    return (
      <div className="site-container py-8 md:py-12">
        <SelectedCarInUrl active />
        <h1 className="mt-6 text-3xl md:text-4xl">
          {tFamily("onderdelen.title")}
        </h1>
        <p className="mt-8 max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
          {tFamily("chooseCarToBrowse")}
        </p>
        <Link
          href={{ pathname: "/[family]", params: { family: familySlugParam } }}
          className="mt-6 inline-flex rounded-md bg-caro-orange px-5 py-2.5 font-semibold text-caro-ink"
        >
          {tFamily("viewAll")}
        </Link>
      </div>
    );
  }

  // Hoofdgroepen voor de naam en het kruimelpad, subgroepen voor de
  // navigatie eronder. Twee calls, allebei een dag gecacht.
  // De groep zelf kan op elk niveau zitten ("Remsysteem" of "Remblok"), dus
  // zoeken we hem op in de hele boom in plaats van alleen bij de hoofdgroepen.
  const [current, children] = await Promise.all([
    partGroupById(carId, groupId),
    partGroups(carId, groupId),
  ]);
  if (!current) notFound();
  const name = current.name;

  // GEMETEN 2026-09-06: /articles geeft HTTP 500 op een groep die zelf nog
  // subgroepen heeft ("Remsysteem"). Artikelen hangen aan de eindgroepen
  // ("Remschijf"), dus vragen we ze alleen daar op.
  const { parts, total } =
    children.length === 0
      ? await partsInGroup({
          carId,
          categoryId: groupId,
          categorySlug,
          categoryName: name,
          limit,
        })
      : { parts: [], total: 0 };

  const query = { auto: String(carId) };

  return (
    <div className="site-container py-8 md:py-12">
      <nav aria-label={t("breadcrumbAria")}>
        <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <li>
            <Link href="/" className="hover:text-foreground">
              {t("breadcrumbHome")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={{
                pathname: "/[family]",
                params: { family: familySlugParam },
                query,
              }}
              className="hover:text-foreground"
            >
              {tFamily(`${family}.title`)}
            </Link>
          </li>
        </ol>
      </nav>

      <h1 className="mt-6 text-3xl md:text-4xl">{name}</h1>

      {children.length > 0 && (
        <nav aria-label={t("siblingsAria")} className="mt-6">
          <GroupList
            groups={children}
            familySlugParam={familySlugParam}
            carId={carId}
          />
        </nav>
      )}

      {children.length === 0 && (
        <>
          <p className="mt-8 text-sm text-muted">
            {tFilters("resultCount", { count: parts.length })}
          </p>
          <div className="mt-4">
            <ProductGrid parts={parts} />
          </div>
        </>
      )}

      {parts.length < total && (
        <div className="mt-8 flex justify-center">
          <Link
            href={{
              pathname: "/[family]/[category]",
              params: { family: familySlugParam, category: categorySlug },
              query: { ...query, toon: String(limit + PAGE_SIZE) },
            }}
            className="rounded-md border border-border px-6 py-3 font-semibold hover:border-caro-orange hover:bg-surface"
          >
            {tFilters("loadMore", { count: PAGE_SIZE })}
          </Link>
        </div>
      )}
    </div>
  );
}
