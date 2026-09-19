import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { ProductFamily } from "@/lib/catalog/families";

export interface CategoryTile {
  family: ProductFamily;
  slug: string;
  label: string;
  image: string;
}

/**
 * Beeldtegels naar de vier productfamilies.
 *
 * **Eén klik, geen tussenstap.** De tegels klapten tot 2026-09-17 uit naar
 * een paneel met de categorieën eronder; winkelkeuze van de eigenaar is dat
 * een klik op "Velgen" gewoon de velgenpagina opent, net als Onderdelen dat
 * altijd al deed. Dat paneel zette de klant voor een tweede keuze terwijl hij
 * er al één had gemaakt, en de categorieën die erin stonden staan op de
 * familiepagina zelf óók — daar als filterrij, met de producten er meteen
 * onder in plaats van achter nog een klik.
 *
 * Daarmee is dit weer een Server Component: geen state, geen JavaScript.
 */
export function CategoryTiles({ tiles }: { tiles: CategoryTile[] }) {
  return (
    // Vier families passen niet vullend in zes kolommen; die lieten de rij
    // links uitlijnen met een gat ernaast. Kolommen volgen het aantal tegels,
    // met een maximumbreedte zodat ze gecentreerd staan.
    <ul className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {tiles.map((tile) => (
        <li key={tile.family}>
          <Link
            href={{ pathname: "/[family]", params: { family: tile.slug } }}
            className="group flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-background text-start transition-colors hover:border-caro-orange"
          >
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
                className="size-1.5 rounded-full bg-caro-orange/60"
              />
              <span className="text-sm font-semibold">{tile.label}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
