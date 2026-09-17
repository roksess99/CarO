"use client";

import { useSyncExternalStore } from "react";

/**
 * De ingevoerde kortingscode, zolang de klant op de checkout is.
 *
 * **Alleen de code en het percentage**, nooit het kortingsbedrag. Dat wordt
 * overal opnieuw uitgerekend uit de wagen zoals hij op dát moment is: legt de
 * klant er na het invoeren nog een artikel bij, dan klopt een onthouden bedrag
 * niet meer. Het bedrag dat écht telt komt sowieso van de server, vlak voor de
 * betaling (CLAUDE.md: een bedrag dat naar een betaaldienst gaat komt nooit uit
 * de browser).
 *
 * Bewust niet in localStorage: een code die morgen nog in het veld staat
 * terwijl hij is afgelopen, belooft iets wat de checkout dan weigert.
 */

export interface AppliedCode {
  code: string;
  percent: number;
}

let applied: AppliedCode | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): AppliedCode | null {
  return applied;
}

export function useAppliedCode(): AppliedCode | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

export function applyCode(value: AppliedCode | null): void {
  applied = value;
  for (const listener of listeners) listener();
}
