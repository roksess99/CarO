import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { CaroLockup } from "@/components/brand/caro-lockup";
import { CartButton } from "@/components/cart/cart-button";
import { FamilyNav, type FamilyNavItem } from "@/components/family-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SiteSearch } from "@/components/site-search";
import { ThemeToggle } from "@/components/theme-toggle";
import { VehicleBar } from "@/components/vehicle/vehicle-bar";
import { VehicleButton } from "@/components/vehicle/vehicle-button";
import { Link } from "@/i18n/navigation";
import { PRODUCT_FAMILIES } from "@/lib/catalog/families";
import { localizeCategories } from "@/lib/catalog/localized-categories";
import { getCatalogProvider } from "@/lib/catalog/provider";
import { vehicleMakeNames } from "@/lib/vehicle/makes";

export async function SiteHeader() {
  const t = await getTranslations("header");
  const locale = await getLocale();
  const makes = await vehicleMakeNames();
  const provider = getCatalogProvider();
  const items: FamilyNavItem[] = await Promise.all(
    PRODUCT_FAMILIES.map(async (family) => ({
      family,
      categories: await localizeCategories(await provider.getCategories(family)),
    })),
  );

  return (
    // Sticky: zoeken, navigatie en winkelwagen blijven bereikbaar bij scrollen
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="site-container flex h-16 items-center gap-3">
        <Link href="/" aria-label={t("homeAria")} className="shrink-0 rounded-sm">
          <CaroLockup className="text-2xl md:text-3xl" />
        </Link>

        {/* Voertuigknop direct naast het logo: het opgeven van je auto is de
            eerste stap van vrijwel elke aankoop, dus die verdient de plek
            vóór het zoeken. Onder md is er de tabbalk onderaan. */}
        <div className="hidden shrink-0 md:block">
          <VehicleButton makes={makes} />
        </div>

        {/* Zoekbalk krijgt de vrije ruimte; op mobiel staat hij eronder */}
        <div className="hidden max-w-xl flex-1 md:block">
          <SiteSearch locale={locale} id="header-search-desktop" />
        </div>

        <div className="ms-auto flex items-center gap-1 md:gap-2">
          {/* Ook op mobiel zichtbaar: dit zijn de enige twee plekken waar taal
              en thema te wijzigen zijn, en de tabbalk onderaan heeft er geen
              ruimte voor. */}
          <div className="flex items-center gap-0.5 md:gap-2">
            {/* De taalwisselaar leest de querystring om filters mee te nemen
                naar de andere taal; dat vraagt een Suspense-grens zodat
                pagina's statisch voorgerenderd kunnen blijven. */}
            <Suspense fallback={null}>
              <LocaleSwitcher />
            </Suspense>
            <ThemeToggle />
          </div>
          <div className="hidden md:block">
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

      {/* Mobiel: de gekozen auto als balk boven de zoekbalk. Die volgorde
          komt uit de apps van de grote onderdelenshops — eerst waarvoor je
          zoekt, dan wat je zoekt. */}
      <VehicleBar makes={makes} />

      <div className="site-container py-3 md:hidden">
        <SiteSearch locale={locale} id="header-search-mobile" />
      </div>
    </header>
  );
}
