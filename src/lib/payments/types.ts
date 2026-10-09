/**
 * De naad tussen de winkel en de betaaldienst.
 *
 * **Waarom dit bestaat.** Mollie wees ons 2026-10-09 definitief af en toen
 * bleek dat de betaaldienst op acht plekken in vier bestanden rechtstreeks werd
 * aangeroepen. Een tweede wissel mag niet opnieuw een dag kosten, dus praat de
 * winkel vanaf nu alleen nog met deze vijf bewerkingen en kent hij de dienst
 * erachter niet.
 *
 * De bewerkingen zijn precies wat de winkel gebruikt — niet meer. Een naad die
 * alles van beide diensten doorlaat is geen naad.
 */

/**
 * Vandaag één waarde, en dat is met opzet geen `string`: komt er ooit een
 * tweede bij, dan wijst de compiler elke plek aan waar de naam ertoe doet.
 */
export type PaymentProviderName = "stripe";

/**
 * De statussen die de winkel kent. Bewust een kleinere lijst dan die van de
 * diensten zelf: `settle.ts` kijkt alleen of er betaald is, of dat het
 * definitief mis is gegaan.
 */
export type PaymentStatus =
  | "open"
  | "pending"
  | "paid"
  | "canceled"
  | "expired"
  | "failed";

export interface Payment {
  /** Het kenmerk dat wij bewaren in `orders.payment_id` */
  id: string;
  status: PaymentStatus;
  /** Altijd in hele centen — nooit een float, nooit een string */
  amountCents: number;
  /** Wat wij bij het aanmaken hebben meegegeven */
  metadata: Record<string, unknown>;
  /** Betaalmethode zoals de klant hem koos, bv. "ideal" */
  method: string | null;
  paidAt: string | null;
  checkoutUrl: string | null;
}

export class PaymentError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly provider: PaymentProviderName,
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

export interface CreatePaymentInput {
  amountCents: number;
  description: string;
  /** Waar de klant na het betaalscherm terugkomt */
  redirectUrl: string;
  /** Weglaten als de site niet publiek bereikbaar is */
  webhookUrl?: string;
  /**
   * Alleen wat nodig is om de bestelling terug te vinden: het kenmerk en het
   * toegangsteken. **Geen naam, adres of artikelen** — die horen niet in het
   * dashboard van een betaaldienst.
   */
  metadata: { reference: string; token: string };
  /** De taal van het betaalscherm, als `nl` of `en` */
  locale: "nl" | "en";
}

export interface Refund {
  id: string;
  status: string;
  amountCents: number;
}

export interface RefundInput {
  paymentId: string;
  amountCents: number;
  description: string;
  /** Het retournummer; gaat mee als idempotentiesleutel */
  reference: string;
}

/**
 * Kan er op dit moment betaald worden?
 *
 * Een sleutel die werkt is niet hetzelfde als een account dat betalingen
 * aanneemt — dat is de les van 2026-10-08 (@docs/DECISIONS.md #29) en hij geldt
 * bij elke dienst. Daarom draagt elke aanbieder dit zelf aan.
 */
export interface PaymentHealth {
  provider: PaymentProviderName;
  /** Staat er een sleutel in de omgeving? */
  configured: boolean;
  /** Antwoordde de dienst? */
  reachable: boolean;
  /** `true` als de dienst onze sleutel weigert (401/403) */
  rejected: boolean;
  /** Een live- of een testsleutel */
  live: boolean;
  /**
   * Neemt het account betalingen aan? Bij Stripe is dat `charges_enabled`:
   * het account kan bestaan en de sleutel kan werken terwijl er toch niets
   * geïnd kan worden.
   */
  ready: boolean;
  /** Wat de klant te kiezen krijgt, voor zover de dienst dat prijsgeeft */
  methods: string[];
  detail?: string;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  isConfigured(): boolean;
  createPayment(input: CreatePaymentInput): Promise<Payment>;
  getPayment(id: string): Promise<Payment>;
  createRefund(input: RefundInput): Promise<Refund>;
  health(): Promise<PaymentHealth>;
}

/** Kan een klant hiermee afrekenen? */
export function paymentsPossible(health: PaymentHealth): boolean {
  return health.configured && health.reachable && health.ready;
}
