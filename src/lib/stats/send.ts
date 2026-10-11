"use client";

import type { StatMetric } from "./types";

/** Eén gebeurtenis: een naam uit de vaste lijst, met een kort label erbij */
export interface StatEvent {
  e: StatMetric;
  l?: string;
}

/**
 * Tellingen naar onze eigen server sturen.
 *
 * `sendBeacon` en niet `fetch`: de browser mag dit achtergrondverzoek afmaken
 * nadat de pagina al weg is, en het houdt niets op. Mislukt het, dan is er een
 * telling kwijt en verder niets — er wordt niet opnieuw geprobeerd en er
 * verschijnt geen fout. Tellen mag nooit in de weg lopen van winkelen.
 *
 * **Meerdere gebeurtenissen gaan in één verzoek.** De eerste pagina van een
 * bezoek levert er drie op (weergave, bezoek, herkomst); dat waren drie
 * aparte POSTs en dus ook drie database-schrijfacties, voor gegevens die op
 * hetzelfde moment ontstaan. Nu is het er één.
 *
 * Dat is geen micro-optimalisatie van de browserkant — `sendBeacon` kost daar
 * bijna niets. Het scheelt aan **onze** kant: drie keer de snelheidsrem
 * passeren, drie keer een verbinding uit de database-pool en drie
 * `INSERT … ON DUPLICATE KEY UPDATE` waar er één volstaat. Op de drukste
 * pagina van de winkel telt dat mee.
 */
export function countStats(events: readonly StatEvent[]): void {
  if (typeof navigator === "undefined" || events.length === 0) return;
  try {
    const body = JSON.stringify(events);
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/stats", blob)) {
      void fetch("/api/stats", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Stil: een teller is geen reden om iets in de winkel te laten merken
  }
}

/** Eén losse telling; blijft bestaan omdat de meeste plekken er maar één hebben */
export function countStat(metric: StatMetric, label?: string): void {
  countStats([label ? { e: metric, l: label } : { e: metric }]);
}
