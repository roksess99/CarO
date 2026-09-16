import Link from "next/link";
import { CaroMark } from "@/components/brand/caro-mark";
import { formatPriceCents } from "@/lib/format";
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

export default async function BeheerPage() {
  const admin = await requireAdmin();
  const [totals, recent] = await Promise.all([
    orderTotals(),
    listOrders({ limit: 10 }),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <CaroMark className="size-9" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Beheer</h1>
            <p className="text-sm text-muted">{admin.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/beheer/facturen"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
          >
            Facturen
          </Link>
          <Link
            href="/beheer/beheerders"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
          >
            Beheerders
          </Link>
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
                  <tr key={order.reference} className="border-b border-border last:border-0">
                    <td className="p-3 font-mono tabular-nums">{order.reference}</td>
                    <td className="p-3">
                      {order.customerName}
                      <span className="block text-xs text-muted">{order.email}</span>
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

      {/* Eerlijk zijn over wat er nog niet is, in plaats van lege knoppen */}
      <section className="mt-10 rounded-lg border border-border bg-background p-6">
        <h2 className="text-base font-semibold">Nog te bouwen</h2>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          <li>Creditfacturen bij een terugbetaling</li>
          <li>Artikelen in de korting zetten</li>
          <li>Kortingscodes</li>
        </ul>
      </section>
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
