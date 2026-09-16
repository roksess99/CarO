import { currentAdmin } from "@/lib/admin/session";
import { renderOrderPdf } from "@/lib/checkout/order-pdf";
import { findInvoice } from "@/lib/invoices/store";

/**
 * De factuur als PDF, opnieuw getekend uit de bevroren momentopname.
 *
 * Niet uit de huidige catalogus: een factuur die van bedrag verandert omdat de
 * leverancier zijn prijs aanpaste is geen factuur meer. Wat hier uit komt is
 * hetzelfde document als toen hij verstuurd werd.
 *
 * De controle op de beheerder staat hier en niet in een layout: een route
 * handler heeft er geen, en is een eigen ingang naar klantgegevens.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  if (!(await currentAdmin())) {
    return new Response("Niet toegestaan", { status: 401 });
  }

  const { number } = await params;
  const invoice = await findInvoice(number);
  if (!invoice) {
    return new Response("Niet gevonden", { status: 404 });
  }

  const pdf = await renderOrderPdf(invoice.document, {
    invoiceNumber: invoice.number,
    issuedAt: invoice.issuedAt.toISOString(),
  });

  return new Response(pdf as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      // inline: in het tabblad bekijken in plaats van meteen downloaden
      "Content-Disposition": `inline; filename="factuur-${invoice.number}.pdf"`,
      // Een factuur met NAW-gegevens hoort nergens tussen te blijven hangen
      "Cache-Control": "private, no-store",
    },
  });
}
