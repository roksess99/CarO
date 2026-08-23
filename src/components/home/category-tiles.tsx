"use client";

import Image from "next/image";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import type { ProductFamily } from "@/lib/catalog/families";

export interface CategoryTile {
  family: ProductFamily;
  slug: string;
  label: string;
  image: string;
  categories: { slug: string; name: string }[];
}

/**
 * Beeldtegels die uitklappen naar hun categorieën.
 *
 * Het paneel staat ná de hele rij in de DOM en beslaat de volle breedte, niet
 * onder de tegel zelf. Zo blijft het raster intact en is er ruimte voor de
 * twaalf categorieën die sommige families hebben.
 */
export function CategoryTiles({
  tiles,
  viewAllLabel,
  closeLabel,
}: {
  tiles: CategoryTile[];
  viewAllLabel: string;
  closeLabel: string;
}) {
  const [openFamily, setOpenFamily] = useState<ProductFamily | null>(null);
  const open = tiles.find((tile) => tile.family === openFamily) ?? null;

  return (
    <div>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => {
          const expanded = tile.family === openFamily;
          // Zonder categorieën valt er niets uit te klappen; dan is een
          // gewone link eerlijker dan een knop die bijna niets doet.
          const isLink = tile.categories.length === 0;
          const panelId = `tegel-${tile.family}`;

          const inner = (
            <>
              <span className="relative block aspect-square overflow-hidden bg-surface">
                <Image
                  src={tile.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 12rem, (min-width: 640px) 30vw, 45vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              </span>
              <span className="flex flex-1 flex-col items-center gap-2 px-2 py-3 text-center">
                <span
                  aria-hidden="true"
                  className={`size-1.5 rounded-full ${expanded ? "bg-caro-orange" : "bg-caro-orange/60"}`}
                />
                <span className="text-sm font-semibold">{tile.label}</span>
              </span>
            </>
          );

          const shell = `group flex h-full w-full flex-col overflow-hidden rounded-lg border bg-background text-start transition-colors ${
            expanded ? "border-caro-orange" : "border-border hover:border-caro-orange"
          }`;

          return (
            <li key={tile.family}>
              {isLink ? (
                <Link
                  href={{ pathname: "/[family]", params: { family: tile.slug } }}
                  className={shell}
                >
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={expanded ? panelId : undefined}
                  onClick={() =>
                    setOpenFamily(expanded ? null : tile.family)
                  }
                  className={shell}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {open && (
        <div
          id={`tegel-${open.family}`}
          className="relative mt-4 rounded-lg border border-caro-orange bg-background p-4 md:p-6"
        >
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => setOpenFamily(null)}
            className="absolute top-2 end-2 inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-foreground"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          <p className="pe-12 font-bold">{open.label}</p>

          <ul className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
            {open.categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={{
                    pathname: "/[family]/[category]",
                    params: { family: open.slug, category: category.slug },
                  }}
                  className="flex min-h-11 items-center rounded-md px-2 text-sm text-muted hover:bg-surface hover:text-foreground"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href={{ pathname: "/[family]", params: { family: open.slug } }}
            className="mt-4 inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-semibold hover:bg-surface"
          >
            {viewAllLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
