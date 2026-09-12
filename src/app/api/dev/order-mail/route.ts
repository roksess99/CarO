import { LOGO_CID, renderCustomerMail } from "@/lib/orders/customer-mail";
import { productLabel } from "@/lib/orders/product-label";
import { readOrder } from "@/lib/orders/store";

/**
 * De bevestigingsmail bekijken zonder een bestelling te plaatsen.
 *
 *     /api/dev/order-mail?ref=CARO-20260912-0B64
 *
 * Zonder dit is de enige manier om een tekstwijziging te zien: afrekenen,
 * betalen bij Mollie, wachten op de mail. Dat is drie minuten per komma.
 *
 * **Alleen in ontwikkeling.** In productie geeft dit een 404, want een
 * bestelling bevat NAW-gegevens en het ordernummer is te raden.
 *
 * Het logo zit in de echte mail als bijlage (`cid:`); een browser kent dat
 * niet. Voor de voorvertoning wordt die verwijzing vervangen door het bestand
 * uit `public/`, zodat wat je hier ziet verder gelijk is aan wat er verstuurd
 * wordt.
 */
export async function GET(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }

  const reference = new URL(request.url).searchParams.get("ref");
  if (!reference) {
    return new Response("Geef ?ref=<ordernummer> mee", { status: 400 });
  }

  const order = await readOrder(reference);
  if (!order) {
    return new Response(`Onbekende bestelling: ${reference}`, { status: 404 });
  }

  const html = await renderCustomerMail(
    order,
    order.document.lines.map((line) => ({
      label: productLabel(line),
      quantity: line.quantity,
      lineGrossCents: line.lineGrossCents,
    })),
  );

  return new Response(html.replaceAll(`cid:${LOGO_CID}`, "/brand/caro-lockup-email.png"), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
