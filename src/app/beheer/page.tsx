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
import { catalogHealth } from "@/lib/catalog/health";
import { listOrders, orderTotals } from "@/lib/orders/store";
import { returnTotals } from "@/lib/returns/store";
import { statsOverview, type StatPeriod } from "@/lib/stats/store";
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
  { href: "/beheer/retouren", label: "Retouren", needs: "retouren" },
  { href: "/beheer/facturen", label: "Facturen", needs: "facturen" },
  { href: "/beheer/beheerders", label: "Beheerders", needs: "beheerders" },
];

const GEWEIGERD: Record<Permission, string> = {
  bestellingen: "de bestellingen",
  facturen: "de facturen en de omzet",
  prijzen: "de prijzen",
  kortingen: "de kortingen en kortingscodes",
  beoordelingen: "de beoordelingen",
  retouren: "de retouren",
  beheerders: "het beheer van gebruikers",
  statistieken: "de bezoekcijfers",
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
  const magRetouren = can(admin.role, "retouren");
  const magStats = can(admin.role, "statistieken");
  // De retourcijfers zijn optellingen zonder klantgegevens en horen bij de
  // omzet: wie de omzet mag zien, hoort te zien wat er weer af ging. De
  // aanvragen zelf (met naam en artikel) blijven achter `retouren` zitten.
  const [totals, recent, returns, stats, catalogus] = await Promise.all([
    magOmzet || magBestellingen ? orderTotals() : null,
    magBestellingen ? listOrders({ limit: 10 }) : null,
    magOmzet || magBestellingen ? returnTotals() : null,
    magStats ? statsOverview() : null,
    // Voor iedereen die hier binnenkomt, ongeacht rol: een catalogus die leeg
    // staat is geen rechtenkwestie maar een winkel die niet verkoopt.
    catalogHealth(),
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


      {/* Bovenaan en in het rood: valt een catalogus weg, dan staat die
          productgroep leeg in de winkel en ziet de klant "niets gevonden".
          De adapter vangt zo'n fout bewust af zodat er geen foutpagina komt
          (@docs/api/WEARPARTS.md), en juist daarom moet het hier luid zijn. */}
      {catalogus.some((api) => !api.ok) && (
        <div className="mt-6 rounded-lg border border-danger bg-background p-4">
          <h2 className="font-semibold text-danger">
            De catalogus van de leverancier is niet bereikbaar
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {catalogus
              .filter((api) => !api.ok)
              .map((api) => (
                <li key={api.api}>
                  <span className="font-medium">{api.families.join(", ")}</span>{" "}
                  {api.rejected
                    ? "— onze sleutel wordt geweigerd"
                    : "— geen antwoord"}
                  {api.detail ? ` (${api.detail})` : ""}
                </li>
              ))}
          </ul>
          <p className="mt-2 text-sm text-muted">
            Die productgroepen zijn nu leeg in de winkel. Een sleutel bij de
            leverancier verloopt vanzelf; maak een nieuwe aan en zet hem in de
            omgevingsvariabelen. Controleren kan met{" "}
            <code className="font-mono">pnpm catalog:check</code>.
          </p>
        </div>
      )}

      {/* Een retour heeft een wettelijke termijn van veertien dagen; dat is
          het enige op dit scherm waar een klok op staat. Daarom een melding en
          geen tegel tussen de omzetcijfers. */}
      {magRetouren && returns && returns.openCount > 0 && (
        <p className="mt-6 rounded-lg border border-border border-s-4 border-s-caro-orange bg-background p-4 text-sm">
          <Link href="/beheer/retouren" className="font-semibold underline">
            {returns.openCount === 1
              ? "Eén retour wacht op behandeling"
              : `${returns.openCount} retouren wachten op behandeling`}
          </Link>
        </p>
      )}

      {totals && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Betaalde bestellingen" value={String(totals.paidCount)} />
          <Tile
            label="Omzet incl. btw"
            value={formatPriceCents(totals.paidGrossCents)}
            note={
              <>
                waarvan {formatPriceCents(totals.paidVatCents)} btw
                {/* De omzet blijft staan op wat er binnenkwam; het bedrag ná
                    retouren staat eronder in plaats van dat het stil van het
                    grote getal af gaat. Twee verschillende vragen, en de
                    boekhouding stelt ze allebei. */}
                {returns && returns.refundedCents > 0 && (
                  <span className="block">
                    {formatPriceCents(totals.paidGrossCents - returns.refundedCents)}{" "}
                    na retouren
                  </span>
                )}
              </>
            }
          />
          <Tile
            label="Terugbetaald"
            value={formatPriceCents(returns?.refundedCents ?? 0)}
            note={
              returns && returns.refundedCount > 0
                ? `${returns.refundedCount} ${returns.refundedCount === 1 ? "retour" : "retouren"} afgerond${
                    returns.openCount > 0
                      ? ` · ${returns.openCount} nog open`
                      : ""
                  }`
                : returns && returns.openCount > 0
                  ? `${returns.openCount} ${returns.openCount === 1 ? "retour loopt" : "retouren lopen"} nog`
                  : "nog geen retouren"
            }
          />
          <Tile
            label="Wacht op betaling"
            value={String(totals.openCount)}
            note="niet meegeteld in de omzet"
          />
        </div>
      )}


      {/* Eigen tellers, geen analysedienst van buiten: dat scheelt een
          toestemmingsbanner en meet daardoor élke bezoeker in plaats van
          alleen wie toestemming gaf (@docs/DECISIONS.md #24). */}
      {stats && (
        <section className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Bezoek</h2>
            <p className="text-sm text-muted">
              Een bezoek is iemand die binnenkomt. Wie later terugkomt telt
              opnieuw.
            </p>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface text-start">
                <tr>
                  <th className="px-4 py-2 text-start font-medium">Stap</th>
                  <th className="px-4 py-2 text-end font-medium">7 dagen</th>
                  <th className="px-4 py-2 text-end font-medium">28 dagen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <Row label="Bezoeken" pick={(p) => p.visits} stats={stats} />
                <Row
                  label="Paginaweergaven"
                  pick={(p) => p.pageviews}
                  stats={stats}
                />
                <Row
                  label="In winkelwagen"
                  pick={(p) => p.cartAdds}
                  stats={stats}
                />
                <Row
                  label="Afrekenen geopend"
                  pick={(p) => p.checkoutStarts}
                  stats={stats}
                />
                <Row
                  label="Betaling gestart"
                  pick={(p) => p.paymentStarts}
                  stats={stats}
                />
                <Row label="Betaald" pick={(p) => p.paid} stats={stats} sterk />
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-sm text-muted">
            Van bezoek naar bestelling:{" "}
            <span className="font-semibold tabular-nums">
              {share(stats.month.paid, stats.month.visits)}
            </span>{" "}
            over 28 dagen.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Lijst titel="Soort pagina" items={stats.pages} />
            <Lijst titel="Herkomst" items={stats.sources} />
          </div>
        </section>
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
  /** Eén of twee regels onder het getal; mag opmaak dragen */
  note?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

/** Eén regel van de trechter, met beide periodes naast elkaar. */
function Row({
  label,
  pick,
  stats,
  sterk = false,
}: {
  label: string;
  pick: (period: StatPeriod) => number;
  stats: { week: StatPeriod; month: StatPeriod };
  sterk?: boolean;
}) {
  return (
    <tr className={sterk ? "font-semibold" : undefined}>
      <td className="px-4 py-2">{label}</td>
      <td className="px-4 py-2 text-end tabular-nums">{pick(stats.week)}</td>
      <td className="px-4 py-2 text-end tabular-nums">{pick(stats.month)}</td>
    </tr>
  );
}

/** Percentage met één decimaal; zonder noemer valt er niets te zeggen. */
function share(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${((part / whole) * 100).toFixed(1).replace(".", ",")}%`;
}

/** Een kort lijstje met aantallen, voor paginasoorten en herkomst. */
function Lijst({
  titel,
  items,
}: {
  titel: string;
  items: ReadonlyArray<{ label: string; total: number }>;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">{titel}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nog niets gemeten.</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {items.map((item) => (
            <li key={item.label} className="flex justify-between gap-4">
              <span>{item.label}</span>
              <span className="tabular-nums text-muted">{item.total}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
