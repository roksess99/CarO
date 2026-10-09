// Wat een retour is. Framework-onafhankelijk: geen Next, geen React, geen
// opslaglaag — `store.ts` schrijft precies dit weg.

/**
 * Waar een retour in zijn behandeling staat.
 *
 * | Status | Betekenis |
 * |---|---|
 * | `requested` | de klant heeft hem aangemeld, het pakket is onderweg |
 * | `received` | de beheerder heeft het pakket terug |
 * | `refunded` | het geld is teruggeboekt via de betaaldienst |
 * | `rejected` | afgewezen, met reden |
 *
 * Van `refunded` gaat het nooit meer terug: dat is geld dat de deur uit is.
 */
export type ReturnStatus = "requested" | "received" | "refunded" | "rejected";

/**
 * Waarom het artikel terugkomt. Géén vrije tekst, want het zijn vier
 * verschillende rechten met verschillende termijnen en verschillende kosten:
 *
 * | Reden | Termijn | Retourzending betaalt |
 * |---|---|---|
 * | `withdrawal` (bedenktijd) | 14 dagen na ontvangst | de klant |
 * | `wrong` (verkeerd geleverd) | onze fout | wij |
 * | `damaged` (beschadigd aangekomen) | onze fout | wij |
 * | `defect` (kapot, garantie) | twee jaar | wij |
 *
 * Bij `withdrawal` hoeft de klant geen reden op te geven en mogen we er ook
 * niet naar vragen; het tekstveld is daarom altijd optioneel.
 */
export type ReturnReason = "withdrawal" | "wrong" | "damaged" | "defect";

export const RETURN_REASONS: readonly ReturnReason[] = [
  "withdrawal",
  "wrong",
  "damaged",
  "defect",
];

/** Redenen waarbij de fout bij ons ligt; dan betalen wij de retourzending */
export function returnIsOurFault(reason: ReturnReason): boolean {
  return reason !== "withdrawal";
}

export interface ReturnLine {
  partId: string;
  /** De naam zoals hij bij de bestelling stond, niet die van vandaag */
  name: string;
  quantity: number;
  unitGrossCents: number;
  lineGrossCents: number;
}

export interface StoredReturn {
  /** RET-20260928-4K2P */
  reference: string;
  orderReference: string;
  status: ReturnStatus;
  reason: ReturnReason;
  note: string | null;
  emailKey: string;
  /** Bevroren bij de aanvraag, uit wat de klant destijds betaalde */
  itemsCents: number;
  /** Alleen gevuld bij een volledige herroeping */
  shippingCents: number;
  requestedAt: Date;
  receivedAt: Date | null;
  refundedAt: Date | null;
  /** `re_…` — bij Stripe én bij Mollie hetzelfde voorvoegsel */
  refundId: string | null;
  refundedCents: number | null;
  rejectedAt: Date | null;
  rejectedReason: string | null;
  handledBy: number | null;
  lines: ReturnLine[];
}

/** Wat er terug moet, zolang de beheerder er niets anders van maakt */
export function returnAmountCents(entry: {
  itemsCents: number;
  shippingCents: number;
}): number {
  return entry.itemsCents + entry.shippingCents;
}
