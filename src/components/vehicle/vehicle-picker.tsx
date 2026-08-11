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

  const select =
    "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:text-muted";

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`${baseId}-make`} className="mb-1.5 block text-sm font-medium">
            {t("makeLabel")}
          </label>
          <select
            id={`${baseId}-make`}
            value={make}
            onChange={(event) => chooseMake(event.target.value)}
            className={select}
          >
            <option value="">{t("choose")}</option>
            {makes.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${baseId}-model`} className="mb-1.5 block text-sm font-medium">
            {t("modelLabel")}
          </label>
          <select
            id={`${baseId}-model`}
            value={model}
            disabled={models.length === 0}
            onChange={(event) => chooseModel(event.target.value)}
            className={select}
          >
            <option value="">{make ? t("choose") : t("chooseMakeFirst")}</option>
            {models.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${baseId}-year`} className="mb-1.5 block text-sm font-medium">
            {t("yearLabel")}
          </label>
          <select
            id={`${baseId}-year`}
            value={year}
            disabled={years.length === 0}
            onChange={(event) => setYear(event.target.value)}
            className={select}
          >
            <option value="">{model ? t("choose") : t("chooseModelFirst")}</option>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={!make || !model || pending}
        className="mt-4 w-full rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted sm:w-auto"
      >
        {t("searchForMyCar")}
      </button>
    </form>
  );
}
