import Link from "next/link";
import { requireAdmin } from "@/lib/admin/session";
import { formatPriceCents } from "@/lib/format";
import { invoiceTotalsByMonth, listInvoices } from "@/lib/invoices/store";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const monthFormat = new Intl.DateTimeFormat("nl-NL", {
  month: "long",
  year: "numeric",
});

function monthLabel(month: string): string {
  const [year, index] = month.split("-").map(Number);
  return monthFormat.format(new Date(Date.UTC(year, index - 1, 1)));
}

export default async function FacturenPage() {
  await requireAdmin();
  const year = new Date().getUTCFullYear();
  const [invoices, months] = await Promise.all([
    listInvoices(50),
    invoiceTotalsByMonth(year),
  ]);

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

      <section className="mt-8">
        <h2 className="text-base font-semibold">Omzet per maand in {year}</h2>
        <p className="mt-1 text-sm text-muted">
          Uit de facturen, exclusief btw — dat is wat je boekhouder telt.
        </p>

        {months.length === 0 ? (
          <p className="mt-3 rounded-lg border border-border bg-background p-4 text-sm text-muted">
            Nog geen facturen dit jaar.
          </p>
        ) : (
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
                {months.map((month) => (
                  <tr key={month.month} className="border-b border-border last:border-0">
                    <td className="p-3">{monthLabel(month.month)}</td>
                    <td className="p-3 text-end tabular-nums">{month.count}</td>
                    <td className="p-3 text-end tabular-nums">
                      {formatPriceCents(month.netCents)}
                    </td>
                    <td className="p-3 text-end tabular-nums text-muted">
                      {formatPriceCents(month.vatCents)}
                    </td>
                    <td className="p-3 text-end tabular-nums">
                      {formatPriceCents(month.grossCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold">Alle facturen</h2>

        {invoices.length === 0 ? (
          <p className="mt-3 rounded-lg border border-border bg-background p-4 text-sm text-muted">
            Nog geen facturen. De eerste ontstaat bij de eerstvolgende betaalde
            bestelling.
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
                  <tr key={invoice.number} className="border-b border-border last:border-0">
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
