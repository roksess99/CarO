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
 *
 * **Eén veld tegelijk.** De volgende stap verschijnt pas als de vorige een
 * antwoord heeft. Drie keuzelijsten tegelijk tonen waarvan er twee grijs zijn
 * leest als een formulier dat je moet invullen; één veld leest als een vraag
 * die je moet beantwoorden. Bovendien haalt het de aandacht weg bij de
 * kentekenzoeker erboven, en dat is de snellere weg.
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
  const tCommon = useTranslations("common");
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

  const steps = [
    {
      id: `${baseId}-make`,
      label: t("makeLabel"),
      value: make,
      onChange: chooseMake,
      options: makes.map(String),
      placeholder: t("chooseMake"),
    },
    {
      id: `${baseId}-model`,
      label: t("modelLabel"),
      value: model,
      onChange: chooseModel,
      options: models,
      placeholder: t("chooseModel"),
    },
    {
      id: `${baseId}-type`,
      label: t("typeLabel"),
      value: type,
      onChange: setType,
      options: types.map((option) => option.label),
      placeholder: t("chooseType"),
    },
  ];

  // Stap 1 staat er altijd; stap 2 zodra er een merk is, stap 3 zodra er een
  // model is. Meer dan dat heeft de klant nog niet nodig.
  const visibleCount = make ? (model ? 3 : 2) : 1;

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* aria-live: een schermlezer moet horen dát er een stap bij komt, want
          visueel is dat het enige wat er gebeurt na een keuze. */}
      <div aria-live="polite" className="space-y-2">
        {steps.slice(0, visibleCount).map((step, index) => {
          const last = index === visibleCount - 1;
          // Alleen de laatste stap kan aan het laden zijn: de vorige heeft
          // per definitie al een antwoord.
          const loading = last && pending && step.options.length === 0;

          if (last && !loading && step.options.length === 0) {
            // Een merk zonder modellen (of een model zonder uitvoeringen)
            // hoort niet voor te komen, maar een lege keuzelijst die niets
            // zegt is het slechtste antwoord dat we kunnen geven.
            return (
              <p
                key={step.id}
                className="rounded-md border border-border bg-surface px-3 py-3 text-sm text-muted"
              >
                {t("noOptions")}
              </p>
            );
          }

          return (
            <SearchableSelect
              key={step.id}
              label={step.label}
              value={step.value}
              placeholder={loading ? tCommon("loading") : step.placeholder}
              options={step.options}
              onChange={step.onChange}
              disabled={loading}
              highlighted={last && !step.value}
              leading={
                /* Stapnummer: oranje vlak met inkt-tekst zodra de stap aan de
                   beurt is, anders neutraal (BRAND.md-contrastregel). */
                <span
                  aria-hidden="true"
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                    last && !step.value
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
      </div>

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
