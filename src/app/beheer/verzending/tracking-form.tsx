"use client";

import { useActionState, useState } from "react";
import {
  CARRIERS,
  TRACKING_MAX,
  trackingUrl,
  type CarrierId,
} from "@/lib/orders/tracking";
import { sendTracking, type TrackingResult } from "./actions";

/**
 * De invoer per bestelling: vervoerder, code of link, versturen.
 *
 * **De link die de klant krijgt staat eronder terwijl je typt.** Dat is de
 * hele reden dat dit een clientcomponent is: `tracking.ts` bouwt dezelfde
 * link als de server straks in de mail zet, dus de beheerder ziet vóór het
 * versturen of hij uitkomt bij zijn vervoerder. Een code met een tikfout
 * levert anders een klant op die op een "zending niet gevonden" klikt, en dat
 * merkt hier niemand.
 *
 * Dat `tracking.ts` hier geïmporteerd mag worden is geen toeval: dat bestand
 * praat geen database aan (@docs/DECISIONS.md #17).
 *
 * Een tweede bericht over dezelfde bestelling vraagt een bevestiging. Een
 * mail aan een klant is niet terug te draaien, en twee berichten met twee
 * codes is verwarrender dan geen bericht.
 */
export function TrackingForm({
  reference,
  postcode,
  country,
  current,
  currentCarrier,
  alreadySent,
}: {
  reference: string;
  postcode: string;
  country: string;
  current: string | null;
  currentCarrier: string | null;
  alreadySent: boolean;
}) {
  const [state, action, pending] = useActionState<TrackingResult, FormData>(
    sendTracking,
    undefined,
  );
  const [carrier, setCarrier] = useState<CarrierId>(() =>
    CARRIERS.some((entry) => entry.id === currentCarrier)
      ? (currentCarrier as CarrierId)
      : "postnl",
  );
  const [code, setCode] = useState(current ?? "");
  const [confirming, setConfirming] = useState(false);

  const preview = code.trim()
    ? trackingUrl({ code: code.trim(), carrier, address: { postcode, country } })
    : null;

  const fieldId = `code-${reference}`;
  const hintId = `hint-${reference}`;

  return (
    <form action={action} className="mt-4 border-t border-border pt-4">
      <input type="hidden" name="reference" value={reference} />
      {/* Een tweede bericht gaat alleen de deur uit als de knop twee keer is
          aangeklikt. De server weigert hem zonder dit veld. */}
      {confirming && <input type="hidden" name="confirm" value="opnieuw" />}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-muted">Vervoerder</span>
          <select
            name="carrier"
            value={carrier}
            onChange={(event) => setCarrier(event.target.value as CarrierId)}
            className="mt-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          >
            {CARRIERS.map((entry) => (
              <option
                key={entry.id}
                value={entry.id}
                className="bg-background text-foreground"
              >
                {entry.name}
              </option>
            ))}
          </select>
        </label>

        <label className="min-w-64 flex-1 text-sm">
          <span className="block text-muted">Track &amp; trace</span>
          <input
            id={fieldId}
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            maxLength={TRACKING_MAX}
            required
            placeholder="Code of de hele link van de vervoerder"
            aria-describedby={hintId}
            className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm tabular-nums"
          />
        </label>

        {/* Twee knoppen en geen `onClick` op de verzendknop: een reactie op een
            klik komt pas ná het versturen van het formulier, dus het veld
            `confirm` zou er bij die eerste klik nog niet staan. */}
        {alreadySent && !confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface"
          >
            Opnieuw versturen
          </button>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-caro-orange px-4 py-2 text-sm font-semibold text-caro-ink disabled:opacity-60"
          >
            {pending
              ? "Bezig…"
              : alreadySent
                ? "Ja, nog een bericht"
                : "Versturen"}
          </button>
        )}
      </div>

      <p id={hintId} className="mt-2 text-sm text-muted">
        {preview ? (
          <>
            De klant krijgt deze knop:{" "}
            <a
              href={preview}
              target="_blank"
              rel="noreferrer"
              className="break-all underline underline-offset-4 hover:text-foreground"
            >
              {preview}
            </a>
          </>
        ) : code.trim() ? (
          "Hier valt geen volglink van te maken; de klant krijgt alleen de code. Plak anders de hele link uit de mail van de vervoerder."
        ) : (
          "Plak de link uit de mail van de vervoerder, of alleen de barcode — dan maken we de link zelf."
        )}
      </p>

      <p role="status" aria-live="polite" className="mt-2 text-sm">
        {state && "error" in state && (
          <span className="text-danger">{state.error}</span>
        )}
        {state && "ok" in state && (
          <span className="font-medium">{state.ok}</span>
        )}
      </p>
    </form>
  );
}
