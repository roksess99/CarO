"use client";

import { useActionState } from "react";
import { measureNow, type MeasureResult } from "./actions";

const stamp = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Loopt de prijsmeting nog?
 *
 * Deze vraag hoort in beeld te staan en niet in een logbestand: zonder die
 * dagelijkse meting mag er nooit een doorgestreepte "van"-prijs bij een actie,
 * en een klok die stilstaat merk je anders pas over een maand.
 */
export function PriceClock({
  lastRun,
  parts,
  days,
  stale,
}: {
  lastRun: { startedAt: string; finishedAt: string | null } | null;
  parts: number;
  days: number;
  /** Meer dan anderhalve dag geleden gemeten: er is een nacht overgeslagen */
  stale: boolean;
}) {
  const [state, action, pending] = useActionState<MeasureResult, FormData>(
    measureNow,
    undefined,
  );

  // De klok staat op de server; hier alleen tonen wat die zei. Een `Date.now()`
  // in een render maakt het onderdeel onvoorspelbaar (en de linter terecht boos).
  const laatste = lastRun ? new Date(lastRun.startedAt) : null;

  return (
    <div
      className={`mt-4 max-w-prose rounded-lg border border-border bg-background p-4 ${
        stale ? "border-s-4 border-s-danger" : ""
      }`}
    >
      <p className="text-sm">
        <span className="font-semibold">Prijsmeting.</span>{" "}
        {laatste ? (
          <>
            Laatst gedraaid op {stamp.format(laatste)}
            {lastRun?.finishedAt ? "" : " (nog niet afgerond)"}. Er staan{" "}
            <span className="tabular-nums">{parts}</span> artikelen in de
            geschiedenis, over <span className="tabular-nums">{days}</span>{" "}
            {days === 1 ? "dag" : "dagen"}.
          </>
        ) : (
          <>Nog nooit gedraaid — er is dus nog geen prijsgeschiedenis.</>
        )}
      </p>

      <p className="mt-2 text-sm text-muted">
        Een doorgestreepte &ldquo;van&rdquo;-prijs verschijnt pas als een
        artikel dertig dagen gemeten is. Plan een actie dus een maand vooruit;
        begin je hem vandaag, dan ziet de klant alleen het percentage.
      </p>

      <form action={action} className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface disabled:opacity-60"
        >
          {pending ? "Bezig, dit duurt even…" : "Nu meten"}
        </button>
        <span role="status" aria-live="polite" className="text-sm">
          {state && "error" in state && (
            <span className="text-danger">{state.error}</span>
          )}
          {state && "ok" in state && (
            <span className="text-muted">{state.ok}</span>
          )}
        </span>
      </form>
    </div>
  );
}
