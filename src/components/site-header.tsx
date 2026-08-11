import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { CaroLockup } from "@/components/brand/caro-lockup";
import { CartButton } from "@/components/cart/cart-button";
import { FamilyNav, type FamilyNavItem } from "@/components/family-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteSearch } from "@/components/site-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { SelectedVehicle } from "@/components/vehicle/selected-vehicle";
import { Link } from "@/i18n/navigation";
import { PRODUCT_FAMILIES } from "@/lib/catalog/families";
import { getCatalogProvider } from "@/lib/catalog/provider";

export async function SiteHeader() {
  const t = await getTranslations("header");
  const locale = await getLocale();
  const provider = getCatalogProvider();
  const items: FamilyNavItem[] = await Promise.all(
    PRODUCT_FAMILIES.map(async (family) => ({
      family,
      categories: await provider.getCategories(family),
    })),
  );

  return (
    // Sticky: zoeken, navigatie en winkelwagen blijven bereikbaar bij scrollen
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="site-container flex h-16 items-center gap-3">
        <Link href="/" aria-label={t("homeAria")} className="shrink-0 rounded-sm">
          <CaroLockup className="text-2xl md:text-3xl" />
        </Link>

        {/* Zoekbalk krijgt de vrije ruimte; op mobiel staat hij eronder */}
        <div className="ml-auto hidden max-w-xl flex-1 md:block">
          <SiteSearch locale={locale} id="header-search-desktop" />
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0 md:gap-2">
          <SelectedVehicle />
          <div className="hidden md:flex md:items-center md:gap-2">
            {/* De taalwisselaar leest de querystring om filters mee te nemen
                naar de andere taal; dat vraagt een Suspense-grens zodat
                pagina's statisch voorgerenderd kunnen blijven. */}
            <Suspense fallback={null}>
              <LocaleSwitcher />
            </Suspense>
            <ThemeToggle />
          </div>
          <div className="hidden lg:block">
            <CartButton />
          </div>
        </div>
      </div>

      {/* Eigen rij voor de zes families: naast logo en zoekbalk passen ze niet
          op 1024px, en een categoriebalk over de volle breedte is bovendien
          wat klanten van een onderdelenshop gewend zijn. */}
      <div className="hidden border-t border-border lg:block">
        <div className="site-container">
          <FamilyNav items={items} />
        </div>
      </div>

      <div className="site-container pb-3 md:hidden">
        <SiteSearch locale={locale} id="header-search-mobile" />
      </div>
    </header>
  );
}
