import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { AvailabilityBadge } from "@/components/availability-badge";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ProductImagePlaceholder } from "@/components/product-image-placeholder";
import { Link } from "@/i18n/navigation";
import { familySlug } from "@/lib/catalog/families";
import type { Part } from "@/lib/catalog/types";
import { filterValueLabel } from "@/lib/catalog/filter-values";
import { formatPriceCents } from "@/lib/format";

/**
 * Productkaart, bewust kaal gehouden.
 *
 * Een klant scant een grid op beeld, naam en prijs — al het andere vertraagt
 * dat. Vandaar geen merkregel boven de titel (het merk staat al vooraan in
 * de naam die de leverancier levert) en twee knoppen zonder tekst: het
 * winkelwagentje spreekt voor zich en scheelt vertaalruimte.
 *
 * De voorraadbadge blijft wel staan. Die is één woord en bepaalt mede of
 * iemand op kopen klikt; hem weglaten zou de klant iets onthouden.
 */
export function ProductCard({ part }: { part: Part }) {
  const t = useTranslations("product");
  const tFilters = useTranslations("filters");
  const locale = useLocale();
  const href = {
    pathname: "/[family]/[category]/[part]",
    params: {
      family: familySlug(part.family, locale),
      category: part.categorySlug,
      part: part.slug,
    },
  } as const;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-background transition-colors hover:border-caro-orange">
      <Link href={href} tabIndex={-1} aria-hidden="true">
        {/* object-contain: een band is rond en mag niet bijgesneden worden.
            sizes volgt het grid (1 kolom mobiel → 4 op desktop), anders laadt
            Next voor elke kaart een afbeelding op volle breedte. */}
        {part.imageUrl ? (
          <Image
            src={part.imageUrl}
            alt=""
            width={400}
            height={400}
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="aspect-square w-full bg-surface object-contain transition-opacity group-hover:opacity-90"
          />
        ) : (
          <ProductImagePlaceholder
            label={t("noImage")}
            className="aspect-square opacity-60 transition-opacity group-hover:opacity-100"
          />
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3">
        {/* line-clamp: twee regels houdt elke kaart in het grid even hoog */}
        <h3 className="line-clamp-2 text-sm font-semibold">
          <Link href={href} className="hover:underline">
            {part.name}
          </Link>
        </h3>

        {/* De variant (bv. de bandenmaat) staat vóór het artikelnummer: in
            een categorie waar vijftig artikelen "Sneeuwketting" heten is dát
            het verschil waar de klant op scant. */}
        {part.variant && (
          <p className="mt-1 truncate text-xs font-medium text-foreground">
            {filterValueLabel(part.variant, tFilters)}
          </p>
        )}
        {/* Geen apart artikelnummer meer bij onderdelen: dat staat al in de
            naam. Bij banden en velgen zit het daar niet in, dus daar wel. */}
        {part.oeNumber && !part.name.includes(part.oeNumber) && (
          <p className="mt-0.5 truncate text-xs text-muted tabular-nums">
            {part.oeNumber}
          </p>
        )}

        {/* mt-auto duwt prijs en knoppen naar onderen, zodat ze in het hele
            grid op één lijn staan ongeacht de lengte van de titel */}
        <div className="mt-auto pt-3">
          <AvailabilityBadge availability={part.availability} />

          <p className="mt-2 text-xl font-bold tabular-nums">
            {formatPriceCents(part.priceCents)}
          </p>
          <p className="text-xs text-muted">{t("inclVat")}</p>

          <div className="mt-3 flex gap-2">
            <AddToCartButton part={part} variant="icon" className="flex-1" />
            <Link
              href={href}
              aria-label={t("viewAria", { name: part.name })}
              title={t("view")}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border text-foreground hover:bg-surface"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
