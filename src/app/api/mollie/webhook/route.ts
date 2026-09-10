import { getPayment } from "@/lib/mollie/client";
import { settleOrder } from "@/lib/orders/settle";

/**
 * Webhook van Mollie. Dit is het enige bericht dat als bewijs van betaling
 * telt — de terugkeer van de klant in de browser niet.
 *
 * Mollie stuurt alleen een betaal-id, in een `application/x-www-form-urlencoded`
 * body. Het bericht is niet ondertekend, dus de inhoud zegt op zichzelf niets:
 * we halen de status altijd zelf op bij Mollie met onze eigen sleutel. Iemand
 * die dit endpoint met een verzonnen id aanroept krijgt daardoor niets voor
 * elkaar.
 *
 * Statuscodes zijn hier functioneel: alles behalve 2xx laat Mollie het opnieuw
 * proberen, ruim een dag lang met oplopende tussenpozen. Daarom:
 *
 * | Situatie | Antwoord |
 * |---|---|
 * | verwerkt, of niets te doen | 200 — klaar |
 * | onbekend id of onbekende order | 200 — opnieuw proberen helpt niet |
 * | mail of opslag mislukt | 500 — laat Mollie het opnieuw sturen |
 */

// Een betaalstatus mag nooit uit een cache komen
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let paymentId: string | null = null;
  try {
    const body = await request.formData();
    const value = body.get("id");
    paymentId = typeof value === "string" ? value : null;
  } catch {
    paymentId = null;
  }

  // Vorm van een Mollie-betaal-id; scheelt een call naar Mollie bij ruis
  if (!paymentId || !/^tr_[A-Za-z0-9]+$/.test(paymentId)) {
    return new Response(null, { status: 200 });
  }

  try {
    const payment = await getPayment(paymentId);
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
      "Mollie-webhook mislukt:",
      error instanceof Error ? error.message : "onbekende fout",
    );
    return new Response(null, { status: 500 });
  }
}
