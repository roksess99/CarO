"use client";

import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import {
  modelsForMakeAction,
  yearsForModelAction,
} from "@/components/vehicle/catalog-actions";
import { saveVehicle } from "@/components/vehicle/use-vehicle";

/**
 * Auto kiezen zonder kenteken: merk, dan model, dan bouwjaar.
 *
 * Drie afhankelijke keuzelijsten in plaats van vrije invoer, omdat de
 * gekozen waarden exact moeten matchen met wat de RDW-registratie gebruikt.
 * Zo levert deze route dezelfde merk- en modelteksten op als een
 * kentekencheck, en zijn beide manieren onderling uitwisselbaar.
 */
export function VehiclePicker({
  makes,
  /** Sluit de drawer zodra er een auto gekozen is */
  onSelected,
}: {
  makes: string[];
  onSelected?: () => void;
}) {
  const t = useTranslations("vehicle");
  const baseId = useId();

  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [pending, startTransition] = useTransition();

  function chooseMake(value: string) {
    setMake(value);
    setModel("");
    setYear("");
    setModels([]);
    setYears([]);
    if (!value) return;
    startTransition(async () => setModels(await modelsForMakeAction(value)));
  }

  function chooseModel(value: string) {
    setModel(value);
    setYear("");
    setYears([]);
    if (!value) return;
    startTransition(async () => setYears(await yearsForModelAction(make, value)));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!make || !model) return;
    saveVehicle({
      source: "manual",
      brand: make.toUpperCase(),
      model: model.toUpperCase(),
      // Deze catalogus bevat alleen personenauto's; zie het oogstscript
      vehicleType: "Personenauto",
      firstAdmissionYear: year ? Number(year) : undefined,
    });
    onSelected?.();
  }

  // Genummerde stappen onder elkaar: de klant ziet in één oogopslag hoeveel
  // keuzes er nog volgen, en welke aan de beurt is.
  const steps = [
    {
      id: `${baseId}-make`,
      label: t("makeLabel"),
      value: make,
      onChange: chooseMake,
      options: makes.map(String),
      placeholder: t("chooseMake"),
      disabled: false,
    },
    {
      id: `${baseId}-model`,
      label: t("modelLabel"),
      value: model,
      onChange: chooseModel,
      options: models,
      placeholder: t("chooseModel"),
      disabled: models.length === 0,
    },
    {
      id: `${baseId}-year`,
      label: t("yearLabel"),
      value: year,
      onChange: setYear,
      options: years.map(String),
      placeholder: t("chooseYear"),
      disabled: years.length === 0,
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {steps.map((step, index) => {
        const active = !step.disabled && !step.value;
        return (
          <div
            key={step.id}
            className={`flex items-center gap-3 rounded-md border bg-background pr-1 pl-3 ${
              active ? "border-caro-orange" : "border-border"
            }`}
          >
            {/* Stapnummer: oranje vlak met inkt-tekst zodra de stap aan de
                beurt is, anders neutraal (BRAND.md-contrastregel). */}
            <span
              aria-hidden="true"
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                active
                  ? "bg-caro-orange text-caro-ink"
                  : "bg-surface text-muted"
              }`}
            >
              {index + 1}
            </span>
            <label htmlFor={step.id} className="sr-only">
              {step.label}
            </label>
            <select
              id={step.id}
              value={step.value}
              disabled={step.disabled}
              onChange={(event) => step.onChange(event.target.value)}
              // Geen bg-transparent: dan rendert de browser het uitklapmenu
              // met zijn eigen lichte achtergrond terwijl de tekstkleur van
              // het donkere thema wordt geërfd — grijs op wit, onleesbaar.
              // Een expliciete achtergrond laat color-scheme zijn werk doen.
              className="w-full min-w-0 bg-background py-3 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:text-muted"
            >
              {/* Ook de opties krijgen expliciete kleuren; browsers nemen die
                  van het <select> niet automatisch over in het popupvenster. */}
              <option value="" className="bg-background text-foreground">
                {step.placeholder}
              </option>
              {step.options.map((option) => (
                <option
                  key={option}
                  value={option}
                  className="bg-background text-foreground"
                >
                  {option}
                </option>
              ))}
            </select>
          </div>
        );
      })}

      <button
        type="submit"
        disabled={!make || !model || pending}
        className="!mt-4 w-full rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
      >
        {t("search")}
      </button>
    </form>
  );
}
