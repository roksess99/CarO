import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClearCart } from "@/components/checkout/clear-cart";
import { Link } from "@/i18n/navigation";
import { formatPriceCents } from "@/lib/format";
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
 * De terugkeerpagina van Mollie.
 *
 * **Landen op deze URL is geen bewijs van betaling.** De klant komt hier ook
 * na afbreken, en de URL is te typen. De status wordt daarom opgehaald bij
 * Mollie (`settleOrder`) en niet uit de querystring afgeleid. Diezelfde
 * functie handelt de bestelling af als de webhook nog niet binnen was — op een
 * ontwikkelmachine kan Mollie er sowieso geen bezorgen.
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
      // Mollie onbereikbaar of de mail mislukt: de klant ziet dan nog even de
      // "we controleren je betaling"-tekst. De webhook probeert het opnieuw.
    }
  }

  const paid = order.status === "paid";
  const failed = order.status === "failed";
  const state = paid ? "paid" : failed ? "failed" : "pending";

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

        <dl className="mt-8 rounded-lg border border-border bg-surface p-6 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t("reference")}</dt>
            <dd className="font-semibold tabular-nums">{order.reference}</dd>
          </div>
          <div className="mt-3 flex justify-between gap-4">
            <dt className="text-muted">{t("total")}</dt>
            <dd className="font-semibold tabular-nums">
              {formatPriceCents(order.document.totalGrossCents)}
            </dd>
          </div>
        </dl>

        {paid && <p className="mt-6 text-sm text-muted">{t("paid.delivery")}</p>}

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
