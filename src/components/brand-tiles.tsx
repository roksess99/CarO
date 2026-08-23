import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  FILTER_PARAM,
  isFilterActive,
  toFilterParam,
  toggleFilter,
} from "@/lib/catalog/filter-params";
import type { FilterGroup, SelectedFilters } from "@/lib/catalog/types";

/**
 * Sleutel van de merkgroep. Komt uit de Tyre24-filterrespons en is
 * taalonafhankelijk, in tegenstelling tot het label ("Merk" / "Marke").
 */
export const BRAND_GROUP_KEY = "merk";

/** Aantal merken als tegel; de rest blijft in de filterlijst bereikbaar */
const BRAND_TILES = 12;

/**
 * Welke merken vooraan komen.
 *
 * Sorteren op populariteit kan niet: het `count`-veld van Tyre24 staat bij
 * álle 193 merken op 1 (gemeten 2026-08-16), dus dat is een
 * beschikbaarheidsvlag en geen artikelaantal. Zonder deze lijst zouden de
 * tegels alfabetisch vollopen met ALTENZO en APLUS terwijl Continental en
 * Michelin buiten beeld vallen.
 *
 * Merken die de leverancier niet heeft, slaan we stil over.
 */
const PROMINENT_BRANDS = [
  // Banden
  "CONTINENTAL",
  "MICHELIN",
  "BRIDGESTONE",
  "GOODYEAR",
  "PIRELLI",
  "DUNLOP",
  "HANKOOK",
  "VREDESTEIN",
  "NOKIAN",
  "FALKEN",
  "TOYO",
  "YOKOHAMA",
  "UNIROYAL",
  "KUMHO",
  "SEMPERIT",
  "BARUM",
  // Auto's, voor families waar het merkfilter over voertuigen gaat
  "VOLKSWAGEN",
  "AUDI",
  "BMW",
  "MERCEDES-BENZ",
  "OPEL",
  "PEUGEOT",
  "RENAULT",
  "FORD",
  "TOYOTA",
  "CITROEN",
  "SKODA",
  "SEAT",
  // Onderdelen
  "BOSCH",
  "MANN-FILTER",
  "MAHLE",
  "FEBI BILSTEIN",
  "VALEO",
  "SACHS",
  "BREMBO",
  "TRW",
  "NGK",
  "DENSO",
];

/**
 * Merken als tegelraster, boven de producten en over de volle breedte.
 *
 * Bewust niet in de filterzijbalk: die is 256px breed, waardoor "Alfa Romeo"
 * en "Chevrolet" afgekapt worden tot "Alfa R…" en "CHEV…". Merk is bovendien
 * waar de meeste klanten op filteren, en dat hoort niet weggestopt te zitten.
 *
 * Server-gerenderde links, net als de rest van de filters: elke combinatie
 * heeft een eigen URL en werkt zonder JavaScript.
 */
export async function BrandTiles({
  groups,
  selected,
  family,
  category,
}: {
  groups: FilterGroup[];
  selected: SelectedFilters;
  family: string;
  category: string;
}) {
  const t = await getTranslations("filters");
  const group = groups.find((g) => g.key === BRAND_GROUP_KEY);
  if (!group || group.options.length === 0) return null;

  const rank = (label: string) => {
    const index = PROMINENT_BRANDS.indexOf(label.trim().toUpperCase());
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  const tiles = [...group.options]
    .sort((a, b) => rank(a.label) - rank(b.label))
    .slice(0, BRAND_TILES);

  const hrefFor = (next: SelectedFilters) => ({
    pathname: "/[family]/[category]" as const,
    params: { family, category },
    query: { [FILTER_PARAM]: toFilterParam(next) },
  });

  return (
    <section className="mb-8">
      <h2 className="text-center text-sm font-semibold">{group.label}</h2>

      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {tiles.map((option) => {
          const active = isFilterActive(selected, group.key, option.value);
          return (
            <li key={option.value}>
              <Link
                href={hrefFor(toggleFilter(selected, group.key, option.value))}
                aria-current={active ? "true" : undefined}
                // Geen aantal onder de naam: Tyre24 zet `count` bij elk merk
                // op 1, dus dat cijfer zou een artikelaantal suggereren.
                className={`flex min-h-14 items-center justify-center rounded-lg border px-2 py-2 text-center text-sm font-bold hyphens-auto ${
                  active
                    ? "border-caro-orange bg-surface"
                    : "border-border hover:border-caro-orange hover:bg-surface"
                }`}
              >
                {option.label}
              </Link>
            </li>
          );
        })}
      </ul>

      {group.options.length > BRAND_TILES && (
        <p className="mt-2 text-center text-xs text-muted">
          {t("moreBrands", { count: group.options.length - BRAND_TILES })}
        </p>
      )}
    </section>
  );
}
