import { renderOrderPdf } from "@/lib/checkout/order-pdf";
import { renderAdminMail } from "@/lib/orders/admin-mail";
import { LOGO_CID, renderCustomerMail } from "@/lib/orders/customer-mail";
import { productLabel } from "@/lib/orders/product-label";
import { readOrder } from "@/lib/orders/store";

/**
 * De bevestigingsmail bekijken zonder een bestelling te plaatsen.
 *
 *     /api/dev/order-mail?ref=CARO-20260912-0B64
 *     /api/dev/order-mail?ref=CARO-20260912-0B64&view=beheer
 *     /api/dev/order-mail?ref=CARO-20260912-0B64&view=pdf&factuur=2026-0001
 *
 * Zonder `view` de mail naar de klant, met `view=beheer` het inkoopbriefje en
 * met `view=pdf` de bijlage — dezelfde tekening als de factuur in het
 * beheerpaneel, maar zonder inloggen.
 *
 * `&levering=2026-10-09` zet een verwachte leverdatum op de kopie die hier
 * getekend wordt. Oude bestellingen hebben er geen (het veld bestaat sinds
 * 2026-10-03), en zonder die schakelaar is de regel niet te bekijken zonder
 * een echte bestelling te plaatsen. **Het verandert niets in de database.**
 *
 * Zonder dit is de enige manier om een tekstwijziging te zien: afrekenen,
 * betalen bij de betaaldienst, wachten op de mail. Dat is drie minuten per komma.
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

  const params = new URL(request.url).searchParams;
  const reference = params.get("ref");
  if (!reference) {
    return new Response("Geef ?ref=<ordernummer> mee", { status: 400 });
  }

  const stored = await readOrder(reference);
  if (!stored) {
    return new Response(`Onbekende bestelling: ${reference}`, { status: 404 });
  }

  // Alleen deze kopie draagt de meegegeven leverdatum; `stored` blijft zoals
  // hij in de database staat.
  const levering = params.get("levering");
  const order = levering
    ? { ...stored, document: { ...stored.document, deliveryExpected: levering } }
    : stored;

  const type = { "content-type": "text/html; charset=utf-8" };

  if (params.get("view") === "pdf") {
    const pdf = await renderOrderPdf(order.document, {
      ...(params.get("factuur") ? { invoiceNumber: params.get("factuur") as string } : {}),
      ...(order.paidAt ? { issuedAt: order.paidAt } : {}),
    });
    return new Response(new Uint8Array(pdf), {
      headers: { "content-type": "application/pdf" },
    });
  }

  if (params.get("view") === "beheer") {
    return new Response(renderAdminMail(order), { headers: type });
  }

  const html = await renderCustomerMail(
    order,
    order.document.lines.map((line) => ({
      label: productLabel(line),
      quantity: line.quantity,
      lineGrossCents: line.lineGrossCents,
    })),
  );

  return new Response(
    html.replaceAll(`cid:${LOGO_CID}`, "/brand/caro-lockup-email.png"),
    { headers: type },
  );
}
