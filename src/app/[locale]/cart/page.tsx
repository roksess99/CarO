import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CartView } from "@/components/cart/cart-view";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCatalogProvider } from "@/lib/catalog/provider";

type Props = {
  params: Promise<{ locale: string }>;
};

// TODO: echte domeinnaam zodra hosting vaststaat (docs/DECISIONS.md #2)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cart" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: getPathname({ locale: locale as Locale, href: "/cart" }),
      languages: {
        nl: getPathname({ locale: "nl", href: "/cart" }),
        en: getPathname({ locale: "en", href: "/cart" }),
      },
    },
  };
}

export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cart");
  // Hele (mock)catalogus mee voor de lookup; zie TODO in CartView
  const parts = await getCatalogProvider().getParts();

  return (
    <div className="site-container py-12 md:py-16">
      <h1 className="text-3xl md:text-4xl">{t("title")}</h1>
      <div className="mt-8">
        <CartView parts={parts} />
      </div>
    </div>
  );
}
