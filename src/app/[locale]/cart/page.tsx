import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CartView } from "@/components/cart/cart-view";
import { getPathname } from "@/i18n/navigation";
import { localizedMetadata } from "@/lib/site";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cart" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    ...localizedMetadata(locale, (l) => getPathname({ locale: l, href: "/cart" })),
  };
}

export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("cart");
  return (
    <div className="site-container py-12 md:py-16">
      <h1 className="text-3xl md:text-4xl">{t("title")}</h1>
      <div className="mt-8">
        <CartView />
      </div>
    </div>
  );
}
