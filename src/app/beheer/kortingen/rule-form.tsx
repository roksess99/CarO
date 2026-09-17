"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { CategoryOptions } from "@/lib/admin/catalog-options";
import type { ProductFamily } from "@/lib/catalog/families";
import { addRule, type RuleResult } from "./actions";

const labelClass = "mb-1 block text-sm font-medium";
const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground";
const selectClass = `${inputClass} bg-background text-foreground`;

const FAMILIES: ReadonlyArray<{ value: ProductFamily; label: string }> = [
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

export function RuleForm({ categories }: { categories: CategoryOptions }) {
  const [state, action, pending] = useActionState<RuleResult, FormData>(
    addRule,
    undefined,
  );
  // Alle velden staan in state, ook de tekstvelden. React maakt een formulier
  // na een Server Action namelijk leeg, óók als die action een fout teruggaf —
  // dan stond de beheerder opnieuw alles in te tikken, en het keuzemenu sprong
  // terug naar "de hele productgroep" terwijl het artikelveld bleef staan.
  const [family, setFamily] = useState<ProductFamily>("banden");
  const [scope, setScope] = useState("family");
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");
  const [percent, setPercent] = useState("10");
  const [startsAt, setStartsAt] = useState(today());
  const [endsAt, setEndsAt] = useState(today(7));

  const options = categories[family];
  // Bij een categoriekorting moet er iets gekozen staan; anders stuurt het
  // formulier een lege waarde mee omdat de browser de eerste optie wél toont.
  const categoryValue =
    options.some((option) => option.slug === target) ? target : (options[0]?.slug ?? "");
  // Onderdelen kennen geen losse categoriekorting (zie catalog-options.ts).
  // Staat die keuze nog open terwijl de beheerder naar onderdelen wisselt,
  // dan valt hij terug op de hele familie in plaats van stil te blijven staan
  // op een keuze die niet te maken is.
  const canPickCategory = options.length > 0;
  const effectiveScope = scope === "category" && !canPickCategory ? "family" : scope;

  // React maakt het formulier leeg zodra een Server Action klaar is, ook bij
  // een foutmelding. Tekstvelden herstelt het daarbij naar wat erin stond,
  // maar een keuzemenu valt terug op de optie die bij het laden gekozen was:
  // na een mislukte poging stond er "de hele productgroep" terwijl het
  // artikelveld nog open stond. Dan liegt het scherm over wat er verstuurd
  // wordt, dus zetten we de menu's na elk antwoord terug op de waarde die we
  // zelf bijhouden. (GEMETEN 2026-09-17 in Chrome.)
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const set = (name: string, value: string) => {
      const field = form.elements.namedItem(name);
      if (field instanceof HTMLSelectElement) field.value = value;
    };
    set("family", family);
    set("scope", effectiveScope);
    set("target", categoryValue);
  }, [state, family, effectiveScope, categoryValue]);

  return (
    <form ref={formRef} action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="label" className={labelClass}>
          Naam van de actie
        </label>
        <input
          id="label"
          name="label"
          required
          maxLength={120}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Winteractie remschijven"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-muted">
          Alleen voor jezelf; de klant ziet deze naam niet.
        </p>
      </div>

      <div>
        <label htmlFor="family" className={labelClass}>
          Productgroep
        </label>
        <select
          id="family"
          name="family"
          value={family}
          onChange={(event) => {
            setFamily(event.target.value as ProductFamily);
            // Anders blijft een categorie van de vorige productgroep staan
            setTarget("");
          }}
          className={selectClass}
        >
          {FAMILIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="scope" className={labelClass}>
          Geldt op
        </label>
        <select
          id="scope"
          name="scope"
          value={effectiveScope}
          onChange={(event) => {
            setScope(event.target.value);
            setTarget("");
          }}
          className={selectClass}
        >
          <option value="family">De hele productgroep</option>
          {canPickCategory && <option value="category">Eén categorie</option>}
          <option value="part">Eén artikel</option>
        </select>
        {!canPickCategory && (
          <p className="mt-1 text-xs text-muted">
            Bij onderdelen kan een korting niet op een categorie: die
            categorieën hangen aan een auto, en een artikel dat via zoeken
            binnenkomt heeft er geen.
          </p>
        )}
      </div>

      {effectiveScope === "category" && (
        <div className="sm:col-span-2">
          <label htmlFor="target" className={labelClass}>
            Welke categorie
          </label>
          <select
            id="target"
            name="target"
            value={categoryValue}
            onChange={(event) => setTarget(event.target.value)}
            className={selectClass}
          >
            {options.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {effectiveScope === "part" && (
        <div className="sm:col-span-2">
          <label htmlFor="target" className={labelClass}>
            Welk artikel
          </label>
          <input
            id="target"
            name="target"
            required
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className={inputClass}
            placeholder="818336 of de link van de productpagina"
          />
          <p className="mt-1 text-xs text-muted">
            Het artikelnummer, of plak gewoon de link van de productpagina. Ik
            zoek het artikel op en noem de naam terug, zodat je ziet dat je de
            goede te pakken hebt.
          </p>
        </div>
      )}

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
          value={percent}
          onChange={(event) => setPercent(event.target.value)}
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
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
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
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
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
            <span className="text-sm text-muted">{state.ok}</span>
          )}
        </div>
      </div>
    </form>
  );
}
