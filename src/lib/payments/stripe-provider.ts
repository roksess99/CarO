import {
  PaymentError,
  type CreatePaymentInput,
  type Payment,
  type PaymentHealth,
  type PaymentProvider,
  type PaymentStatus,
  type Refund,
  type RefundInput,
} from "./types";

/**
 * Stripe Checkout (de gehoste variant), rechtstreeks met `fetch`.
 *
 * Waarom geen `stripe`-pakket: zelfde afweging als bij Mollie. We gebruiken
 * vier endpoints, de API is form-encoded HTTP en de handtekening op de webhook
 * is HMAC-SHA256 uit `node:crypto`. Het pakket zou een eigen HTTP-laag, een
 * versie-afhankelijkheid en een vastgepinde API-versie meebrengen voor iets wat
 * hier in tweehonderd regels past.
 *
 * De sleutel begint met `sk_test_` of `sk_live_` en staat **alleen** in `.env`.
 * Nooit in een `NEXT_PUBLIC_`-variabele, nooit in de browser.
 */

const API = "https://api.stripe.com/v1";

function secretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY ontbreekt");
  return key;
}

/**
 * Stripe praat `application/x-www-form-urlencoded` met blokhaken voor geneste
 * waarden: `line_items[0][price_data][currency]=eur`. Dit zet een gewoon
 * object om in die vorm.
 */
function encodeForm(value: unknown, prefix = ""): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => encodeForm(item, `${prefix}[${index}]`));
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, item]) =>
      encodeForm(item, prefix ? `${prefix}[${key}]` : key),
    );
  }
  return [`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`];
}

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown; idempotencyKey?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey()}`,
  };
  if (init.body !== undefined) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  // Een dubbele klik op "betalen" mag geen tweede betaling opleveren
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;

  const response = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers,
    ...(init.body === undefined ? {} : { body: encodeForm(init.body).join("&") }),
    // Een betaalstatus mag nooit uit een cache komen
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      body &&
      typeof body === "object" &&
      "error" in body &&
      body.error &&
      typeof body.error === "object" &&
      "message" in body.error
        ? String((body.error as { message: unknown }).message)
        : response.statusText;
    throw new PaymentError(
      `Stripe ${response.status}: ${detail}`,
      response.status,
      "stripe",
    );
  }
  return body as T;
}

// ---------------------------------------------------------------------------
// De vorm van wat Stripe terugstuurt — alleen de velden die wij lezen
// ---------------------------------------------------------------------------

interface StripePaymentMethod {
  type?: string | null;
}

interface StripePaymentIntent {
  id: string;
  status?: string | null;
  payment_method?: StripePaymentMethod | string | null;
  latest_charge?: { created?: number | null } | string | null;
}

interface StripeSession {
  id: string;
  /** `open`, `complete` of `expired` */
  status?: string | null;
  /** `paid`, `unpaid` of `no_payment_required` */
  payment_status?: string | null;
  amount_total?: number | null;
  metadata?: Record<string, string> | null;
  url?: string | null;
  payment_intent?: StripePaymentIntent | string | null;
}

interface StripeRefund {
  id: string;
  status?: string | null;
  amount?: number | null;
}

interface StripeAccount {
  charges_enabled?: boolean | null;
  payouts_enabled?: boolean | null;
  requirements?: { disabled_reason?: string | null } | null;
}

/**
 * Twee velden samen bepalen de status, en dat is de val bij Stripe: een sessie
 * met `status: "complete"` is niet hetzelfde als betaald. Bij een methode die
 * na de terugkeer nog verwerkt wordt staat er `payment_status: "unpaid"`, en
 * die mag nooit als betaling tellen.
 */
function toStatus(
  session: StripeSession,
  intent: StripePaymentIntent | null,
): PaymentStatus {
  if (session.status === "expired") return "expired";
  if (intent?.status === "canceled") return "canceled";
  if (session.status === "complete") {
    if (
      session.payment_status === "paid" ||
      session.payment_status === "no_payment_required"
    ) {
      return "paid";
    }
    return "pending";
  }
  if (intent?.status === "processing") return "pending";
  return "open";
}

function intentOf(session: StripeSession): StripePaymentIntent | null {
  const intent = session.payment_intent;
  return intent && typeof intent === "object" ? intent : null;
}

function toPayment(session: StripeSession): Payment {
  const intent = intentOf(session);
  const method =
    intent && typeof intent.payment_method === "object" && intent.payment_method
      ? (intent.payment_method.type ?? null)
      : null;
  const charge =
    intent && typeof intent.latest_charge === "object" && intent.latest_charge
      ? intent.latest_charge
      : null;

  return {
    id: session.id,
    status: toStatus(session, intent),
    // Stripe rekent al in centen; dit is de enige dienst waar niets om te
    // rekenen valt en dus ook niets af te ronden.
    amountCents: session.amount_total ?? 0,
    metadata: session.metadata ?? {},
    method,
    paidAt:
      charge?.created != null ? new Date(charge.created * 1000).toISOString() : null,
    checkoutUrl: session.url ?? null,
  };
}

/** Haalt de sessie óp mét alles wat wij eruit lezen */
async function readSession(id: string): Promise<StripeSession> {
  const query = [
    "expand[]=payment_intent.payment_method",
    "expand[]=payment_intent.latest_charge",
  ].join("&");
  return request<StripeSession>(
    `/checkout/sessions/${encodeURIComponent(id)}?${query}`,
  );
}

export const stripeProvider: PaymentProvider = {
  name: "stripe",

  isConfigured(): boolean {
    return (process.env.STRIPE_SECRET_KEY ?? "").length > 0;
  },

  /**
   * **Eén regel met het totaalbedrag, niet de artikelen afzonderlijk.**
   *
   * Dat is een bewuste keuze. Het bedrag staat bevroren in het orderdocument —
   * inclusief verzendkosten en een eventuele kortingscode — en dat is het
   * bedrag waarop de factuur straks gebaseerd is. Zouden we de regels los
   * meesturen, dan rekent Stripe het totaal zélf uit en moet een kortingscode
   * een Stripe-coupon worden; dan zijn er twee plekken die een bedrag bepalen
   * en is "ze lopen uiteen" een kwestie van tijd. De klant ziet de artikelen
   * op ons eigen besteloverzicht, in de bevestigingsmail en op de factuur.
   */
  async createPayment(input: CreatePaymentInput): Promise<Payment> {
    const session = await request<StripeSession>("/checkout/sessions", {
      method: "POST",
      idempotencyKey: input.metadata.reference,
      body: {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: input.amountCents,
              product_data: { name: input.description },
            },
          },
        ],
        // Eén terugkeer-URL voor beide uitkomsten: de statuspagina vraagt de
        // status zelf op en gelooft de terugkeer niet (lib/orders/settle.ts).
        success_url: input.redirectUrl,
        cancel_url: input.redirectUrl,
        client_reference_id: input.metadata.reference,
        metadata: input.metadata,
        locale: input.locale,
        // Ingesteld in Checkout Studio, hier onveranderd overgenomen:
        billing_address_collection: "auto",
        phone_number_collection: { enabled: false },
        // Wij rekenen zelf 21% btw en tonen prijzen inclusief; Stripe Tax zou
        // een tweede partij over hetzelfde bedrag laten beslissen.
        automatic_tax: { enabled: false },
        // De winkel heeft eigen kortingscodes, server-side verrekend vóór dit
        // bedrag (lib/discounts/codes.ts). Een tweede kortingsveld op het
        // betaalscherm zou een korting over een korting geven.
        allow_promotion_codes: false,
        submit_type: "auto",
      },
    });
    return toPayment(session);
  },

  async getPayment(id: string): Promise<Payment> {
    return toPayment(await readSession(id));
  },

  /**
   * Terugbetalen gaat niet op de sessie maar op de betaling eronder, en die
   * twee hebben verschillende kenmerken. Wij bewaren de sessie (dat is wat de
   * webhook draagt), dus hier wordt het tweede kenmerk opgehaald. Dat kost een
   * extra aanroep, maar terugbetalen is handwerk in het beheerpaneel en gebeurt
   * hooguit een paar keer per week — een kolom erbij in `orders` zou het
   * ordermodel raken voor een zeldzame handeling.
   */
  async createRefund(input: RefundInput): Promise<Refund> {
    const session = await readSession(input.paymentId);
    const intent = intentOf(session);
    const intentId =
      intent?.id ??
      (typeof session.payment_intent === "string" ? session.payment_intent : null);
    if (!intentId) {
      throw new PaymentError(
        "Deze betaling heeft bij Stripe geen betaling om op terug te boeken",
        400,
        "stripe",
      );
    }

    const refund = await request<StripeRefund>("/refunds", {
      method: "POST",
      idempotencyKey: input.reference,
      body: {
        payment_intent: intentId,
        amount: input.amountCents,
        metadata: { reference: input.reference },
      },
    });
    return {
      id: refund.id,
      status: refund.status ?? "unknown",
      amountCents: refund.amount ?? 0,
    };
  },

  /**
   * `charges_enabled` is bij Stripe precies wat `pending-boarding` bij Mollie
   * was: het account bestaat, de sleutel werkt, en er kan toch niets betaald
   * worden omdat de verificatie nog loopt.
   */
  async health(): Promise<PaymentHealth> {
    const key = process.env.STRIPE_SECRET_KEY ?? "";
    const live = key.startsWith("sk_live_");
    const base = { provider: "stripe" as const, live, methods: [] };

    if (key.length === 0) {
      return {
        ...base,
        configured: false,
        reachable: false,
        rejected: false,
        ready: false,
        detail: "geen sleutel ingesteld",
      };
    }

    try {
      const response = await fetch(`${API}/account`, {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        return {
          ...base,
          configured: true,
          reachable: true,
          rejected: response.status === 401 || response.status === 403,
          ready: false,
          detail: `HTTP ${response.status}`,
        };
      }

      const account = (await response.json()) as StripeAccount;
      // GEMETEN 2026-10-09: met een **testsleutel** maakt Stripe gewoon een
      // Checkout-sessie aan terwijl `charges_enabled` op `false` staat. In
      // testmodus gaat er geen geld om, dus die vlag zegt daar niets over of er
      // afgerekend kan worden — en zou hij het afrekenen dichtzetten precies op
      // het moment dat je het wilt uitproberen. Alleen op een live sleutel is
      // dit de vraag die ertoe doet.
      const ready = live ? account.charges_enabled === true : true;
      const reason = account.requirements?.disabled_reason;
      return {
        ...base,
        configured: true,
        reachable: true,
        rejected: false,
        ready,
        ...(ready || !reason ? {} : { detail: reason }),
      };
    } catch (error) {
      // Onbereikbaar is iets anders dan "staat uit": het eerste gaat vanzelf
      // over, het tweede vraagt een handeling in het dashboard.
      return {
        ...base,
        configured: true,
        reachable: false,
        rejected: false,
        ready: false,
        detail: error instanceof Error ? error.message : "onbereikbaar",
      };
    }
  },
};
