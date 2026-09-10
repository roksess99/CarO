import { getTranslations } from "next-intl/server";
import { renderOrderPdf } from "@/lib/checkout/order-pdf";
import { COMPANY } from "@/lib/company";
import { formatPriceCents } from "@/lib/format";
import { sendMail, type MailAttachment } from "@/lib/mail";
import type { StoredOrder } from "./types";

// De twee mails die na een bevestigde betaling de deur uit gaan: één naar de
// klant en één naar de beheerder. Allebei met dezelfde PDF eraan.
//
// De beheerder bestelt de artikelen met de hand bij de groothandel; zijn mail
// is daarom géén kopie van de klantmail, maar een werkbriefje met precies wat
// hij nodig heeft om in te kopen (docs/DECISIONS.md #10).

/** Adres van de beheerder; standaard de eigen mailbox */
function adminAddress(): string {
  return process.env.ORDER_ADMIN_EMAIL || COMPANY.email;
}

function pdfName(order: StoredOrder): string {
  return `orderbevestiging-${order.reference}.pdf`;
}

function customerName(order: StoredOrder): string {
  const { firstName, lastName } = order.document.customer;
  return `${firstName} ${lastName}`;
}

function addressBlock(order: StoredOrder): string {
  const c = order.document.customer;
  const house = [c.houseNumber, c.houseNumberAddition].filter(Boolean).join(" ");
  return [
    customerName(order),
    `${c.street} ${house}`,
    `${c.postcode} ${c.city}`,
    c.country === "NL" ? "Nederland" : c.country,
  ].join("\n");
}

/** Artikelregels zoals ze in beide mails staan, één regel per artikel */
function lineBlock(order: StoredOrder): string {
  return order.document.lines
    .map(
      (line) =>
        `${line.quantity}x ${line.brand} ${line.name} — ${formatPriceCents(line.lineGrossCents)}`,
    )
    .join("\n");
}

/**
 * Regels voor de beheerder, met het artikelnummer van de leverancier erbij.
 * Zonder dat nummer moet hij elk artikel op naam terugzoeken bij Tyre24.
 */
function purchaseBlock(order: StoredOrder): string {
  return order.items
    .map((item, index) => {
      const line = order.document.lines[index];
      const label = line ? `${line.brand} ${line.name}` : "?";
      return `${item.quantity}x ${label}\n    ${item.family} / ${item.partId}`;
    })
    .join("\n");
}

async function renderAttachment(order: StoredOrder): Promise<MailAttachment> {
  return {
    filename: pdfName(order),
    content: await renderOrderPdf(order.document),
    contentType: "application/pdf",
  };
}

/**
 * Verstuurt beide mails. Gooit als er één misgaat — de aanroeper mag de
 * bestelling dan **niet** als "gemeld" wegschrijven, zodat een volgende poging
 * het opnieuw probeert.
 *
 * De klantmail gaat als eerste: die is het belangrijkst voor het vertrouwen
 * van de klant, en de beheerder ziet de betaling anders ook in Mollie.
 */
export async function sendOrderNotifications(order: StoredOrder): Promise<void> {
  const attachment = await renderAttachment(order);
  const total = formatPriceCents(order.document.totalGrossCents);

  const t = await getTranslations({
    locale: order.locale,
    namespace: "orderMail",
  });

  await sendMail({
    to: order.document.customer.email,
    subject: t("customerSubject", { reference: order.reference }),
    text: t("customerBody", {
      name: order.document.customer.firstName,
      reference: order.reference,
      total,
      lines: lineBlock(order),
      address: addressBlock(order),
      email: COMPANY.email,
      company: COMPANY.name,
    }),
    attachments: [attachment],
  });

  // De beheerdersmail staat vast in het Nederlands: die gaat naar ons eigen
  // kantoor, niet naar de klant, en hoeft de taal van de klant niet te volgen.
  await sendMail({
    to: adminAddress(),
    // Antwoorden komt zo meteen bij de klant uit, niet bij onszelf
    replyTo: order.document.customer.email,
    subject: `Nieuwe bestelling ${order.reference} — ${total}`,
    text: [
      `Betaling bevestigd (${order.paymentMethod ?? "onbekend"}, Mollie ${order.paymentId}).`,
      "",
      "IN TE KOPEN BIJ DE GROOTHANDEL",
      purchaseBlock(order),
      "",
      "BEZORGADRES",
      addressBlock(order),
      "",
      `E-mail: ${order.document.customer.email}`,
      order.document.customer.phone
        ? `Telefoon: ${order.document.customer.phone}`
        : "Telefoon: niet opgegeven",
      "",
      `Artikelen: ${formatPriceCents(order.document.itemsGrossCents)}`,
      `Verzending: ${formatPriceCents(order.document.shippingGrossCents)}`,
      `Totaal incl. btw: ${total}`,
      "",
      "De orderbevestiging zit als PDF bij deze mail.",
    ].join("\n"),
    attachments: [attachment],
  });
}
