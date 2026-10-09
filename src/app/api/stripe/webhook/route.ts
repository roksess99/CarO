import { createHmac, timingSafeEqual } from "node:crypto";
import { settleOrder } from "@/lib/orders/settle";
import { stripeProvider } from "@/lib/payments/stripe-provider";

/**
 * Webhook van Stripe. Dit is het enige bericht dat als bewijs van betaling
 * telt — de terugkeer van de klant in de browser niet.
 *
 * **Anders dan bij Mollie is dit bericht wél ondertekend**, en die handtekening
 * wordt hier gecontroleerd. Toch halen we de status daarna alsnog zelf op bij
 * Stripe, net als in de Mollie-route: de inhoud van een bericht is nooit de
 * bron van waarheid over geld. De handtekening voorkomt dat een vreemde deze
 * route kan laten werken; het ophalen voorkomt dat een verouderd bericht een
 * verkeerde status zet.
 *
 * Statuscodes zijn functioneel: alles behalve 2xx laat Stripe het opnieuw
 * proberen, oplopend tot drie dagen lang.
 *
 * | Situatie | Antwoord |
 * |---|---|
 * | verwerkt, of niets te doen | 200 — klaar |
 * | handtekening klopt niet | 400 — opnieuw sturen helpt niet |
 * | onbekende sessie of onbekende order | 200 — idem |
 * | mail of opslag mislukt | 500 — laat Stripe het opnieuw sturen |
 */

// Een betaalstatus mag nooit uit een cache komen
export const dynamic = "force-dynamic";

/** Stripe weigert een bericht ouder dan vijf minuten; wij ook */
const TOLERANCE_SECONDS = 300;

/**
 * De gebeurtenissen die over geld gaan. Bij iDEAL en andere methodes die na de
 * terugkeer nog verwerkt worden komt `completed` binnen vóórdat er betaald is;
 * dan volgt `async_payment_succeeded`. Allebei verwerken we op dezelfde manier
 * — door de status op te halen — dus de lijst is één `includes`.
 */
const HANDLED = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

/**
 * `Stripe-Signature: t=1700000000,v1=abc…,v1=def…`
 *
 * Er kunnen meerdere `v1`-waarden staan als er meerdere eindpunt-geheimen
 * actief zijn; één die klopt is genoeg. De vergelijking gaat met
 * `timingSafeEqual` — een gewone `===` lekt via de looptijd hoeveel tekens er
 * klopten.
 */
function signatureIsValid(payload: string, header: string, secret: string): boolean {
  const parts = header.split(",").map((part) => part.trim());
  const timestamp = parts
    .find((part) => part.startsWith("t="))
    ?.slice(2);
  if (!timestamp || !/^\d+$/.test(timestamp)) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest();

  return parts
    .filter((part) => part.startsWith("v1="))
    .some((part) => {
      const given = Buffer.from(part.slice(3), "hex");
      return given.length === expected.length && timingSafeEqual(given, expected);
    });
}

interface StripeEvent {
  type?: string;
  data?: { object?: { id?: string } };
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (secret.length === 0) {
    // Zonder geheim kan niets gecontroleerd worden, en een ongecontroleerd
    // bericht mag nooit een bestelling op betaald zetten.
    console.error("Stripe-webhook: STRIPE_WEBHOOK_SECRET ontbreekt");
    return new Response(null, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  // De ruwe tekst, niet het geparste bericht: de handtekening gaat over de
  // bytes zoals Stripe ze verstuurde.
  const payload = await request.text();
  if (!signature || !signatureIsValid(payload, signature, secret)) {
    return new Response(null, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return new Response(null, { status: 400 });
  }

  if (!event.type || !HANDLED.has(event.type)) {
    // Stripe stuurt meer dan wij gebruiken; dat is geen fout
    return new Response(null, { status: 200 });
  }

  const sessionId = event.data?.object?.id;
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return new Response(null, { status: 200 });
  }

  try {
    const payment = await stripeProvider.getPayment(sessionId);
    const reference = payment.metadata.reference;
    if (typeof reference !== "string") {
      // Een betaling zonder ons kenmerk hoort niet bij deze winkel
      return new Response(null, { status: 200 });
    }

    // Geeft `null` als de bestelling niet in de opslag staat; ook dan 200,
    // want opnieuw sturen laat hem niet alsnog verschijnen.
    await settleOrder(reference, payment);
    return new Response(null, { status: 200 });
  } catch (error) {
    // Geen klantgegevens in de log — alleen dat het misging
    console.error(
      "Stripe-webhook mislukt:",
      error instanceof Error ? error.message : "onbekende fout",
    );
    return new Response(null, { status: 500 });
  }
}
