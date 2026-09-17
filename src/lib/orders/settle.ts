import { transaction } from "@/lib/db/client";
import { recordCodeUse } from "@/lib/discounts/codes";
import { issueInvoice } from "@/lib/invoices/store";
import { getPayment, type MolliePayment } from "@/lib/mollie/client";
import { sendOrderNotifications } from "./notify";
import { readOrder, saveOrder } from "./store";
import type { StoredOrder } from "./types";

/**
 * Eén plek waar een bestelling van "wacht op betaling" naar "betaald" gaat.
 *
 * Twee routes komen hier binnen en ze kunnen tegelijk aankomen:
 *
 * 1. de **webhook** van Mollie — dat is het bewijs van betaling;
 * 2. de **terugkeerpagina** waar de klant op landt.
 *
 * De terugkeer zelf zegt niets: een klant die het betaalscherm afbreekt komt op
 * dezelfde URL uit, en de URL is te typen. Daarom vraagt ook die pagina de
 * status op bij Mollie in plaats van hem te geloven. Bijkomend voordeel: op een
 * ontwikkelmachine kan Mollie geen webhook bezorgen (localhost is niet publiek
 * bereikbaar), en dan is dit de enige route die de afhandeling nog doet.
 */

/**
 * Twee gelijktijdige aanroepen voor dezelfde bestelling delen één afhandeling.
 * Zonder dit sturen een webhook en een pagina-bezoek die tegelijk binnenkomen
 * allebei een bevestigingsmail: allebei lezen ze `notifiedAt: null`.
 *
 * Dit geldt binnen één proces. Draaien er meerdere, dan is een dubbele mail
 * theoretisch nog mogelijk; dat vraagt een slot in de opslag en dat hoort bij
 * de database die `store.ts` uiteindelijk krijgt.
 */
const inFlight = new Map<string, Promise<StoredOrder | null>>();

export async function settleOrder(
  reference: string,
  known?: MolliePayment,
): Promise<StoredOrder | null> {
  const running = inFlight.get(reference);
  if (running) return running;

  const run = settle(reference, known).finally(() => {
    inFlight.delete(reference);
  });
  inFlight.set(reference, run);
  return run;
}

async function settle(
  reference: string,
  known?: MolliePayment,
): Promise<StoredOrder | null> {
  const order = await readOrder(reference);
  if (!order) return null;

  // Al afgehandeld én gemeld: niets meer te doen, ook geen call naar Mollie
  if (order.status === "paid" && order.notifiedAt) return order;

  const payment = known ?? (await getPayment(order.paymentId));
  // Een webhook draagt alleen een betaal-id; het kenmerk komt uit de metadata
  // en die kan naar een andere bestelling wijzen als er iets is misgegaan
  if (payment.id !== order.paymentId) return order;

  if (payment.status !== "paid") {
    // Een betaalde bestelling gaat nooit terug naar mislukt. Een terugboeking
    // ná betaling is geen statuswijziging maar een geval voor de beheerder.
    if (order.status === "paid") return order;
    const failed = ["canceled", "expired", "failed"].includes(payment.status);
    if (!failed) return order;
    const next: StoredOrder = { ...order, status: "failed" };
    await saveOrder(next);
    return next;
  }

  // Het bedrag komt uit ons eigen document, dus dit kan alleen afwijken als de
  // opslag of de betaling buiten de winkel om is aangepast. Dan liever niets
  // versturen en het zichtbaar laten stuklopen dan een order klaarzetten voor
  // inkoop waar te weinig voor betaald is.
  if (payment.amountCents !== order.document.totalGrossCents) {
    throw new Error(
      `Bedrag wijkt af voor ${reference}: betaald ${payment.amountCents}, verwacht ${order.document.totalGrossCents}`,
    );
  }

  const paid: StoredOrder = {
    ...order,
    status: "paid",
    paidAt: payment.paidAt ?? new Date().toISOString(),
    paymentMethod: payment.method,
  };
  // Eerst de betaling vastleggen, dan pas mailen: gaat het versturen mis, dan
  // is de betaling niet zoekgeraakt en probeert de volgende webhook het opnieuw.
  await saveOrder(paid);

  await noteCodeUse(paid);

  // Pas hier krijgt de bestelling een factuurnummer: bij het aanmaken zou een
  // afgebroken betaling een gat in de reeks slaan, en die moet aaneengesloten
  // zijn. Idempotent, want Mollie meldt zich vaker dan één keer.
  const invoice = await issueInvoice(paid);

  if (paid.notifiedAt) return paid;

  // Bewust niet afgevangen: mislukt de mail, dan mag `notifiedAt` niet gezet
  // worden. De aanroeper geeft Mollie een foutstatus terug en die probeert het
  // opnieuw — tot ruim een dag lang.
  await sendOrderNotifications(paid, invoice.number);

  const notified: StoredOrder = { ...paid, notifiedAt: new Date().toISOString() };
  await saveOrder(notified);
  return notified;
}

/**
 * De kortingscode aftekenen: pas nu, want een afgebroken checkout mag de enige
 * kans van een klant niet opsouperen.
 *
 * Twee dingen gaan hier bewust niet stuk:
 *
 * - **De unieke sleutel kan afketsen.** Twee bestellingen van hetzelfde adres
 *   die tegelijk afgerekend worden, lezen allebei "nog niet gebruikt"; de
 *   database weigert dan de tweede. Het geld is op dat moment al binnen, dus
 *   dat mag de afhandeling niet tegenhouden — het komt in de log zodat de
 *   beheerder het ziet.
 * - **De database kan wegvallen.** Ook dan gaat de bestelling door: de klant
 *   heeft betaald, en zijn bevestiging tegenhouden om een teller is de
 *   verkeerde afweging.
 */
async function noteCodeUse(order: StoredOrder): Promise<void> {
  if (!order.discountCodeId) return;
  try {
    const recorded = await transaction((tx) =>
      recordCodeUse(tx, {
        codeId: order.discountCodeId as number,
        email: order.document.customer.email,
        orderReference: order.reference,
      }),
    );
    if (!recorded) {
      console.warn(
        `Kortingscode al gebruikt door dit adres, bestelling ${order.reference} is wel betaald`,
      );
    }
  } catch (error) {
    console.error(
      `Kortingscode niet kunnen aftekenen voor ${order.reference}:`,
      error instanceof Error ? error.message : "onbekende fout",
    );
  }
}
