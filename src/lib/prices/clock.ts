import { runPriceSnapshot } from "./snapshot";

/**
 * De klok achter de prijsmeting.
 *
 * Elk uur kijken of de meting van vandaag al gedaan is. Niet één keer per
 * etmaal, want dan bepaalt het toevallige moment van de laatste serverherstart
 * wanneer hij draait — en een dag overslaan kost een maand wachten op de
 * "van"-prijs.
 *
 * Het echte slot zit in de database (`job_runs`), niet hier. Deze klok mag dus
 * gerust in drie processen tegelijk lopen: er claimt er precies één de dag.
 */

/** Elk uur kijken. De meting zelf draait hooguit één keer per dag. */
const TICK_MS = 60 * 60_000;

/** Even wachten na het opstarten: eerst moet de winkel bezoekers kunnen bedienen */
const FIRST_TICK_MS = 5 * 60_000;

let started = false;

export function startPriceClock(): void {
  // In productie draait `register()` één keer, maar een hot reload of een
  // tweede import mag geen tweede timer opleveren.
  if (started) return;
  started = true;

  const tick = () => {
    void runPriceSnapshot()
      .then((result) => {
        if (result.skipped) return;
        console.log(
          `Prijsmeting: ${result.parts} artikelen uit ${result.rules} acties, ${result.requests} verzoeken, ${Math.round(result.ms / 1000)} s`,
        );
        for (const error of result.errors) console.error("Prijsmeting:", error);
      })
      .catch((error: unknown) => {
        // Nooit de server omtrekken om een meting: de winkel moet blijven
        // verkopen, ook als de leverancier of de database even wegvalt.
        console.error(
          "Prijsmeting mislukt:",
          error instanceof Error ? error.message : "onbekende fout",
        );
      });
  };

  const first = setTimeout(() => {
    tick();
    const repeat = setInterval(tick, TICK_MS);
    // Houdt het proces niet wakker als Node verder niets te doen heeft
    repeat.unref?.();
  }, FIRST_TICK_MS);
  first.unref?.();
}
