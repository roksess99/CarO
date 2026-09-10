import type { OrderDocument } from "@/lib/checkout/order-document";
import type { CartItem } from "@/lib/cart/types";

// Wat er van een bestelling bewaard wordt. Framework-onafhankelijk: geen
// Next, geen React, geen opslaglaag. `store.ts` schrijft precies dit weg.

/**
 * De toestand van een bestelling bij ons — níet de Mollie-status.
 *
 * | Status | Betekenis |
 * |---|---|
 * | `awaiting_payment` | aangemaakt, klant is naar Mollie gestuurd |
 * | `paid` | betaling bevestigd door Mollie |
 * | `failed` | mislukt, geannuleerd of verlopen |
 *
 * Van `paid` gaat het nooit meer terug: een geslaagde betaling die later een
 * `failed`-webhook krijgt is een terugboeking, en die hoort met de hand
 * behandeld te worden — niet door een status stilletjes te overschrijven.
 */
export type OrderStatus = "awaiting_payment" | "paid" | "failed";

export interface StoredOrder {
  /** Ons kenmerk, bv. CARO-20260910-4K2P. Ook de sleutel in de opslag. */
  reference: string;
  /**
   * Willekeurig teken dat in de terugkeer-URL staat. Zonder dit kan iemand
   * andermans bestelling opvragen door het kenmerk te raden — de datum is
   * bekend en er blijven vier tekens over.
   */
  accessToken: string;
  createdAt: string;
  status: OrderStatus;
  /** Taal waarin de klant bestelde; bepaalt de taal van de bevestiging */
  locale: string;
  /** `tr_…` bij Mollie */
  paymentId: string;
  /** Betaalmethode zoals Mollie hem teruggeeft, bv. "ideal" */
  paymentMethod: string | null;
  paidAt: string | null;
  /**
   * Wanneer de bevestigingsmails eruit zijn. Mollie stuurt een webhook vaker
   * dan één keer, en de terugkeerpagina controleert óók. Dit veld is wat
   * voorkomt dat de klant drie keer dezelfde bevestiging krijgt.
   */
  notifiedAt: string | null;
  /** De hele orderbevestiging, inclusief bedragen zoals afgerekend */
  document: OrderDocument;
  /**
   * Wat de klant in de wagen had, om de inkoop bij de groothandel te kunnen
   * doen: het artikel-id van de leverancier plus de familie waar het bij hoort.
   */
  items: CartItem[];
}
