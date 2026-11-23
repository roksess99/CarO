import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";

type Href = ComponentProps<typeof Link>["href"];

/**
 * Genummerde pagina's onder een productlijst — de weg waarlangs een
 * zoekmachine bij artikel 21 en verder komt.
 *
 * "Meer laden" (`?toon=40`) is voor de klant, maar staat in robots.txt op
 * disallow: het maakt een lange variant van een pagina die al in de index
 * staat. Daardoor zag Google van elke categorie alleen de eerste twintig
 * producten (GEMETEN 2026-11-23: 20 productlinks op /nl/banden/auto-suv-1,
 * en geen enkele crawlbare link verder). `?pagina=2` is een eigen pagina met
 * eigen artikelen en een eigen canonical, en mag dus wél gecrawld worden.
 *
 * Er is geen totaal: de leverancier geeft er geen mee. Daarom alleen vorige,
 * de eerste, de huidige en volgende — "volgende" alleen als deze pagina vol
 * was, wat het eerlijkste signaal is dat er meer komt.
 *
 * Een gewone server component: het zijn links, er is niets te onthouden.
 */
export function Pagination({
  current,
  hasNext,
  hrefFor,
  labels,
}: {
  /** Eengebaseerd, zoals in de URL */
  current: number;
  hasNext: boolean;
  hrefFor: (page: number) => Href;
  labels: {
    nav: string;
    previous: string;
    next: string;
    page: (page: number) => string;
  };
}) {
  if (current <= 1 && !hasNext) return null;

  const pages = [
    ...(current > 2 ? [1] : []),
    ...(current > 1 ? [current - 1] : []),
    current,
    ...(hasNext ? [current + 1] : []),
  ];

  const link =
    "inline-flex min-w-11 items-center justify-center rounded-md border px-3 py-2 text-sm tabular-nums";

  return (
    <nav aria-label={labels.nav} className="mt-8">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {current > 1 && (
          <li>
            <Link
              href={hrefFor(current - 1)}
              className={`${link} border-border hover:border-caro-orange hover:bg-surface`}
            >
              <span aria-hidden="true">‹</span>
              <span className="ms-1">{labels.previous}</span>
            </Link>
          </li>
        )}
        {pages.map((page, index) => (
          <li key={page} className="flex items-center gap-2">
            {/* Een gat tussen 1 en de vorige pagina laten zien, anders leest
                "1 4 5" als een telfout */}
            {index > 0 && page - pages[index - 1] > 1 && (
              <span aria-hidden="true" className="text-muted">
                …
              </span>
            )}
            {page === current ? (
              <span
                aria-current="page"
                aria-label={labels.page(page)}
                className={`${link} border-caro-orange bg-surface font-semibold`}
              >
                {page}
              </span>
            ) : (
              <Link
                href={hrefFor(page)}
                aria-label={labels.page(page)}
                className={`${link} border-border text-muted hover:border-caro-orange hover:text-foreground`}
              >
                {page}
              </Link>
            )}
          </li>
        ))}
        {hasNext && (
          <li>
            <Link
              href={hrefFor(current + 1)}
              className={`${link} border-border hover:border-caro-orange hover:bg-surface`}
            >
              <span className="me-1">{labels.next}</span>
              <span aria-hidden="true">›</span>
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}
