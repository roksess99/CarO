import Link from "next/link";
import { requirePermission } from "@/lib/admin/session";
import { formatPriceCents } from "@/lib/format";
import { listReturns } from "@/lib/returns/store";
import { returnAmountCents, type ReturnReason } from "@/lib/returns/types";
import type { StoredReturn } from "@/lib/returns/types";
import { DeclineButton, ReceiveButton, RefundButton } from "./return-buttons";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const REASON: Record<ReturnReason, string> = {
  withdrawal: "Bedenktijd",
  wrong: "Verkeerd geleverd",
  damaged: "Beschadigd aangekomen",
  defect: "Defect of garantie",
};

/** Wie de retourzending betaalt. Volgt uit de reden, niet uit een keuze. */
const SHIPPING_COST: Record<ReturnReason, string> = {
  withdrawal: "retourzending voor de klant",
  wrong: "retourzending voor ons",
  damaged: "retourzending voor ons",
  defect: "retourzending voor ons",
};

/**
 * Retouren afhandelen.
 *
 * Drie stappen, en ze staan in die volgorde omdat de wet dat zo bedoelt:
 * aangemeld → pakket ontvangen → terugbetaald. Terugbetalen binnen veertien
 * dagen na de melding is verplicht, maar je mag wachten tot het pakket binnen
 * is (art. 6:230s lid 3 BW) — vandaar dat de middelste stap bestaat.
 *
 * De knop "terugbetalen" staat er ook al vóór "ontvangen": bij een verkeerd
 * geleverd artikel wil je soms eerst het geld terugboeken en dan pas het
 * pakket afwachten. Wat níet kan is twee keer terugbetalen; dat houdt de
 * database tegen, en de betaaldienst via de idempotentiesleutel.
 */
export default async function RetourenPage() {
  await requirePermission("retouren");
  const returns = await listReturns();

  const open = returns.filter(
    (entry) => entry.status === "requested" || entry.status === "received",
  );
  const done = returns.filter(
    (entry) => entry.status === "refunded" || entry.status === "rejected",
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Retouren</h1>
          <p className="text-sm text-muted">
            Aangemeld via /retour. Terugbetalen gaat naar dezelfde rekening als
            waarmee betaald is.
          </p>
        </div>
        <Link
          href="/beheer"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
        >
          Terug
        </Link>
      </header>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">
          Openstaand {open.length > 0 && `(${open.length})`}
        </h2>
        {open.length === 0 ? (
          <p className="mt-4 rounded-lg border border-border bg-background p-6 text-muted">
            Geen openstaande retouren.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {open.map((entry) => (
              <li key={entry.reference}>
                <ReturnCard entry={entry} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Afgehandeld</h2>
          <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-background">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="p-3 text-start font-semibold">
                    Retour
                  </th>
                  <th scope="col" className="p-3 text-start font-semibold">
                    Bestelling
                  </th>
                  <th scope="col" className="p-3 text-start font-semibold">
                    Afgehandeld
                  </th>
                  <th scope="col" className="p-3 text-end font-semibold">
                    Bedrag
                  </th>
                </tr>
              </thead>
              <tbody>
                {done.map((entry) => (
                  <tr
                    key={entry.reference}
                    className="border-b border-border last:border-0"
                  >
                    <td className="p-3 font-mono tabular-nums">
                      {entry.reference}
                    </td>
                    <td className="p-3 font-mono tabular-nums text-muted">
                      {entry.orderReference}
                    </td>
                    <td className="p-3 text-muted">
                      {entry.status === "refunded"
                        ? `Terugbetaald ${entry.refundedAt ? dateFormat.format(entry.refundedAt) : ""}`
                        : `Afgewezen — ${entry.rejectedReason ?? ""}`}
                    </td>
                    <td className="p-3 text-end tabular-nums">
                      {entry.status === "refunded"
                        ? formatPriceCents(entry.refundedCents ?? 0)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function ReturnCard({ entry }: { entry: StoredReturn }) {
  const amount = returnAmountCents(entry);

  return (
    <article className="rounded-lg border border-border bg-background p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-mono font-semibold tabular-nums">
            {entry.reference}
          </p>
          <p className="text-sm text-muted">
            bij bestelling{" "}
            <span className="font-mono tabular-nums">{entry.orderReference}</span>{" "}
            · aangemeld {dateFormat.format(entry.requestedAt)}
          </p>
        </div>
        <div className="text-end">
          <p className="text-lg font-semibold tabular-nums">
            {formatPriceCents(amount)}
          </p>
          <p className="text-sm text-muted">
            {entry.shippingCents > 0
              ? `incl. ${formatPriceCents(entry.shippingCents)} verzendkosten`
              : "zonder verzendkosten"}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm">
        <span className="font-medium">{REASON[entry.reason]}</span>
        <span className="text-muted"> · {SHIPPING_COST[entry.reason]}</span>
        {entry.status === "received" && (
          <span className="text-muted">
            {" "}
            · pakket ontvangen
            {entry.receivedAt ? ` ${dateFormat.format(entry.receivedAt)}` : ""}
          </span>
        )}
      </p>

      <ul className="mt-3 space-y-1 text-sm">
        {entry.lines.map((line) => (
          <li key={line.partId} className="flex justify-between gap-4">
            <span>
              {line.quantity}× {line.name}
            </span>
            <span className="tabular-nums text-muted">
              {formatPriceCents(line.lineGrossCents)}
            </span>
          </li>
        ))}
      </ul>

      {entry.note && (
        <p className="mt-3 whitespace-pre-line rounded-md bg-surface p-3 text-sm">
          {entry.note}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
        {entry.status === "requested" && (
          <ReceiveButton reference={entry.reference} />
        )}
        <RefundButton reference={entry.reference} amountCents={amount} />
        <DeclineButton reference={entry.reference} />
      </div>
    </article>
  );
}
