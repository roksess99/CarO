import type { Translator } from "./filter-values";
import type { FilterGroup } from "./types";

/**
 * Kop boven een filtergroep. De API levert het label in de taal van het
 * leveranciersplatform — "Merk" op nl, "Marke" op de — dus voor een Engelse
 * of Arabische bezoeker klopt dat niet. Kennen we de groep, dan winnen onze
 * eigen vertalingen; kennen we hem niet, dan is het leverancierslabel nog
 * altijd beter dan een lege kop.
 */
export function filterGroupLabel(group: FilterGroup, t: Translator): string {
  return group.labelKey ? t(`labels.${group.labelKey}`) : group.label;
}
