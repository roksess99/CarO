import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { OrderSummary } from "@/components/checkout/order-summary";
import { getPathname } from "@/i18n/navigation";
import { paymentsHealth, paymentsPossible } from "@/lib/payments";
import { localizedMetadata } from "@/lib/site";

type Props = {
  params: Promise<{ locale: string }>;
};

/**
 * Nooit uit de cache. Deze pagina draagt één gegeven dat van dít moment is:
 * kan er betaald worden (@docs/DECISIONS.md #29)?
 *
 * GEMETEN 2026-10-09 op caroparts.nl, en het was geen theorie. De Engelse
 * afrekenpagina stond tien van de tien keer op "Checkout is unavailable"
 * terwijl de Nederlandse gewoon open was — zelfde code, zelfde sleutel. De
 * antwoordkoppen verklaarden het:
 *
 *     x-nextjs-cache: HIT
 *     x-nextjs-prerender: 1
 *     cache-control: s-maxage=86400, stale-while-revalidate=31449600
 *
 * De pagina was één keer gerenderd toen er niet betaald kon worden, en dat
 * antwoord werd een etmaal lang uitgeserveerd — en daarna nog een jaar als
 * verouderd antwoord. Een `?x=`-cachebuster hielp niet. De twee talen liepen
 * uiteen omdat hun cache-regels op verschillende momenten zijn gevuld.
 *
 * Dit is erger dan een verouderde melding: hij werkt ook de andere kant op.
 * Een pagina die gerenderd is terwijl betalen kón, blijft een werkende
 * betaalknop tonen nadat de betaaldienst eruit ligt — precies de stille
 * storing waarvoor die melding is gebouwd.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    ...localizedMetadata(locale, (l) =>
      getPathname({ locale: l, href: "/checkout" }),
    ),
  };
}

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("checkout");
  // Kan er überhaupt betaald worden? Dat hoort de klant te weten vóórdat hij
  // zijn naam en adres invult, niet erna (@docs/DECISIONS.md #29). De uitkomst
  // staat vijf minuten in het geheugen, dus dit kost geen aanroep per bezoeker.
  const kanBetalen = paymentsPossible(await paymentsHealth());
  return (
    <div className="site-container py-12 md:py-16">
      <h1 className="text-3xl md:text-4xl">{t("title")}</h1>

      {!kanBetalen && (
        <div
          id="betalen-uit"
          role="status"
          className="mt-6 rounded-lg border border-danger bg-background p-4"
        >
          <p className="font-semibold text-danger">{t("paymentsDownTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("paymentsDownBody")}</p>
        </div>
      )}
      <div className="mt-8 flex flex-col-reverse gap-8 lg:flex-row lg:items-start lg:gap-12">
        <div className="flex-1 lg:max-w-xl">
          <CheckoutForm paymentsDown={!kanBetalen} />
        </div>
        <aside className="w-full lg:max-w-sm">
          <OrderSummary />
        </aside>
      </div>
    </div>
  );
}
