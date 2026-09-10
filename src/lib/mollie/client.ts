import { priceCentsToDecimalString } from "@/lib/format";

/**
 * Mollie v2 REST, rechtstreeks met `fetch`.
 *
 * Waarom geen `@mollie/api-client`: we gebruiken drie endpoints en de officiële
 * client sleept een eigen HTTP-laag, types en een versie-afhankelijkheid mee
 * voor iets wat hier in honderd regels past. Blijft dat zo? Dan is dit
 * bestand het enige dat vervangen hoeft te worden.
 *
 * De sleutel begint met `test_` of `live_` en staat **alleen** in `.env`.
 * Hij mag nooit in een `NEXT_PUBLIC_`-variabele en nooit in de browser komen.
 */

const API = "https://api.mollie.com/v2";

/** Mollie-status van een betaling. `paid` is de enige die geld betekent. */
export type MolliePaymentStatus =
  | "open"
  | "pending"
  | "authorized"
  | "paid"
  | "canceled"
  | "expired"
  | "failed";

export interface MolliePayment {
  id: string;
  status: MolliePaymentStatus;
  /** Bedrag in centen, teruggerekend uit de string die Mollie stuurt */
  amountCents: number;
  /** Wat wij bij het aanmaken hebben meegegeven */
  metadata: Record<string, unknown>;
  /** Betaalmethode zoals gekozen door de klant, bv. "ideal" */
  method: string | null;
  paidAt: string | null;
  checkoutUrl: string | null;
}

export class MollieError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MollieError";
  }
}

export function mollieIsConfigured(): boolean {
  return (process.env.MOLLIE_API_KEY ?? "").length > 0;
}

function apiKey(): string {
  const key = process.env.MOLLIE_API_KEY;
  if (!key) throw new Error("MOLLIE_API_KEY ontbreekt");
  return key;
}

interface MollieAmount {
  currency: string;
  value: string;
}

interface MolliePaymentResponse {
  id: string;
  status: MolliePaymentStatus;
  amount: MollieAmount;
  metadata: Record<string, unknown> | null;
  method: string | null;
  paidAt?: string | null;
  _links?: { checkout?: { href: string } | null } | null;
}

/** "12.34" -> 1234. Mollie rekent in strings; wij overal in centen. */
function centsFromAmount(amount: MollieAmount): number {
  return Math.round(Number(amount.value) * 100);
}

function toPayment(data: MolliePaymentResponse): MolliePayment {
  return {
    id: data.id,
    status: data.status,
    amountCents: centsFromAmount(data.amount),
    metadata: data.metadata ?? {},
    method: data.method ?? null,
    paidAt: data.paidAt ?? null,
    checkoutUrl: data._links?.checkout?.href ?? null,
  };
}

async function request(
  path: string,
  init: RequestInit = {},
): Promise<MolliePaymentResponse> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    // Een betaalstatus mag nooit uit een cache komen
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      body && typeof body === "object" && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : response.statusText;
    throw new MollieError(`Mollie ${response.status}: ${detail}`, response.status);
  }
  return body as MolliePaymentResponse;
}

export interface CreatePaymentInput {
  amountCents: number;
  description: string;
  redirectUrl: string;
  /** Weglaten als de site niet publiek bereikbaar is — zie createPayment */
  webhookUrl?: string;
  metadata: Record<string, string>;
  /** Mollie-taalcode, bv. "nl_NL"; stuurt de taal van het betaalscherm */
  locale?: string;
}

/**
 * Maakt een betaling aan en geeft de URL waar de klant heen moet.
 *
 * `webhookUrl` is optioneel omdat Mollie een publiek bereikbare URL eist: op
 * `localhost` weigert hij het verzoek. Zonder webhook valt de afhandeling
 * terug op de terugkeerpagina, die dezelfde controle doet (lib/orders/settle).
 *
 * `metadata` draagt alleen het ordernummer en het toegangsteken — geen
 * klantgegevens. Het staat bij Mollie in het dashboard en hoort daar zo min
 * mogelijk te bevatten.
 */
export async function createPayment(
  input: CreatePaymentInput,
): Promise<MolliePayment> {
  const data = await request("/payments", {
    method: "POST",
    headers: {
      // Een dubbele klik op "betalen" mag geen tweede betaling opleveren
      "Idempotency-Key": input.metadata.reference ?? crypto.randomUUID(),
    },
    body: JSON.stringify({
      amount: {
        currency: "EUR",
        value: priceCentsToDecimalString(input.amountCents),
      },
      description: input.description,
      redirectUrl: input.redirectUrl,
      ...(input.webhookUrl ? { webhookUrl: input.webhookUrl } : {}),
      metadata: input.metadata,
      ...(input.locale ? { locale: input.locale } : {}),
    }),
  });
  return toPayment(data);
}

export async function getPayment(id: string): Promise<MolliePayment> {
  return toPayment(await request(`/payments/${encodeURIComponent(id)}`));
}
