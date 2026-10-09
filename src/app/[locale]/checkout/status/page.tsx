import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClearCart } from "@/components/checkout/clear-cart";
import { Link } from "@/i18n/navigation";
import { formatDeliveryDay, formatPriceCents } from "@/lib/format";
import { invoiceForOrder } from "@/lib/invoices/store";
import { productLabel } from "@/lib/orders/product-label";
import { settleOrder } from "@/lib/orders/settle";
import { readOrder } from "@/lib/orders/store";
import type { StoredOrder } from "@/lib/orders/types";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string; t?: string }>;
};

// Persoonlijke pagina met een betaalstatus: nooit uit een cache, nooit
// prerenderen, en niet in de zoekmachine.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "orderStatus" });
  return {
    title: t("metaTitle"),
    // Bewust geen canonical of hreflang: deze URL hoort bij één bestelling
    robots: { index: false, follow: false },
  };
}

/**
 * De terugkeerpagina van het betaalscherm.
 *
 * **Landen op deze URL is geen bewijs van betaling.** De klant komt hier ook
 * na afbreken, en de URL is te typen. De status wordt daarom opgehaald bij
 * Stripe (`settleOrder`) en niet uit de querystring afgeleid. Diezelfde
 * functie handelt de bestelling af als de webhook nog niet binnen was — op een
 * ontwikkelmachine komt er sowieso geen binnen.
 */
export default async function OrderStatusPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { ref, t: token } = await searchParams;
  const t = await getTranslations("orderStatus");

  if (!ref || !token) notFound();

  const stored = await readOrder(ref);
  // Geen order, of een teken dat niet klopt: hetzelfde antwoord. Zou een
  // verkeerd teken een andere melding geven, dan is het kenmerk te raden.
  if (!stored || stored.accessToken !== token) notFound();

  let order: StoredOrder = stored;
  if (order.status !== "paid") {
    try {
      order = (await settleOrder(order.reference)) ?? order;
    } catch {
      // Stripe onbereikbaar of de mail mislukt: de klant ziet dan nog even de
      // "we controleren je betaling"-tekst. De webhook probeert het opnieuw.
    }
  }

  const paid = order.status === "paid";
  const failed = order.status === "failed";
  const state = paid ? "paid" : failed ? "failed" : "pending";

  // Het factuurnummer staat niet op de bestelling maar in de factuurreeks; het
  // ontstaat pas bij betaling (@docs/DECISIONS.md #12). Valt de database weg,
  // dan vervalt die ene regel en blijft de rest van de pagina staan — een
  // lezer op een pagina die de klant na zijn betaling opent hoort nooit de
  // hele pagina te laten vallen.
  let invoiceNumber: string | null = null;
  if (paid) {
    try {
      invoiceNumber = (await invoiceForOrder(order.reference))?.number ?? null;
    } catch {
      invoiceNumber = null;
    }
  }

  return (
    <div className="site-container py-12 md:py-16">
      {paid && <ClearCart />}
      <div className="mx-auto max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl md:text-4xl">{t(`${state}.title`)}</h1>
        <p className="mt-4 text-muted">
          {paid
            ? t("paid.body", { email: order.document.customer.email })
            : t(`${state}.body`)}
        </p>

        <div className="mt-8 rounded-lg border border-border bg-surface p-6 text-sm">
          <dl>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t("reference")}</dt>
              <dd className="font-semibold tabular-nums">{order.reference}</dd>
            </div>
            {/* Pas ná de betaling, en alleen als de reeks hem al heeft
                toegekend: het kenmerk hierboven is géén factuurnummer. */}
            {invoiceNumber && (
              <div className="mt-3 flex justify-between gap-4">
                <dt className="text-muted">{t("invoiceNumber")}</dt>
                <dd className="font-semibold tabular-nums">{invoiceNumber}</dd>
              </div>
            )}
            {/* Uit de bestelling, niet opnieuw opgehaald: wat hier staat is
                wat de klant bij het afrekenen las en wat in zijn mail staat.
                Alleen bij een geslaagde betaling — zonder bestelling valt er
                niets te bezorgen. */}
            {paid && order.document.deliveryExpected && (
              <div className="mt-3 flex justify-between gap-4">
                <dt className="text-muted">{t("deliveryLabel")}</dt>
                <dd className="font-semibold">
                  {t("deliveryValue", {
                    date: formatDeliveryDay(
                      order.document.deliveryExpected,
                      locale,
                    ),
                  })}
                </dd>
              </div>
            )}
          </dl>

          {/* Wat er besteld is, uit dezelfde bevroren momentopname als de
              factuur en de bevestigingsmail — niet uit de winkelwagen, die is
              hierboven net geleegd, en niet uit de catalogus van vandaag.
              Zelfde label als in de mail (`productLabel`), zodat de klant
              tweemaal hetzelfde leest. */}
          <ul className="mt-5 divide-y divide-border border-t border-border">
            {order.document.lines.map((line, index) => (
              <li
                key={`${line.oeNumber || line.name}-${index}`}
                className="flex items-baseline justify-between gap-4 py-3"
              >
                <span>
                  {productLabel(line)}{" "}
                  <span className="text-muted tabular-nums">
                    × {line.quantity}
                  </span>
                </span>
                <span className="font-medium tabular-nums">
                  {formatPriceCents(line.lineGrossCents)}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex justify-between gap-4 border-t border-border pt-3">
            <span className="text-muted">{t("shipping")}</span>
            <span className="tabular-nums">
              {order.document.shippingIsFree
                ? t("freeShipping")
                : formatPriceCents(order.document.shippingGrossCents)}
            </span>
          </div>
          <div className="mt-3 flex justify-between gap-4 text-base">
            <span className="font-bold">{t("total")}</span>
            <span className="font-bold tabular-nums">
              {formatPriceCents(order.document.totalGrossCents)}
            </span>
          </div>
        </div>

        {paid && <p className="mt-6 text-sm text-muted">{t("paid.delivery")}</p>}

        {/* Vanaf hier is de bestelling al bewezen — de bezoeker kwam binnen met
            het toegangsteken — dus de retourlink draagt hem mee en de klant
            hoeft niets in te typen. */}
        {paid && (
          <p className="mt-2 text-sm text-muted">
            {t.rich("paid.returns", {
              link: (chunks) => (
                <Link
                  href={{
                    pathname: "/returns",
                    query: { ref: order.reference, t: order.accessToken },
                  }}
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink"
          >
            {t("continue")}
          </Link>
          {!paid && (
            <Link
              href="/cart"
              className="rounded-md border border-border px-6 py-3 font-semibold"
            >
              {t("backToCart")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
