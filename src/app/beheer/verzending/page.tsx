import Link from "next/link";
import { requirePermission } from "@/lib/admin/session";
import { formatPriceCents } from "@/lib/format";
import { listShipments, type Shipment } from "@/lib/orders/store";
import { carrierName, trackingLabel } from "@/lib/orders/tracking";
import { TrackingForm } from "./tracking-form";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** Hoeveel bestellingen het scherm hoogstens toont */
const LIMIT = 60;

/**
 * Track & trace naar de klant sturen.
 *
 * De beheerder koopt met de hand in bij de groothandel (@docs/DECISIONS.md
 * #4 en #10) en krijgt van de vervoerder een barcode of een lijn. Dit scherm
 * is de plek waar die bij de klant terechtkomt.
 *
 * **Alleen betaalde bestellingen.** Een verzendbericht over een bestelling
 * waarvoor niet betaald is zegt iets dat niet waar is; de Server Action
 * weigert hem ook.
 *
 * Standaard staat hier de werkvoorraad: wat nog geen bericht heeft gehad.
 * `?alles=1` toont ook de verstuurde, want een code kan verkeerd overgetypt
 * zijn en dan moet hij te herstellen zijn — met een bevestiging, want de
 * klant krijgt dan een tweede mail.
 */
export default async function VerzendingPage({
  searchParams,
}: {
  searchParams: Promise<{ alles?: string }>;
}) {
  await requirePermission("bestellingen");
  const { alles } = await searchParams;
  const showAll = alles === "1";
  const shipments = await listShipments({ limit: LIMIT, onlyOpen: !showAll });

  const open = shipments.filter((entry) => !entry.trackingSentAt);
  const sent = shipments.filter((entry) => entry.trackingSentAt);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Verzending</h1>
          <p className="text-sm text-muted">
            Betaalde bestellingen. Vul de track &amp; trace in en de klant
            krijgt er bericht van, in de taal waarin hij bestelde.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={showAll ? "/beheer/verzending" : "/beheer/verzending?alles=1"}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
          >
            {showAll ? "Alleen openstaand" : "Ook verzonden"}
          </Link>
          <Link
            href="/beheer"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
          >
            Terug
          </Link>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">
          Nog te verzenden {open.length > 0 && `(${open.length})`}
        </h2>
        {open.length === 0 ? (
          <p className="mt-4 rounded-lg border border-border bg-background p-6 text-muted">
            Elke betaalde bestelling heeft een verzendbericht gehad.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {open.map((entry) => (
              <li key={entry.reference}>
                <ShipmentCard entry={entry} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {showAll && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">
            Verzonden {sent.length > 0 && `(${sent.length})`}
          </h2>
          {sent.length === 0 ? (
            <p className="mt-4 rounded-lg border border-border bg-background p-6 text-muted">
              Er is nog geen verzendbericht verstuurd.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {sent.map((entry) => (
                <li key={entry.reference}>
                  <ShipmentCard entry={entry} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!showAll && shipments.length >= LIMIT && (
        <p className="mt-6 text-sm text-muted">
          Er staan er meer dan {LIMIT}; dit zijn de nieuwste.
        </p>
      )}
    </div>
  );
}

function ShipmentCard({ entry }: { entry: Shipment }) {
  const sentAt = entry.trackingSentAt ? new Date(entry.trackingSentAt) : null;
  const carrier = carrierName(entry.trackingCarrier);
  const label = entry.trackingCode ? trackingLabel(entry.trackingCode) : null;

  return (
    <article className="rounded-lg border border-border bg-background p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-mono font-semibold tabular-nums">
            {entry.reference}
          </p>
          <p className="text-sm text-muted">
            {entry.customerName} · {entry.email}
          </p>
        </div>
        <div className="text-end">
          <p className="text-lg font-semibold tabular-nums">
            {formatPriceCents(entry.totalGrossCents)}
          </p>
          <p className="text-sm text-muted">
            {entry.lineCount} {entry.lineCount === 1 ? "artikel" : "artikelen"}
            {entry.paidAt
              ? ` · betaald ${dateFormat.format(new Date(entry.paidAt))}`
              : ""}
          </p>
        </div>
      </div>

      {sentAt ? (
        <p className="mt-3 text-sm">
          <span className="font-medium">
            Bericht verstuurd {dateFormat.format(sentAt)}
          </span>
          <span className="text-muted">
            {carrier ? ` · ${carrier}` : ""}
            {label ? ` · ${label}` : entry.trackingCode ? " · eigen link" : ""}
          </span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Nog geen verzendbericht.
          {entry.trackingCode
            ? " De code staat er al, het bericht is nog niet aangekomen bij de klant."
            : ""}
        </p>
      )}

      <TrackingForm
        reference={entry.reference}
        postcode={entry.postcode}
        country={entry.country}
        current={entry.trackingCode}
        currentCarrier={entry.trackingCarrier}
        alreadySent={Boolean(sentAt)}
      />
    </article>
  );
}
