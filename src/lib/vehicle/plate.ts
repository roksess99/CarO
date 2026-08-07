// Kentekens: gebruikers typen "RZ-874-H", "rz 874 h" of "rz874h".
// De API verwacht de vorm zonder scheidingstekens: /voertuiggegevens/RZ874H

/** Streepjes, spaties en punten eruit, hoofdletters erin */
export function normalizePlate(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Alle Nederlandse sidecodes hebben 6 tekens (letters/cijfers).
 * Bewust geen sidecode-per-sidecode regex: die lijst verandert en een
 * te strenge check blokkeert geldige kentekens. De API is de echte rechter.
 */
export function isValidPlate(normalized: string): boolean {
  return /^[A-Z0-9]{6}$/.test(normalized);
}
