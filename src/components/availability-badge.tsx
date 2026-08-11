import { useTranslations } from "next-intl";
import type { Availability } from "@/lib/catalog/types";

/**
 * Voorraadstatus als badge.
 *
 * Kleur draagt de boodschap niet alleen: elke staat heeft een eigen icoon én
 * eigen tekst (WCAG 2.2 — 1.4.1 Use of Color). De donkere tekstkleuren zijn
 * gekozen omdat groen of oranje op wit anders onder 4,5:1 duikt.
 *
 * Dit valt buiten BRAND.md: merkoranje is hier bewust níet gebruikt, want
 * dat is het accent van de shop en zou verwarren met een statuskleur.
 */
const STYLES = {
  "in-stock":
    "bg-green-50 text-green-800 ring-green-600/20 dark:bg-green-500/10 dark:text-green-300 dark:ring-green-400/30",
  ordered:
    "bg-amber-50 text-amber-900 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/30",
  "out-of-stock":
    "bg-surface text-muted ring-border dark:bg-surface dark:text-muted",
} as const satisfies Record<Availability, string>;

function Icon({ availability }: { availability: Availability }) {
  const common = {
    "aria-hidden": true,
    viewBox: "0 0 24 24",
    className: "size-3.5 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  if (availability === "in-stock") {
    return (
      <svg {...common}>
        <path d="m4 12.5 5 5L20 6.5" />
      </svg>
    );
  }
  if (availability === "ordered") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </svg>
  );
}

export function AvailabilityBadge({
  availability,
}: {
  availability: Availability;
}) {
  const t = useTranslations("product");

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STYLES[availability]}`}
    >
      <Icon availability={availability} />
      {t(`availability.${availability}`)}
    </span>
  );
}
