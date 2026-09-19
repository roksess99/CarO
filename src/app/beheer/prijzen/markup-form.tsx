"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { CategoryOptions } from "@/lib/admin/catalog-options";
import { PART_KINDS } from "@/lib/admin/part-kinds";
import type { ProductFamily } from "@/lib/catalog/families";
import { maxDiscountPercent } from "@/lib/prices/markup-math";
import { addPriceRule, type PriceRuleResult } from "./actions";

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

/** Een voorbeeldprijs, zodat het percentage een bedrag wordt */
const EXAMPLE_PURCHASE_CENTS = 5000;

const euro = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
});

export function MarkupForm({ categories }: { categories: CategoryOptions }) {
  const [state, action, pending] = useActionState<PriceRuleResult, FormData>(
    addPriceRule,
    undefined,
  );

  // Alles in state, om dezelfde reden als bij het kortingsformulier: React
  // maakt een formulier na een Server Action leeg, óók als die een fout
  // teruggaf, en keuzemenu's vallen dan terug op hun eerste optie.
  const [scope, setScope] = useState("family");
  const [family, setFamily] = useState<ProductFamily>("banden");
  const [target, setTarget] = useState("");
  const [markup, setMarkup] = useState("10");
  const [label, setLabel] = useState("");

  const options = categories[family];
  const categoryValue = options.some((option) => option.slug === target)
    ? target
    : (options[0]?.slug ?? "");
  const kindValue = PART_KINDS.some((kind) => kind.id === target)
    ? target
    : PART_KINDS[0].id;

  // Onderdelen kennen geen categorieregel (zie lib/prices/markup.ts); daar is
  // "soort onderdeel" voor in de plaats gekomen. Blijft de keuze staan terwijl
  // de beheerder van familie wisselt, dan wijst hij naar iets wat niet kan.
  const isParts = family === "onderdelen";
  const effectiveScope =
    scope === "category" && isParts
      ? "kind"
      : scope === "kind" && !isParts
        ? "category"
        : scope;

  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const set = (name: string, value: string) => {
      const field = form.elements.namedItem(name);
      if (field instanceof HTMLSelectElement) field.value = value;
    };
    set("scope", effectiveScope);
    set("family", family);
    if (effectiveScope === "category") set("target", categoryValue);
    if (effectiveScope === "kind") set("target", kindValue);
  }, [state, effectiveScope, family, categoryValue, kindValue]);

  // Wat het percentage betekent, in euro's. Een getal alleen zegt niets; dit
  // laat meteen zien dat 10% op een inkoop van € 50 een marge van € 5 is.
  const percent = Number(markup.replace(",", "."));
  const valid = Number.isFinite(percent) && percent >= 0;
  const sellNet = valid
    ? Math.round((EXAMPLE_PURCHASE_CENTS * (100 + percent)) / 100)
    : null;
  const sellGross = sellNet === null ? null : Math.round((sellNet * 121) / 100);

  return (
    <form ref={formRef} action={action} className="grid gap-4 sm:grid-cols-2">
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
          <option value="shop">De hele winkel</option>
          <option value="family">Eén productgroep</option>
          {isParts ? (
            <option value="kind">Eén soort onderdeel</option>
          ) : (
            <option value="category">Eén categorie</option>
          )}
          <option value="part">Eén artikel</option>
        </select>
      </div>

      <div>
        <label htmlFor="markup" className={labelClass}>
          Opslag op de inkoopprijs
        </label>
        <div className="flex items-center gap-2">
          <input
            id="markup"
            name="markup"
            inputMode="decimal"
            required
            value={markup}
            onChange={(event) => setMarkup(event.target.value)}
            className={`${inputClass} tabular-nums`}
          />
          <span aria-hidden="true" className="text-sm text-muted">
            %
          </span>
        </div>
      </div>

      {effectiveScope !== "shop" && (
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
      )}

      {effectiveScope === "category" && (
        <div>
          <label htmlFor="target-category" className={labelClass}>
            Categorie
          </label>
          <select
            id="target-category"
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

      {effectiveScope === "kind" && (
        <div>
          <label htmlFor="target-kind" className={labelClass}>
            Soort onderdeel
          </label>
          <select
            id="target-kind"
            name="target"
            value={kindValue}
            onChange={(event) => setTarget(event.target.value)}
            className={selectClass}
          >
            {PART_KINDS.map((kind) => (
              <option key={kind.id} value={kind.id}>
                {kind.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            Het soort staat op het artikel zelf, dus deze prijs geldt overal —
            ook bij zoeken en bij het afrekenen.
          </p>
        </div>
      )}

      {effectiveScope === "part" && (
        <div>
          <label htmlFor="target-part" className={labelClass}>
            Artikelnummer of productlink
          </label>
          <input
            id="target-part"
            name="target"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="1234567 of /nl/banden/auto-suv-1/…"
            className={inputClass}
          />
        </div>
      )}

      <div className="sm:col-span-2">
        <label htmlFor="label" className={labelClass}>
          Naam <span className="font-normal text-muted">(optioneel)</span>
        </label>
        <input
          id="label"
          name="label"
          maxLength={120}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Scherp op banden"
          className={inputClass}
        />
        <p className="mt-1 text-xs text-muted">
          Alleen voor jezelf; de klant ziet deze naam niet.
        </p>
      </div>

      {/* Het percentage omgerekend naar geld. Een getal alleen zegt niets, en
          juist bij deze knop is de afstand tussen "10" en de gevolgen groot. */}
      {sellGross !== null && (
        <div className="sm:col-span-2 rounded-lg border border-border bg-surface p-4 text-sm">
          <p>
            <span className="font-semibold">Rekenvoorbeeld.</span> Koopt de
            leverancier in voor{" "}
            <span className="tabular-nums">
              {euro.format(EXAMPLE_PURCHASE_CENTS / 100)}
            </span>
            , dan wordt de winkelprijs{" "}
            <span className="font-semibold tabular-nums">
              {euro.format(sellGross / 100)}
            </span>{" "}
            inclusief btw. Jouw marge is{" "}
            <span className="tabular-nums">
              {euro.format((sellNet! - EXAMPLE_PURCHASE_CENTS) / 100)}
            </span>{" "}
            vóór verzend- en betaalkosten.
          </p>
          <p className="mt-2 text-muted">
            Op deze artikelen kan daarna nog hoogstens{" "}
            <span className="tabular-nums">{maxDiscountPercent(percent)}%</span>{" "}
            korting, anders zou je onder de inkoopprijs verkopen.
          </p>
        </div>
      )}

      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-caro-orange px-5 py-2.5 font-semibold text-caro-ink disabled:opacity-60"
        >
          {pending ? "Bezig…" : "Prijs vastzetten"}
        </button>
        <span role="status" aria-live="polite" className="text-sm">
          {state && "error" in state && (
            <span className="text-danger">{state.error}</span>
          )}
          {state && "ok" in state && (
            <span className="text-muted">{state.ok}</span>
          )}
        </span>
      </div>
    </form>
  );
}
