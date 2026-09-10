"use server";

import { lookupCartParts } from "@/components/cart/actions";
import { getPathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { isValidCartItem } from "@/lib/cart/cart";
import type { CartItem } from "@/lib/cart/types";
import { buildOrderDocument } from "@/lib/checkout/order-document";
import { validateCheckoutDetails } from "@/lib/checkout/schema";
import { mailIsConfigured } from "@/lib/mail";
import { createPayment, mollieIsConfigured } from "@/lib/mollie/client";
import { saveOrder } from "@/lib/orders/store";
import type { StoredOrder } from "@/lib/orders/types";
import { SITE_URL } from "@/lib/site";

/**
 * De bestelling aanmaken en de klant naar Mollie sturen.
 *
 * **Alle bedragen worden hier opnieuw uitgerekend.** De winkelwagen leeft in
 * `localStorage` en is dus door de klant aan te passen; wat de browser
 * meestuurt zijn alleen artikel-id's en aantallen. Prijs en naam komen vers uit
 * de catalogus, en het bedrag dat naar Mollie gaat komt uit dat verse document.
 */

export type StartPaymentResult =
  | { ok: true; checkoutUrl: string }
  | {
      ok: false;
      error: "invalidDetails" | "emptyCart" | "notConfigured" | "failed";
      fieldErrors?: Record<string, string>;
    };

/** Willekeurig teken voor de terugkeer-URL, zie StoredOrder.accessToken */
function accessToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/**
 * Mollie eist een publiek bereikbare webhook-URL en weigert het aanmaken van de
 * betaling als hij naar localhost wijst. Op een ontwikkelmachine sturen we hem
 * dus niet mee; de terugkeerpagina handelt de betaling daar af.
 *
 * De keuze hangt aan de **hostnaam**, niet aan het protocol. Stond hier eerder
 * "alleen bij https", dan leverde een `NEXT_PUBLIC_SITE_URL` die per ongeluk op
 * `http://` staat een winkel op waar nooit een webhook wordt geregistreerd —
 * zonder één foutmelding. Nu gaat de URL gewoon mee en zegt Mollie het als hij
 * hem niet accepteert.
 */
function webhookUrl(): string | undefined {
  const { hostname } = new URL(SITE_URL);
  const local =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local");
  return local ? undefined : `${SITE_URL}/api/mollie/webhook`;
}

function resolveLocale(value: unknown): Locale {
  return routing.locales.includes(value as Locale)
    ? (value as Locale)
    : routing.defaultLocale;
}

export async function startPayment(
  rawDetails: unknown,
  rawItems: unknown,
  rawLocale: unknown,
): Promise<StartPaymentResult> {
  // Zonder betaalsleutel of zonder mail is bestellen niet af te maken. Dat nu
  // zeggen is eerlijker dan de klant laten betalen en daarna geen bevestiging
  // kunnen sturen.
  if (!mollieIsConfigured() || !mailIsConfigured()) {
    return { ok: false, error: "notConfigured" };
  }

  const details = validateCheckoutDetails(rawDetails);
  if (!details.success) {
    return {
      ok: false,
      error: "invalidDetails",
      fieldErrors: details.fieldErrors as Record<string, string>,
    };
  }

  if (!Array.isArray(rawItems)) return { ok: false, error: "emptyCart" };
  const items = rawItems.filter((item): item is CartItem => isValidCartItem(item));
  if (items.length === 0) return { ok: false, error: "emptyCart" };

  const locale = resolveLocale(rawLocale);

  try {
    const parts = await lookupCartParts(items);
    const partById = new Map(parts.map((part) => [part.id, part]));

    // Alleen artikelen die de catalogus nu nog kent: een tussentijds vervallen
    // artikel mag niet meebetaald worden. `available` en `entries` blijven
    // gelijk oplopen — de beheerdersmail koppelt regel n aan artikel n.
    const available: CartItem[] = [];
    const entries = items.flatMap((item) => {
      const part = partById.get(item.partId);
      if (!part) return [];
      available.push(item);
      return [
        {
          name: part.name,
          brand: part.brand,
          oeNumber: part.oeNumber,
          priceCents: part.priceCents,
          quantity: item.quantity,
        },
      ];
    });
    if (entries.length === 0) return { ok: false, error: "emptyCart" };

    const document = buildOrderDocument({ details: details.data, entries });
    const token = accessToken();
    const returnPath = getPathname({ locale, href: "/checkout/status" });
    const redirectUrl = `${SITE_URL}${returnPath}?ref=${encodeURIComponent(document.reference)}&t=${token}`;

    const payment = await createPayment({
      amountCents: document.totalGrossCents,
      description: `CarO bestelling ${document.reference}`,
      redirectUrl,
      webhookUrl: webhookUrl(),
      // Alleen wat nodig is om de bestelling terug te vinden. Naam, adres en
      // artikelen horen niet in het Mollie-dashboard.
      metadata: { reference: document.reference, token },
      locale: locale === "nl" ? "nl_NL" : "en_US",
    });

    if (!payment.checkoutUrl) return { ok: false, error: "failed" };

    const order: StoredOrder = {
      reference: document.reference,
      accessToken: token,
      createdAt: new Date().toISOString(),
      status: "awaiting_payment",
      locale,
      paymentId: payment.id,
      paymentMethod: payment.method,
      paidAt: null,
      notifiedAt: null,
      document,
      items: available,
    };
    // Opslaan vóór de doorverwijzing: staat de bestelling er niet, dan vindt de
    // webhook straks niets terug en is de betaling niet te koppelen.
    await saveOrder(order);

    return { ok: true, checkoutUrl: payment.checkoutUrl };
  } catch (error) {
    // Nooit klantgegevens of een betaal-id in de log; alleen dat het misging
    console.error(
      "Betaling starten mislukt:",
      error instanceof Error ? error.message : "onbekende fout",
    );
    return { ok: false, error: "failed" };
  }
}
