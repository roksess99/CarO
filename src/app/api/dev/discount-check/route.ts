import { buildOrderDocument } from "@/lib/checkout/order-document";
import type { CheckoutDetails } from "@/lib/checkout/schema";
import { checkCode, codeBaseCents } from "@/lib/discounts/codes";

/**
 * De bedragen van een kortingscode narekenen zonder te betalen.
 *
 *     /api/dev/discount-check?code=WINTER10&prices=4598,5324&sale=0,1&email=x@y.nl
 *
 * `prices` zijn stuksprijzen in centen, `sale` zegt per regel of er al een
 * actie op loopt. Alleen in ontwikkeling: dit raakt de database.
 */
export async function GET(request: Request): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const prices = (params.get("prices") ?? "4598")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
  const sale = (params.get("sale") ?? "").split(",").map((v) => v.trim() === "1");

  const lines = prices.map((priceCents, index) => ({
    priceCents,
    quantity: 1,
    discountPercent: sale[index] ? 20 : undefined,
  }));

  const baseGrossCents = codeBaseCents(lines);
  const check = await checkCode({
    code: params.get("code") ?? "",
    email: params.get("email") ?? undefined,
    baseGrossCents,
  });

  const customer = {
    email: params.get("email") ?? "test@example.com",
    firstName: "Test",
    lastName: "Klant",
    postcode: "7038 DE",
    houseNumber: "2",
    street: "Gildebongerd",
    city: "Zeddam",
    country: "NL",
  } as CheckoutDetails;

  const entries = lines.map((line, index) => ({
    name: `Artikel ${index + 1}`,
    brand: "",
    oeNumber: "",
    priceCents: line.priceCents,
    quantity: line.quantity,
  }));

  const zonder = buildOrderDocument({ details: customer, entries });
  const met = check.ok
    ? buildOrderDocument({
        details: customer,
        entries,
        discount: {
          code: check.code.code,
          percent: check.code.percent,
          grossCents: check.discountGrossCents,
        },
      })
    : null;

  const samenvatting = (doc: typeof zonder) => ({
    artikelen: doc.itemsGrossCents,
    korting: doc.discount?.grossCents ?? 0,
    verzending: doc.shippingGrossCents,
    gratisVerzending: doc.shippingIsFree,
    totaal: doc.totalGrossCents,
    netto: doc.totalNetCents,
    btw: doc.totalVatCents,
    kloptOptelling:
      doc.totalGrossCents === doc.totalNetCents + doc.totalVatCents,
  });

  return Response.json({
    basis: baseGrossCents,
    keuring: check,
    zonderCode: samenvatting(zonder),
    metCode: met ? samenvatting(met) : null,
  });
}
