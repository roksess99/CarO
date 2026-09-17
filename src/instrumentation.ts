/**
 * Wordt één keer aangeroepen als de server start.
 *
 * Hier hangt de klok van de prijsmeting aan. Dat is geen luxe: de wet vraagt
 * de laagste prijs van dertig dagen als "van"-prijs, en die dertig dagen
 * ontstaan alleen als er elke dag gemeten wordt (docs/DECISIONS.md #14).
 *
 * **Waarom in de server en niet in een cron-taak.** Het hostingpakket heeft
 * geen zichtbare taakplanner, en MySQL kan het niet: een trigger vuurt op een
 * wijziging in een tabel en een stored procedure alleen als iemand hem
 * aanroept — en geen van beide kan de API van de leverancier bevragen. Draait
 * er later alsnog een cron-taak, dan roept die `/api/jobs/prices` aan en
 * gebeurt er hier niets dubbel: de dag wordt in de database geclaimd.
 */

export async function register(): Promise<void> {
  // `register` draait in élke runtime; de database en het netwerk zijn er
  // alleen in Node. Zonder deze controle probeert de edge-variant het ook.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // In ontwikkeling niet: dan zou elke herstart van `next dev` de leverancier
  // gaan bevragen terwijl er niemand naar kijkt.
  if (process.env.NODE_ENV !== "production") return;

  const { startPriceClock } = await import("@/lib/prices/clock");
  startPriceClock();
}
