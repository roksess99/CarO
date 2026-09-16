"use client";

import { useActionState, useState } from "react";
import { addRule, type RuleResult } from "./actions";

const labelClass = "mb-1 block text-sm font-medium";
const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground";

const FAMILIES = [
  { value: "onderdelen", label: "Onderdelen" },
  { value: "banden", label: "Banden" },
  { value: "velgen", label: "Velgen" },
  { value: "toebehoren", label: "Toebehoren" },
];

/** Vandaag en over een week, als voorzet voor de datumvelden */
function today(offsetDays = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function RuleForm() {
  const [state, action, pending] = useActionState<RuleResult, FormData>(
    addRule,
    undefined,
  );
  const [scope, setScope] = useState("family");

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="label" className={labelClass}>
          Naam van de actie
        </label>
        <input
          id="label"
          name="label"
          required
          maxLength={120}
          placeholder="Winteractie remschijven"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-muted">
          Alleen voor jezelf; de klant ziet deze naam niet.
        </p>
      </div>

      <div>
        <label htmlFor="scope" className={labelClass}>
          Geldt op
        </label>
        <select
          id="scope"
          name="scope"
          value={scope}
          onChange={(event) => setScope(event.target.value)}
          className={`${inputClass} bg-background text-foreground`}
        >
          <option value="family">Een hele productgroep</option>
          <option value="category">Eén categorie</option>
          <option value="part">Eén artikel</option>
        </select>
      </div>

      <div>
        <label htmlFor="target" className={labelClass}>
          {scope === "family"
            ? "Welke productgroep"
            : scope === "category"
              ? "Welke categorie"
              : "Welk artikel"}
        </label>
        {scope === "family" ? (
          <select
            id="target"
            name="target"
            className={`${inputClass} bg-background text-foreground`}
          >
            {FAMILIES.map((family) => (
              <option key={family.value} value={family.value}>
                {family.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            id="target"
            name="target"
            required
            className={inputClass}
            placeholder={scope === "category" ? "auto-suv-1" : "818336"}
          />
        )}
        {scope !== "family" && (
          <p className="mt-1 text-xs text-muted">
            {scope === "category"
              ? "Het laatste stuk van de categorie-URL, bijvoorbeeld auto-suv-1."
              : "Het artikelnummer zoals het op de productpagina staat."}
          </p>
        )}
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
          defaultValue={10}
          required
          className={`${inputClass} tabular-nums`}
        />
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
            defaultValue={today()}
            required
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
            defaultValue={today(7)}
            required
            className={`${inputClass} tabular-nums`}
          />
        </div>
      </div>

      <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-caro-orange px-5 py-2.5 font-semibold text-caro-ink disabled:opacity-60"
        >
          {pending ? "Bezig…" : "Actie aanzetten"}
        </button>
        <div role="status" aria-live="polite">
          {state && "error" in state && (
            <span className="text-sm text-danger">{state.error}</span>
          )}
          {state && "ok" in state && (
            <span className="text-sm text-muted">De actie staat aan.</span>
          )}
        </div>
      </div>
    </form>
  );
}
