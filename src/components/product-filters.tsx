import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  countActiveFilters,
  FILTER_PARAM,
  isFilterActive,
  toFilterParam,
  toggleFilter,
} from "@/lib/catalog/filter-params";
import type { FilterGroup, SelectedFilters } from "@/lib/catalog/types";

/** Groepen met veel opties (merk!) krijgen een scrollbaar vak */
const SCROLL_AFTER_OPTIONS = 10;

/**
 * Sleutel van de merkgroep. Komt uit de Tyre24-filterrespons en is
 * taalonafhankelijk, in tegenstelling tot het label ("Merk" / "Marke").
 */
const BRAND_GROUP_KEY = "merk";

/**
 * Aantal merken als tegel. De rest blijft bereikbaar via de gewone
 * filterlijst eronder — 193 tegels zou het raster onbruikbaar maken.
 */
const BRAND_TILES = 12;

/**
 * Welke merken vooraan als tegel komen.
 *
 * Sorteren op populariteit kan niet: het `count`-veld van Tyre24 staat bij
 * álle 193 merken op 1 (gemeten 2026-08-16), dus het is een
 * beschikbaarheidsvlag en geen artikelaantal. Zonder deze lijst zouden de
 * tegels alfabetisch vollopen met ALTENZO en APLUS terwijl Continental en
 * Michelin buiten beeld vallen.
 *
 * Merken die de leverancier niet heeft, slaan we stil over; de lijst wordt
 * aangevuld met wat er verder in de filterrespons zit.
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

type Props = {
  groups: FilterGroup[];
  selected: SelectedFilters;
  /** Route-params van de categoriepagina waar de links naartoe wijzen */
  family: string;
  category: string;
};

/**
 * Filterpaneel. Bewust server-gerenderde links in plaats van checkboxes met
 * JavaScript: filteren werkt zo zonder JS, elke combinatie heeft een eigen
 * URL en is deelbaar, en de resultaten komen server-side uit de API.
 */
export async function ProductFilters({
  groups,
  selected,
  family,
  category,
}: Props) {
  const t = await getTranslations("filters");
  if (groups.length === 0) return null;

  const activeCount = countActiveFilters(selected);
  // Merken worden meest gebruikt; die halen we naar boven als tegelraster.
  // De groep blijft óók in de lijst staan, zodat merk 13 en verder bereikbaar
  // blijven en de pagina zonder JavaScript volledig bruikbaar is.
  const brandGroup = groups.find((group) => group.key === BRAND_GROUP_KEY);
  // Bekende merken eerst, daarna de rest zoals de API ze levert
  const rank = (label: string) => {
    const index = PROMINENT_BRANDS.indexOf(label.trim().toUpperCase());
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  const topBrands = brandGroup
    ? [...brandGroup.options]
        .sort((a, b) => rank(a.label) - rank(b.label))
        .slice(0, BRAND_TILES)
    : [];

  const hrefFor = (next: SelectedFilters) => ({
    pathname: "/[family]/[category]" as const,
    params: { family, category },
    query: { [FILTER_PARAM]: toFilterParam(next) },
  });

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg">{t("title")}</h2>
        {activeCount > 0 && (
          <Link
            href={hrefFor({})}
            className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
          >
            {t("clearAll")}
          </Link>
        )}
      </div>

      {activeCount > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {Object.entries(selected).flatMap(([key, values]) =>
            values.map((value) => {
              // De waarde in de URL is een taalonafhankelijk id ("5"); de
              // klant hoort het label te zien ("Winterbanden").
              const label =
                groups
                  .find((group) => group.key === key)
                  ?.options.find((option) => option.value === value)?.label ??
                value;
              return (
                <li key={`${key}:${value}`}>
                  <Link
                    href={hrefFor(toggleFilter(selected, key, value))}
                    className="inline-flex items-center gap-1 rounded-md border border-caro-orange px-2 py-1 text-xs font-medium text-foreground hover:bg-surface"
                    aria-label={t("removeFilter", { value: label })}
                  >
                    {label}
                    <span aria-hidden="true">×</span>
                  </Link>
                </li>
              );
            }),
          )}
        </ul>
      )}

      {/* Merk als tegelraster boven de gewone filters: dat is waar klanten
          op scannen, en 193 merknamen in een smalle lijst is onleesbaar.
          Geen logo's — Tyre24 levert die niet (gemeten 2026-08-16, de
          filterwaarden bevatten alleen naam en aantal). */}
      {brandGroup && (
        <section className="mt-4">
          <h3 className="text-sm font-semibold">{brandGroup.label}</h3>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {topBrands.map((option) => {
              const active = isFilterActive(selected, brandGroup.key, option.value);
              return (
                <li key={option.value}>
                  <Link
                    href={hrefFor(
                      toggleFilter(selected, brandGroup.key, option.value),
                    )}
                    aria-current={active ? "true" : undefined}
                    className={`flex min-h-14 flex-col items-center justify-center rounded-lg border px-2 py-2 text-center ${
                      active
                        ? "border-caro-orange bg-surface"
                        : "border-border hover:border-caro-orange hover:bg-surface"
                    }`}
                  >
                    {/* Geen aantal onder de naam: Tyre24 zet `count` bij elk
                        merk op 1, dus dat cijfer zou een artikelaantal
                        suggereren dat het niet is. */}
                    <span className="w-full truncate text-sm font-bold">
                      {option.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {brandGroup.options.length > BRAND_TILES && (
            <p className="mt-2 text-xs text-muted">
              {t("moreBrands", {
                count: brandGroup.options.length - BRAND_TILES,
              })}
            </p>
          )}
        </section>
      )}

      <div className="mt-4 space-y-3">
        {groups.map((group) => {
          const activeInGroup = selected[group.key]?.length ?? 0;
          return (
            // <details> geeft in- en uitklappen zonder JavaScript
            <details
              key={group.key}
              open={activeInGroup > 0}
              className="rounded-lg border border-border"
            >
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                {group.label}
                {activeInGroup > 0 && (
                  <span className="ml-2 rounded-full bg-caro-orange px-2 py-0.5 text-xs text-caro-ink tabular-nums">
                    {activeInGroup}
                  </span>
                )}
              </summary>
              <ul
                className={`space-y-1 px-4 pb-3 ${
                  group.options.length > SCROLL_AFTER_OPTIONS
                    ? "max-h-64 overflow-y-auto"
                    : ""
                }`}
              >
                {group.options.map((option) => {
                  const active = isFilterActive(selected, group.key, option.value);
                  return (
                    <li key={option.value}>
                      <Link
                        href={hrefFor(
                          toggleFilter(selected, group.key, option.value),
                        )}
                        aria-current={active ? "true" : undefined}
                        // min-h-11 op mobiel: py-1.5 gaf rijen van ~30px en
                        // die zijn met een duim niet betrouwbaar te raken
                        className={`flex min-h-11 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface sm:min-h-0 ${
                          active
                            ? "font-semibold text-foreground"
                            : "text-muted hover:text-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {/* Vinkje: actieve staat niet alleen met kleur tonen */}
                          <span
                            aria-hidden="true"
                            className={`flex size-4 shrink-0 items-center justify-center rounded border text-xs ${
                              active
                                ? "border-caro-orange bg-caro-orange text-caro-ink"
                                : "border-border"
                            }`}
                          >
                            {active ? "✓" : ""}
                          </span>
                          <span className="truncate">{option.label}</span>
                        </span>
                        {option.count !== undefined && (
                          <span className="shrink-0 text-xs text-muted tabular-nums">
                            {option.count}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}
