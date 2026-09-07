"use client";

import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";
import { SearchableSelect } from "@/components/searchable-select";
import {
  modelsForMakeAction,
  typesForModelAction,
  type VehicleTypeOption,
} from "@/components/vehicle/catalog-actions";
import { saveVehicle } from "@/components/vehicle/use-vehicle";

/**
 * Auto kiezen zonder kenteken: merk, dan model, dan uitvoering.
 *
 * De derde stap was eerst het bouwjaar, maar dat is niet genoeg om onderdelen
 * te kunnen tonen: een Golf uit 2015 heeft zes motorvarianten met
 * verschillende remmen. De uitvoering levert een TecDoc-`carId`, precies wat
 * de kentekenzoeker ook oplevert — beide routes komen dus op hetzelfde uit.
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
  const [type, setType] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [types, setTypes] = useState<VehicleTypeOption[]>([]);
  const [pending, startTransition] = useTransition();

  function chooseMake(value: string) {
    setMake(value);
    setModel("");
    setType("");
    setModels([]);
    setTypes([]);
    if (!value) return;
    startTransition(async () => setModels(await modelsForMakeAction(value)));
  }

  function chooseModel(value: string) {
    setModel(value);
    setType("");
    setTypes([]);
    if (!value) return;
    startTransition(async () => setTypes(await typesForModelAction(make, value)));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!make || !model) return;
    const chosen = types.find((option) => option.label === type);
    saveVehicle({
      source: "manual",
      brand: make,
      model,
      vehicleType: chosen?.bodyType ?? "Personenauto",
      fuel: chosen?.fuel,
      powerKw: chosen?.powerKw,
      engineCapacityCc: chosen?.engineCapacityCc,
      // Zonder carId werkt de onderdelencatalogus niet; die komt pas als de
      // klant ook een uitvoering kiest.
      carId: chosen?.carId,
      carName: chosen?.label,
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
      id: `${baseId}-type`,
      label: t("typeLabel"),
      value: type,
      onChange: setType,
      options: types.map((option) => option.label),
      placeholder: t("chooseType"),
      disabled: types.length === 0,
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {steps.map((step, index) => {
        const active = !step.disabled && !step.value;
        return (
          <SearchableSelect
            key={step.id}
            label={step.label}
            value={step.value}
            placeholder={step.placeholder}
            options={step.options}
            onChange={step.onChange}
            disabled={step.disabled}
            highlighted={active}
            leading={
              /* Stapnummer: oranje vlak met inkt-tekst zodra de stap aan de
                 beurt is, anders neutraal (BRAND.md-contrastregel). */
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
            }
          />
        );
      })}

      <button
        type="submit"
        disabled={!make || !model || !type || pending}
        className="!mt-4 w-full rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
      >
        {t("search")}
      </button>
    </form>
  );
}
