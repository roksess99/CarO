import { getTranslations } from "next-intl/server";
import type { FilterGroup } from "@/lib/catalog/types";
import {
  formatWheelSelection,
  hasWheelSelection,
  wheelOptions,
  type WheelSelection,
} from "@/lib/catalog/wheel-size";

/**
 * Velgmaat kiezen: diameter, breedte en steekcirkel.
 *
 * Dezelfde opzet als de bandenmaatkiezer — een gewoon GET-formulier, keuze in
 * de URL, werkt zonder JavaScript — maar de bron verschilt. Bij banden zijn de
 * maten een vaste lijst; hier komen ze uit het filterblok van de categorie,
 * want alleen de leverancier weet welke staalvelgen hij op voorraad heeft.
 *
 * Waarom dit naast de gewone zijbalkfilters staat: daarin heet dit
 * "Velgmaat" met 59 opties als "5,5j*14" en "Velgverbinding" met 88 opties
 * als "4*100*54". Dat zijn leveranciersteksten, geen keuze die een klant
 * maakt. Hier kiest hij wat op zijn auto staat — 15 inch, 5 gaten op 112 —
 * en vertaalt `wheelSelectionToFilters()` dat terug naar precies die teksten.
 */
export async function WheelSizePicker({
  action,
  groups,
  selection,
}: {
  /** Pad waar het formulier naartoe gaat; de pagina leest de query */
  action: string;
  groups: readonly FilterGroup[];
  selection: WheelSelection;
}) {
  const t = await getTranslations("wheels");
  const options = wheelOptions(groups);

  // Zonder maten valt er niets te kiezen. Dat gebeurt als de leverancier het
  // filterblok niet meelevert; dan blijft de gewone zijbalk over.
  if (options.diameters.length === 0 && options.bolts.length === 0) return null;

  // Expliciete achtergrond- en tekstkleur, anders rendert de browser het
  // uitklapmenu met eigen kleuren (.claude/rules/frontend.md).
  const selectClass =
    "h-12 w-full rounded-md border border-border bg-background px-3 font-semibold text-foreground tabular-nums";
  const labelClass = "mb-1 block text-xs font-semibold text-muted";

  const number = (value: number) => String(value).replace(".", ",");

  return (
    <section className="mt-8 rounded-xl border border-border p-4 md:p-6">
      <h2 className="text-lg">{t("pickerTitle")}</h2>
      <p className="mt-1 text-sm text-muted">{t("pickerIntro")}</p>

      <form action={action} className="mt-4">
        <div className="grid gap-2 sm:max-w-2xl sm:grid-cols-3">
          <div>
            <label htmlFor="diameter" className={labelClass}>
              {t("diameter")}
            </label>
            <select
              id="diameter"
              name="diameter"
              defaultValue={selection.diameter ?? ""}
              className={selectClass}
            >
              <option value="" className="bg-background text-foreground">
                –
              </option>
              {options.diameters.map((value) => (
                <option
                  key={value}
                  value={number(value)}
                  className="bg-background text-foreground"
                >
                  {number(value)}″
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="breedte" className={labelClass}>
              {t("width")}
            </label>
            <select
              id="breedte"
              name="breedte"
              defaultValue={selection.width ?? ""}
              className={selectClass}
            >
              <option value="" className="bg-background text-foreground">
                –
              </option>
              {options.widths.map((value) => (
                <option
                  key={value}
                  value={number(value)}
                  className="bg-background text-foreground"
                >
                  {number(value)}J
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="steekcirkel" className={labelClass}>
              {t("bolts")}
            </label>
            <select
              id="steekcirkel"
              name="steekcirkel"
              defaultValue={selection.bolts ?? ""}
              className={selectClass}
            >
              <option value="" className="bg-background text-foreground">
                –
              </option>
              {options.bolts.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-background text-foreground"
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="h-12 rounded-md bg-caro-orange px-6 font-semibold text-caro-ink"
          >
            {t("submit")}
          </button>
          {hasWheelSelection(selection) && (
            <>
              <span className="text-sm text-muted">
                {t("current", { size: formatWheelSelection(selection) })}
              </span>
              {/* Wissen is een gewone link naar dezelfde pagina zonder query;
                  geen knop met state, net als bij de filters. */}
              <a
                href={action}
                className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
              >
                {t("clear")}
              </a>
            </>
          )}
        </div>
      </form>

      <p className="mt-4 text-sm text-muted">{t("pickerHint")}</p>
    </section>
  );
}
