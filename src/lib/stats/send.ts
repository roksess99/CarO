"use client";

import type { StatMetric } from "./types";

/**
 * Eén telling naar onze eigen server sturen.
 *
 * `sendBeacon` en niet `fetch`: de browser mag dit achtergrondverzoek afmaken
 * nadat de pagina al weg is, en het houdt niets op. Mislukt het, dan is er een
 * telling kwijt en verder niets — er wordt niet opnieuw geprobeerd en er
 * verschijnt geen fout. Tellen mag nooit in de weg lopen van winkelen.
 */
export function countStat(metric: StatMetric, label?: string): void {
  if (typeof navigator === "undefined") return;
  try {
    const body = JSON.stringify({ e: metric, ...(label ? { l: label } : {}) });
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
