import { useTranslations } from "next-intl";
import { PAYMENT_METHODS } from "@/lib/payment-methods";

/**
 * Compact vertrouwensblok, direct onder de bestelknop.
 *
 * Waarom hier en niet in de footer: twijfel over betalen, btw en retour komt
 * precies op het moment dat de duim boven de knop hangt. Onderaan de pagina
 * leest niemand het meer.
 *
 * Elke regel is een bestaande afspraak van de winkel — btw en herroepingsrecht
 * staan in CLAUDE.md, de betaalmethodes zijn gemeten met `pnpm mollie:check`
 * (lib/payment-methods.ts). Geen keurmerken die we niet hebben, geen
 * "30 dagen" waar er veertien geldt.
 */
export function TrustBadges() {
  const t = useTranslations("trust");

  const items = [
    { key: "payment", label: t("payment", { method: PAYMENT_METHODS[0] }) },
    { key: "vat", label: t("vat") },
    { key: "returns", label: t("returns") },
  ] as const;

  return (
    <ul className="grid gap-2 text-sm sm:grid-cols-3">
      {items.map((item) => (
        <li key={item.key} className="flex items-start gap-2">
          <Icon name={item.key} />
          <span className="min-w-0">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

function Icon({ name }: { name: "payment" | "vat" | "returns" }) {
  const common = {
    "aria-hidden": true,
    viewBox: "0 0 24 24",
    className: "mt-0.5 size-4 shrink-0 text-muted",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  if (name === "payment") {
    // Hangslot: veilig betalen
    return (
      <svg {...common}>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }
  if (name === "vat") {
    // Prijskaartje: wat je ziet is wat je betaalt
    return (
      <svg {...common}>
        <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" />
        <circle cx="7.5" cy="7.5" r="1.2" />
      </svg>
    );
  }
  // Retourpijl
  return (
    <svg {...common}>
      <path d="M3 9h13a5 5 0 0 1 0 10h-6" />
      <path d="m7 5-4 4 4 4" />
    </svg>
  );
}
