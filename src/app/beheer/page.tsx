import Link from "next/link";
import { CaroMark } from "@/components/brand/caro-mark";
import { formatPriceCents } from "@/lib/format";
import {
  can,
  isRole,
  type Permission,
  ROLE_LABELS,
} from "@/lib/admin/roles";
import { requireAdmin } from "@/lib/admin/session";
import { listOrders, orderTotals } from "@/lib/orders/store";
import { signOut } from "./actions";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_LABEL: Record<string, string> = {
  paid: "Betaald",
  awaiting_payment: "Wacht op betaling",
  failed: "Mislukt",
};

/**
 * De knoppenbalk. Elke knop draagt het recht dat erachter zit, zodat een rol
 * er nooit één ziet die hij bij aanklikken toch niet mag openen.
 *
 * **Dit is de etalage, niet het slot.** De echte controle staat in de pagina
 * en in elke Server Action erachter (`requirePermission`). Een knop verbergen
 * houdt niemand tegen die de URL intikt.
 */
const NAV: ReadonlyArray<{ href: string; label: string; needs: Permission }> = [
  { href: "/beheer/prijzen", label: "Prijzen", needs: "prijzen" },
  { href: "/beheer/kortingen", label: "Kortingen", needs: "kortingen" },
  {
    href: "/beheer/kortingscodes",
    label: "Kortingscodes",
    needs: "kortingen",
  },
  {
    href: "/beheer/beoordelingen",
    label: "Beoordelingen",
    needs: "beoordelingen",
  },
  { href: "/beheer/facturen", label: "Facturen", needs: "facturen" },
  { href: "/beheer/beheerders", label: "Beheerders", needs: "beheerders" },
];

const GEWEIGERD: Record<Permission, string> = {
  bestellingen: "de bestellingen",
  facturen: "de facturen en de omzet",
  prijzen: "de prijzen",
  kortingen: "de kortingen en kortingscodes",
  beoordelingen: "de beoordelingen",
  beheerders: "het beheer van gebruikers",
};

export default async function BeheerPage({
  searchParams,
}: {
  searchParams: Promise<{ "geen-toegang"?: string }>;
}) {
  const admin = await requireAdmin();
  const { "geen-toegang": geweigerd } = await searchParams;

  const magBestellingen = can(admin.role, "bestellingen");
  const magOmzet = can(admin.role, "facturen");

  // Alleen ophalen wat deze rol mag zien. Klantgegevens niet uit de database
  // trekken voor iemand die ze toch niet te zien krijgt is geen detail: het
  // is het verschil tussen "afgeschermd" en "niet opgehaald".
  const [totals, recent] = await Promise.all([
    magOmzet || magBestellingen ? orderTotals() : null,
    magBestellingen ? listOrders({ limit: 10 }) : null,
  ]);

  const nav = NAV.filter((item) => can(admin.role, item.needs));

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <CaroMark className="size-9" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Beheer</h1>
            <p className="text-sm text-muted">
              {admin.email} · {ROLE_LABELS[admin.role].naam.toLowerCase()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
            >
              {item.label}
            </Link>
          ))}
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
            >
              Uitloggen
            </button>
          </form>
        </div>
      </header>

      {/* Iemand kwam hier via requirePermission(). Zeggen wát er niet mag is
          vriendelijker dan een kale doorverwijzing, en het scheelt een belletje. */}
      {isRole(admin.role) && geweigerd && geweigerd in GEWEIGERD && (
        <p
          role="status"
          className="mt-6 rounded-lg border border-border border-s-4 border-s-caro-orange bg-background p-4 text-sm"
        >
          Je rol ({ROLE_LABELS[admin.role].naam.toLowerCase()}) geeft geen
          toegang tot {GEWEIGERD[geweigerd as Permission]}. Vraag de eigenaar
          om die rechten als je ze nodig hebt.
        </p>
      )}

      {totals && (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Tile label="Betaalde bestellingen" value={String(totals.paidCount)} />
          <Tile
            label="Omzet incl. btw"
            value={formatPriceCents(totals.paidGrossCents)}
            note={`waarvan ${formatPriceCents(totals.paidVatCents)} btw`}
          />
          <Tile
            label="Wacht op betaling"
            value={String(totals.openCount)}
            note="niet meegeteld in de omzet"
          />
        </div>
      )}

      {recent && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Laatste bestellingen</h2>

          {recent.length === 0 ? (
            <p className="mt-4 rounded-lg border border-border bg-background p-6 text-muted">
              Nog geen bestellingen.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-background">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-start">
                    <th scope="col" className="p-3 text-start font-semibold">
                      Kenmerk
                    </th>
                    <th scope="col" className="p-3 text-start font-semibold">
                      Klant
                    </th>
                    <th scope="col" className="p-3 text-start font-semibold">
                      Datum
                    </th>
                    <th scope="col" className="p-3 text-start font-semibold">
                      Status
                    </th>
                    <th scope="col" className="p-3 text-end font-semibold">
                      Bedrag
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((order) => (
                    <tr
                      key={order.reference}
                      className="border-b border-border last:border-0"
                    >
                      <td className="p-3 font-mono tabular-nums">
                        {order.reference}
                      </td>
                      <td className="p-3">
                        {order.customerName}
                        <span className="block text-xs text-muted">
                          {order.email}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-muted">
                        {dateFormat.format(new Date(order.createdAt))}
                      </td>
                      <td className="p-3">
                        {STATUS_LABEL[order.status] ?? order.status}
                      </td>
                      <td className="p-3 text-end tabular-nums">
                        {formatPriceCents(order.totalGrossCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Wie hier binnenkomt zonder rechten op iets zichtbaars hoort te lezen
          waar hij dan wél voor is, in plaats van een lege pagina. */}
      {!totals && !recent && (
        <section className="mt-10 rounded-lg border border-border bg-background p-6">
          <h2 className="text-base font-semibold">
            {ROLE_LABELS[admin.role].naam}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {ROLE_LABELS[admin.role].uitleg} Gebruik de knoppen hierboven.
          </p>
        </section>
      )}

      {/* Eerlijk zijn over wat er nog niet is, in plaats van lege knoppen */}

    </div>
  );
}

function Tile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}
