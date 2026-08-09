import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { OrderSummary } from "@/components/checkout/order-summary";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
};

// TODO: echte domeinnaam zodra hosting vaststaat (docs/DECISIONS.md #2)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: getPathname({ locale: locale as Locale, href: "/checkout" }),
      languages: {
        nl: getPathname({ locale: "nl", href: "/checkout" }),
        en: getPathname({ locale: "en", href: "/checkout" }),
      },
    },
  };
}

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("checkout");
  return (
    <div className="site-container py-12 md:py-16">
      <h1 className="text-3xl md:text-4xl">{t("title")}</h1>
      <div className="mt-8 flex flex-col-reverse gap-8 lg:flex-row lg:items-start lg:gap-12">
        <div className="flex-1 lg:max-w-xl">
          <CheckoutForm />
        </div>
        <aside className="w-full lg:max-w-sm">
          <OrderSummary />
        </aside>
      </div>
    </div>
  );
}
