/**
 * Wie in het beheerpaneel wat mag.
 *
 * **Dit bestand is de enige waarheid.** Staat een recht hier niet, dan bestaat
 * het niet; een pagina die zelf gaat redeneren over rollen loopt onherroepelijk
 * uit de pas met de rest. Praat geen database aan, zodat ook een client
 * component hem mag importeren (@docs/DECISIONS.md #17 — `markup.ts` trok de
 * MySQL-driver de browserbundel in en de hele pagina gaf HTTP 500).
 *
 * Drie rollen en geen vinkjes per persoon, gekozen door de eigenaar op
 * 2026-09-21. Vinkjes klinken flexibeler maar leveren combinaties op die
 * niemand nodig heeft en die niemand test — "mag prijzen wijzigen maar geen
 * facturen zien" is geen functie, dat is een ongeluk.
 */

export const ROLES = ["eigenaar", "boekhouder", "marketing"] as const;
export type Role = (typeof ROLES)[number];

/**
 * Eén recht per scherm dat iets te verbergen heeft. Grover dan per knop, en
 * dat is de bedoeling: wie de kortingenpagina mag openen mag daar ook een
 * korting aanzetten, anders is het scherm zinloos.
 */
export type Permission =
  /** Bestellingen met naam, adres en mailadres van de klant */
  | "bestellingen"
  /** Facturen, de PDF's en het omzetoverzicht */
  | "facturen"
  /** De verkoopprijs van het hele assortiment */
  | "prijzen"
  /** Acties en kortingscodes: geld weggeven */
  | "kortingen"
  /** Beoordelingen beantwoorden, verbergen en uitnodigingen sturen */
  | "beoordelingen"
  /** Mensen uitnodigen, rollen wijzigen, toegang intrekken */
  | "beheerders";

const ALL: ReadonlyArray<Permission> = [
  "bestellingen",
  "facturen",
  "prijzen",
  "kortingen",
  "beoordelingen",
  "beheerders",
];

/**
 * De matrix.
 *
 * Twee dingen staan hier bewust **alleen** bij de eigenaar, ongeacht wat er
 * verder verdeeld wordt:
 *
 * - **`prijzen`** zet in één formulier de verkoopprijs van de hele winkel om.
 *   Dat is geen taak die je delegeert aan wie er toevallig ook bij moet.
 * - **`beheerders`** kan rechten uitdelen, en daarmee elk ander recht. Wie dit
 *   heeft, heeft in de praktijk alles.
 *
 * `bestellingen` staat er ook bij, maar om een andere reden: daar staan naam,
 * adres en mailadres van klanten in. Dataminimalisatie (AVG) zegt dat je die
 * niet deelt met iemand die ze voor zijn werk niet nodig heeft. De boekhouder
 * ziet ze alsnog — ze staan op de factuur — maar dan via zijn eigen scherm en
 * met een grondslag erachter.
 */
const MATRIX: Record<Role, ReadonlyArray<Permission>> = {
  eigenaar: ALL,
  boekhouder: ["facturen"],
  marketing: ["kortingen", "beoordelingen"],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export function permissionsOf(role: Role): ReadonlyArray<Permission> {
  return MATRIX[role];
}

/** Bestaat deze rol? Voor waarden die uit een formulier of de database komen. */
export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as ReadonlyArray<string>).includes(value);
}

/** Wat de beheerder leest bij het uitnodigen */
export const ROLE_LABELS: Record<Role, { naam: string; uitleg: string }> = {
  eigenaar: {
    naam: "Eigenaar",
    uitleg: "Alles, inclusief prijzen en het uitnodigen van anderen.",
  },
  boekhouder: {
    naam: "Boekhouder",
    uitleg: "Facturen en het omzetoverzicht. Verder niets.",
  },
  marketing: {
    naam: "Marketing",
    uitleg: "Beoordelingen, acties en kortingscodes. Geen klantgegevens.",
  },
};

/** Waar een rol terechtkomt als hij het paneel opent */
export const ROLE_HOME: Record<Role, string> = {
  eigenaar: "/beheer",
  boekhouder: "/beheer/facturen",
  marketing: "/beheer/beoordelingen",
};
