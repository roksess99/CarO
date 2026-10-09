import Link from "next/link";
import { requirePermission } from "@/lib/admin/session";
import { formatPriceCents } from "@/lib/format";
import { invoiceBreakdown, searchInvoices, totalsByYear } from "@/lib/invoices/store";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const monthFormat = new Intl.DateTimeFormat("nl-NL", {
  month: "long",
});

function monthLabel(month: number): string {
  return monthFormat.format(new Date(Date.UTC(2000, month - 1, 1)));
}

/**
 * De filters leven in de URL en niet in een clientcomponent.
 *
 * Dat is dezelfde keuze als bij de bandenmaatkiezer in de winkel: een
 * gefilterde lijst moet te delen en te bookmarken zijn, de terugknop hoort te
 * werken, en zonder JavaScript werkt een GET-formulier gewoon.
 *
 * De zoekterm komt daarmee in het serverlog terecht, en dat kan een naam of
 * mailadres zijn. Afgewogen en geaccepteerd: het paneel laadt geen enkele bron
 * van derden (@docs/PRIVACY.md), dus die URL lekt nergens heen — hij staat in
 * ons eigen log en in de browser van de beheerder, die de klantnaam op
 * datzelfde scherm toch al leest.
 */
type Props = {
  searchParams: Promise<{ zoek?: string; jaar?: string; maand?: string }>;
};

function parseYear(raw: string | undefined, known: number[]): number | null {
  const value = Number(raw);
  return Number.isInteger(value) && known.includes(value) ? value : null;
}

function parseMonth(raw: string | undefined): number | null {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= 12 ? value : null;
}

/** Bouwt een link die alleen de meegegeven filters wijzigt */
function filterHref(params: {
  zoek?: string | undefined;
  jaar?: number | null;
  maand?: number | null;
}): string {
  const query = new URLSearchParams();
  if (params.zoek) query.set("zoek", params.zoek);
  if (params.jaar) query.set("jaar", String(params.jaar));
  if (params.jaar && params.maand) query.set("maand", String(params.maand));
  const text = query.toString();
  return text ? `/beheer/facturen?${text}` : "/beheer/facturen";
}

export default async function FacturenPage({ searchParams }: Props) {
  await requirePermission("facturen");

  const { zoek, jaar, maand } = await searchParams;
  const term = (zoek ?? "").trim().slice(0, 100);

  // Eén query voor alle jaren en maanden; het jaartotaal is een optelling
  // en geen tweede vraag aan de database.
  const breakdown = await invoiceBreakdown();
  const years = totalsByYear(breakdown);
  const knownYears = years.map((row) => row.year);
  // `null` zolang de beheerder zelf geen jaar aanwees. Dat onderscheid is het
  // hele punt hieronder, dus het mag niet samenvallen met de terugval.
  const gekozenJaar = parseYear(jaar, knownYears);
  // Voor de tabellen en de koppen: het nieuwste jaar, want daar werkt hij in.
  // Staat er niets, dan blijft het dit jaar zodat de koppen kloppen.
  const year = gekozenJaar ?? knownYears[0] ?? new Date().getUTCFullYear();
  const month = gekozenJaar === null ? null : parseMonth(maand);

  /**
   * **Zoeken gaat over álle jaren, tenzij de beheerder er zelf een aanwees.**
   *
   * Dit stond eerst andersom: het formulier stuurde het getoonde jaar mee, en
   * dan gaf zoeken op een klant uit 2025 "geen factuur gevonden" terwijl hij er
   * gewoon was — precies de vraag waarvoor dit veld bestaat. Zonder zoekterm
   * blijft het jaar wél leidend: dan is het bladeren, geen zoeken.
   */
  const months = breakdown.filter((row) => row.year === year);
  const zoekJaar = term.length > 0 ? gekozenJaar : year;
  const invoices = await searchInvoices({
    ...(term ? { term } : {}),
    ...(zoekJaar === null ? {} : { year: zoekJaar }),
    ...(zoekJaar !== null && month ? { month } : {}),
    limit: 200,
  });

  const yearTotal = years.find((row) => row.year === year);
  const alleJaren = term.length > 0 && gekozenJaar === null;
  const filtered = term.length > 0 || month !== null;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <Link
        href="/beheer"
        className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
      >
        ← Terug naar het overzicht
      </Link>

      <h1 className="mt-4 text-xl font-semibold tracking-tight">Facturen</h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Een factuur krijgt zijn nummer op het moment dat de betaling binnen is,
        en verandert daarna niet meer. Moet er iets gecorrigeerd worden, dan
        hoort daar een creditfactuur bij — die kan nog niet vanuit dit scherm.
      </p>

      {/* Zoeken staat bovenaan: wie hier komt met een vraag van een klant zoekt
          op zijn naam, niet op een maand. */}
      <form method="get" role="search" className="mt-6">
        <label
          htmlFor="zoek"
          className="block text-sm font-medium text-foreground"
        >
          Zoek een factuur
        </label>
        <p id="zoek-uitleg" className="mt-1 text-sm text-muted">
          Op naam, mailadres, factuurnummer, ordernummer of bedrag (
          <span className="tabular-nums">37,71</span>).
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id="zoek"
            name="zoek"
            type="search"
            defaultValue={term}
            maxLength={100}
            aria-describedby="zoek-uitleg"
            placeholder="Jansen, info@…, 2026-0003 of 37,71"
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <button
            type="submit"
            className="rounded-md bg-caro-orange px-4 py-2 text-sm font-semibold text-caro-ink"
          >
            Zoeken
          </button>
          {term.length > 0 && (
            <Link
              href={filterHref({ jaar: year, maand: month })}
              className="self-center text-sm text-muted underline underline-offset-4 hover:text-foreground"
            >
              Zoekterm wissen
            </Link>
          )}
        </div>
      </form>

      <section className="mt-10">
        <h2 className="text-base font-semibold">Per jaar</h2>

        {years.length === 0 ? (
          <p className="mt-3 rounded-lg border border-border bg-background p-4 text-sm text-muted">
            Nog geen facturen. De eerste ontstaat bij de eerstvolgende betaalde
            bestelling.
          </p>
        ) : (
          <>
            {/* Een rij links en geen keuzelijst: bij twee of drie jaren is dat
                één klik in plaats van twee, en het is meteen zichtbaar welke
                jaren er überhaupt zijn. */}
            <nav aria-label="Factuurjaar" className="mt-3 flex flex-wrap gap-2">
              {years.map((row) => {
                const active = row.year === year;
                return (
                  <Link
                    key={row.year}
                    href={filterHref({ ...(term ? { zoek: term } : {}), jaar: row.year })}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-md border px-3 py-1.5 text-sm tabular-nums ${
                      active
                        ? "border-caro-orange bg-surface font-semibold text-foreground"
                        : "border-border text-muted hover:text-foreground"
                    }`}
                  >
                    {row.year}
                    <span className="ms-2 text-xs text-muted">{row.count}</span>
                  </Link>
                );
              })}
            </nav>

            {yearTotal && (
              <p className="mt-3 text-sm text-muted">
                {yearTotal.count}{" "}
                {yearTotal.count === 1 ? "factuur" : "facturen"} in {year}, samen{" "}
                <span className="tabular-nums text-foreground">
                  {formatPriceCents(yearTotal.netCents)}
                </span>{" "}
                exclusief btw ({formatPriceCents(yearTotal.grossCents)} inclusief).
              </p>
            )}
          </>
        )}
      </section>

      {months.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-semibold">Per maand in {year}</h2>
          <p className="mt-1 text-sm text-muted">
            Uit de facturen, exclusief btw — dat is wat je boekhouder telt. Klik
            een maand om alleen die facturen te zien.
          </p>

          <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-background">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="p-3 text-start font-semibold">
                    Maand
                  </th>
                  <th scope="col" className="p-3 text-end font-semibold">
                    Facturen
                  </th>
                  <th scope="col" className="p-3 text-end font-semibold">
                    Excl. btw
                  </th>
                  <th scope="col" className="p-3 text-end font-semibold">
                    Btw
                  </th>
                  <th scope="col" className="p-3 text-end font-semibold">
                    Incl. btw
                  </th>
                </tr>
              </thead>
              <tbody>
                {months.map((row) => {
                  const index = row.index;
                  const active = month === index;
                  return (
                    <tr
                      key={row.month}
                      className={`border-b border-border last:border-0 ${
                        active ? "bg-surface" : ""
                      }`}
                    >
                      <td className="p-3">
                        <Link
                          href={filterHref({
                            ...(term ? { zoek: term } : {}),
                            jaar: year,
                            maand: active ? null : index,
                          })}
                          aria-current={active ? "true" : undefined}
                          className="underline underline-offset-4 hover:text-caro-orange"
                        >
                          {monthLabel(index)}
                        </Link>
                        {active && (
                          <span className="ms-2 text-xs text-muted">
                            (filter staat aan)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-end tabular-nums">{row.count}</td>
                      <td className="p-3 text-end tabular-nums">
                        {formatPriceCents(row.netCents)}
                      </td>
                      <td className="p-3 text-end tabular-nums text-muted">
                        {formatPriceCents(row.vatCents)}
                      </td>
                      <td className="p-3 text-end tabular-nums">
                        {formatPriceCents(row.grossCents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-base font-semibold">
          {alleJaren
            ? "Facturen in alle jaren"
            : month
              ? `Facturen in ${monthLabel(month)} ${year}`
              : `Facturen in ${year}`}
          {term.length > 0 && ` met “${term}”`}
        </h2>

        {filtered && (
          <p className="mt-2 text-sm text-muted">
            {invoices.length}{" "}
            {invoices.length === 1 ? "factuur gevonden" : "facturen gevonden"}
            {alleJaren ? ", over alle jaren" : ""}.{" "}
            <Link
              href="/beheer/facturen"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Alles tonen
            </Link>
          </p>
        )}

        {invoices.length === 0 ? (
          <p className="mt-3 rounded-lg border border-border bg-background p-4 text-sm text-muted">
            {term.length > 0
              ? `Geen factuur gevonden met “${term}”. Zoeken kan op naam, mailadres, factuurnummer, ordernummer of bedrag.`
              : "Geen facturen in deze periode."}
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-background">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="p-3 text-start font-semibold">
                    Nummer
                  </th>
                  <th scope="col" className="p-3 text-start font-semibold">
                    Datum
                  </th>
                  <th scope="col" className="p-3 text-start font-semibold">
                    Klant
                  </th>
                  <th scope="col" className="p-3 text-start font-semibold">
                    Bestelling
                  </th>
                  <th scope="col" className="p-3 text-end font-semibold">
                    Bedrag
                  </th>
                  <th scope="col" className="p-3 text-end font-semibold">
                    PDF
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.number}
                    className="border-b border-border last:border-0"
                  >
                    <td className="p-3 font-mono font-medium tabular-nums">
                      {invoice.number}
                      {invoice.kind === "credit" && (
                        <span className="ms-2 text-xs text-muted">credit</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap text-muted">
                      {dateFormat.format(invoice.issuedAt)}
                    </td>
                    <td className="p-3">{invoice.customerName}</td>
                    <td className="p-3 font-mono text-xs text-muted tabular-nums">
                      {invoice.orderReference}
                    </td>
                    <td className="p-3 text-end tabular-nums">
                      {formatPriceCents(invoice.totalGrossCents)}
                    </td>
                    <td className="p-3 text-end">
                      <a
                        href={`/beheer/facturen/${invoice.number}/pdf`}
                        className="underline underline-offset-4 hover:text-caro-orange"
                      >
                        openen
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
