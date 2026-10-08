import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { BrandFacet } from "@/lib/catalog/brand-facets";

/** Zoveel merken als tegel; de rest staat eronder achter "meer merken" */
const TILES = 12;

/**
 * Merkfilter bij een zoekopdracht op bandenmaat.
 *
 * **Waarom dit naast `BrandTiles` bestaat en niet erin.** Die rij komt uit de
 * filterrespons van de leverancier, en die hoort bij een categorie. Zoekt de
 * klant op maat, dan komt de lijst uit een zoekopdracht en vervallen die
 * filters — tot nu toe stond er dan niets, en 200 banden in één maat zijn
 * niet door te scrollen.
 *
 * Hier worden de merken dus geteld over de treffers zelf
 * (`lib/catalog/brand-facets.ts`). Dat geeft **echte aantallen** achter de
 * naam, want het `count`-veld van de leverancier is bij elk merk 1.
 *
 * Server-gerenderde links, net als de rest van de filters: elke combinatie
 * heeft een eigen URL en werkt zonder JavaScript. De maat blijft in de query
 * staan, anders valt de zoekopdracht eronder weg.
 */
export async function TyreBrandFilter({
  facets,
  active,
  family,
  category,
  query,
}: {
  facets: BrandFacet[];
  /** Het gekozen merk uit de URL, of null */
  active: string | null;
  family: string;
  category: string;
  /** Maat en seizoen; die moeten in elke link mee */
  query: Record<string, string>;
}) {
  const t = await getTranslations("filters");
  // Eén merk is geen keuze: dan filtert de knop niets weg.
  if (facets.length < 2) return null;

  const hrefFor = (brand: string | null) => ({
    pathname: "/[family]/[category]" as const,
    params: { family, category },
    query: brand ? { ...query, merk: brand } : query,
  });

  const tile = (
    label: string,
    href: ReturnType<typeof hrefFor>,
    isActive: boolean,
    count?: number,
  ) => (
    <li key={label}>
      <Link
        href={href}
        aria-current={isActive ? "true" : undefined}
        // Geen scroll naar boven: de klant staat bij de merken en wil de
        // producten eronder zien veranderen, niet opnieuw de maatkiezer.
        scroll={false}
        className={`flex min-h-14 flex-col items-center justify-center overflow-hidden rounded-lg border px-2 py-2 text-center text-sm font-bold break-words hyphens-auto ${
          isActive
            ? "border-caro-orange bg-surface"
            : "border-border hover:border-caro-orange hover:bg-surface"
        }`}
      >
        <span className="line-clamp-2">{label}</span>
        {count !== undefined && (
          <span className="text-xs font-normal text-muted tabular-nums">
            {count}
          </span>
        )}
      </Link>
    </li>
  );

  const shown = facets.slice(0, TILES);
  const rest = facets.slice(TILES);

  return (
    <section className="mb-8">
      <h2 className="text-center text-sm font-semibold">
        {t("labels.manufacturer")}
      </h2>

      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {tile(t("allBrands"), hrefFor(null), active === null)}
        {shown.map((facet) =>
          tile(
            facet.label,
            hrefFor(facet.label),
            active?.toUpperCase() === facet.label.toUpperCase(),
            facet.count,
          ),
        )}
      </ul>

      {/* De rest blijft bereikbaar in plaats van alleen geteld te worden: een
          merk dat je noemt maar niet kunt aanklikken is erger dan geen merk. */}
      {rest.length > 0 && (
        <details className="mt-2">
          <summary className="mx-auto inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-muted hover:text-foreground">
            {t("moreBrandsToggle", { count: rest.length })}
          </summary>
          <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {rest.map((facet) =>
              tile(
                facet.label,
                hrefFor(facet.label),
                active?.toUpperCase() === facet.label.toUpperCase(),
                facet.count,
              ),
            )}
          </ul>
        </details>
      )}
    </section>
  );
}
