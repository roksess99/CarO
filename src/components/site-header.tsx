import { getTranslations } from "next-intl/server";
import { CaroLockup } from "@/components/brand/caro-lockup";
import { CartButton } from "@/components/cart/cart-button";
import { FamilyNav, type FamilyNavItem } from "@/components/family-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { SelectedVehicle } from "@/components/vehicle/selected-vehicle";
import { Link } from "@/i18n/navigation";
import { PRODUCT_FAMILIES } from "@/lib/catalog/families";
import { getCatalogProvider } from "@/lib/catalog/provider";

export async function SiteHeader() {
  const t = await getTranslations("header");
  const provider = getCatalogProvider();
  const items: FamilyNavItem[] = await Promise.all(
    PRODUCT_FAMILIES.map(async (family) => ({
      family,
      categories: await provider.getCategories(family),
    })),
  );

  return (
    <header className="border-b border-border">
      <div className="site-container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-6">
          <Link href="/" aria-label={t("homeAria")} className="rounded-sm">
            <CaroLockup className="text-2xl md:text-3xl" />
          </Link>
          <FamilyNav items={items} />
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <SelectedVehicle />
          <LocaleSwitcher />
          <ThemeToggle />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
