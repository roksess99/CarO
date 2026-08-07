import { getTranslations } from "next-intl/server";
import { CaroLockup } from "@/components/brand/caro-lockup";
import { CartButton } from "@/components/cart/cart-button";
import { CategoryNav } from "@/components/category-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "@/i18n/navigation";
import { getCatalogProvider } from "@/lib/catalog/provider";

export async function SiteHeader() {
  const t = await getTranslations("header");
  const categories = await getCatalogProvider().getCategories();

  return (
    <header className="border-b border-border">
      <div className="site-container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-6">
          <Link href="/" aria-label={t("homeAria")} className="rounded-sm">
            <CaroLockup className="text-2xl md:text-3xl" />
          </Link>
          <CategoryNav categories={categories} />
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <LocaleSwitcher />
          <ThemeToggle />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
