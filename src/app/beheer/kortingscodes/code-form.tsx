"use client";

import { useActionState, useState } from "react";
import { addCode, type CodeResult } from "./actions";

const labelClass = "mb-1 block text-sm font-medium";
const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground";

/** Vandaag en over een maand, als voorzet voor de datumvelden */
function today(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function CodeForm() {
  const [state, action, pending] = useActionState<CodeResult, FormData>(
    addCode,
    undefined,
  );

  // Alle velden in state: React maakt een formulier na een Server Action leeg,
  // ook bij een foutmelding — dan stond de beheerder alles opnieuw in te tikken.
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("10");
  const [minSpend, setMinSpend] = useState("0");
  const [maxUses, setMaxUses] = useState("");
  const [startsAt, setStartsAt] = useState(today());
  const [endsAt, setEndsAt] = useState(today(30));
  const [once, setOnce] = useState(true);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="code" className={labelClass}>
          De code
        </label>
        <input
          id="code"
          name="code"
          required
          maxLength={32}
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="WINTER10"
          className={`${inputClass} uppercase`}
        />
        <p className="mt-1 text-xs text-muted">
          Letters en cijfers. Hoofdletters maken niet uit voor de klant.
        </p>
      </div>

      <div>
        <label htmlFor="percent" className={labelClass}>
          Korting in procenten
        </label>
        <input
          id="percent"
          name="percent"
          type="number"
          min={1}
          max={70}
          required
          value={percent}
          onChange={(event) => setPercent(event.target.value)}
          className={`${inputClass} tabular-nums`}
        />
      </div>

      <div>
        <label htmlFor="minSpend" className={labelClass}>
          Minimaal bestedingsbedrag
        </label>
        <input
          id="minSpend"
          name="minSpend"
          inputMode="decimal"
          value={minSpend}
          onChange={(event) => setMinSpend(event.target.value)}
          className={`${inputClass} tabular-nums`}
        />
        <p className="mt-1 text-xs text-muted">
          In euro&apos;s, bijvoorbeeld 50 of 49,95. Verzendkosten tellen niet
          mee. 0 is geen minimum.
        </p>
      </div>

      <div>
        <label htmlFor="maxUses" className={labelClass}>
          Maximaal aantal keer
        </label>
        <input
          id="maxUses"
          name="maxUses"
          inputMode="numeric"
          value={maxUses}
          onChange={(event) => setMaxUses(event.target.value)}
          placeholder="onbeperkt"
          className={`${inputClass} tabular-nums`}
        />
        <p className="mt-1 text-xs text-muted">Leeg laten is onbeperkt.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="startsAt" className={labelClass}>
            Van
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="date"
            required
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className={`${inputClass} tabular-nums`}
          />
        </div>
        <div>
          <label htmlFor="endsAt" className={labelClass}>
            Tot en met
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="date"
            required
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className={`${inputClass} tabular-nums`}
          />
        </div>
      </div>

      <div className="flex items-start gap-3">
        <input
          id="oncePerCustomer"
          name="oncePerCustomer"
          type="checkbox"
          checked={once}
          onChange={(event) => setOnce(event.target.checked)}
          className="mt-1 size-4"
        />
        <label htmlFor="oncePerCustomer" className="text-sm">
          Eén keer per klant
          <span className="mt-0.5 block text-xs text-muted">
            Gecontroleerd op het mailadres van de bestelling.
          </span>
        </label>
      </div>

      <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-caro-orange px-5 py-2.5 font-semibold text-caro-ink disabled:opacity-60"
        >
          {pending ? "Bezig…" : "Code aanmaken"}
        </button>
        <div role="status" aria-live="polite">
          {state && "error" in state && (
            <span className="text-sm text-danger">{state.error}</span>
          )}
          {state && "ok" in state && (
            <span className="text-sm text-muted">{state.ok}</span>
          )}
        </div>
      </div>
    </form>
  );
}
