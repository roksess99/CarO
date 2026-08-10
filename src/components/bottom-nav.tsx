"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { FamilyNavItem } from "@/components/family-nav";
import { useCart } from "@/components/cart/use-cart";
import { useVehicle } from "@/components/vehicle/use-vehicle";
import { countItems } from "@/lib/cart/cart";
import { familySlug, NAV_GROUPS } from "@/lib/catalog/families";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * Zwevende tabbalk onderaan, zoals in apps: de vijf belangrijkste acties
 * altijd onder je duim. Vervangt op mobiel en tablet de hamburger.
 *
 * Kleur volgt docs/BRAND.md: donker vlak (--caro-ink) met oranje accent.
 * Oranje op ink haalt 6,6:1 en is daarmee de enige toegestane combinatie
 * voor oranje tekst.
 */
/** Streepje bovenaan de actieve tab, zoals in de referentie */
function Indicator() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-caro-orange"
    />
  );
}

export function BottomNav({ items }: { items: FamilyNavItem[] }) {
  const t = useTranslations("bottomNav");
  const tFamily = useTranslations("family");
  const locale = useLocale();
  const pathname = usePathname();
  const cartCount = countItems(useCart());
  const vehicle = useVehicle();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const assortmentRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        assortmentRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  function closeDrawer() {
    setDrawerOpen(false);
    setGroupKey(null);
  }

  const byFamily = new Map(items.map((item) => [item.family, item.categories]));
  const groups = NAV_GROUPS.map((group) => ({
    key: group.key,
    families: group.families.filter((f) => byFamily.has(f)),
  })).filter((group) => group.families.length > 0);
  const activeGroup = groups.find((group) => group.key === groupKey);
  const groupLabel = (group: (typeof groups)[number]) =>
    group.families.length === 1
      ? tFamily(`${group.families[0]}.title`)
      : tFamily(`group.${group.key}`);

  const isHome = pathname === "/";
  const isSearch = pathname === "/search";
  const isCart = pathname === "/cart";

  const tab =
    "relative flex flex-1 flex-col items-center gap-1 rounded-xl px-1 pt-3 pb-2 text-xs font-medium";
  const active = "text-caro-orange";
  const inactive = "text-white/60";

  return (
    <>
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-caro-ink/70"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("assortment")}
            tabIndex={-1}
            // Onderin verankerd: begint waar de duim al is
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-2xl border-t border-border bg-background pb-24"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              {activeGroup ? (
                <button
                  type="button"
                  onClick={() => setGroupKey(null)}
                  className="-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm font-semibold text-foreground hover:bg-surface"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  {t("back")}
                </button>
              ) : (
                <span className="eyebrow text-xs">{t("assortment")}</span>
              )}
              <button
                type="button"
                aria-label={t("close")}
                onClick={closeDrawer}
                className="-mr-2 inline-flex size-10 items-center justify-center rounded-md text-foreground hover:bg-surface"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav aria-label={t("assortment")} className="flex-1 overflow-y-auto p-2">
              {!activeGroup ? (
                <ul className="space-y-0.5">
                  {groups.map((group) => (
                    <li key={group.key}>
                      <button
                        type="button"
                        onClick={() => setGroupKey(group.key)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3.5 text-left text-base font-semibold text-foreground hover:bg-surface"
                      >
                        {groupLabel(group)}
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="size-5 shrink-0 text-muted"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-4">
                  {activeGroup.families.map((family) => {
                    const slug = familySlug(family, locale);
                    const categories = byFamily.get(family) ?? [];
                    return (
                      <div key={family}>
                        <Link
                          href={{ pathname: "/[family]", params: { family: slug } }}
                          onClick={closeDrawer}
                          className="flex items-center justify-between gap-3 rounded-lg bg-surface px-4 py-3 text-base font-bold text-foreground"
                        >
                          {tFamily(`${family}.title`)}
                          <span className="text-sm font-normal text-muted">
                            {tFamily("viewAll")}
                          </span>
                        </Link>
                        {categories.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {categories.map((category) => (
                              <li key={category.slug}>
                                <Link
                                  href={{
                                    pathname: "/[family]/[category]",
                                    params: { family: slug, category: category.slug },
                                  }}
                                  onClick={closeDrawer}
                                  className="block rounded-lg px-4 py-3 text-sm text-muted hover:bg-surface hover:text-foreground"
                                >
                                  {category.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </nav>
          </div>
        </>
      )}

      {/* pb-[env(safe-area-inset-bottom)]: ruimte voor de home-indicator op iOS */}
      <div className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <nav
          aria-label={t("label")}
          className="mx-auto flex max-w-lg items-stretch gap-1 rounded-2xl bg-caro-ink px-2 shadow-lg ring-1 ring-white/10"
        >
          <Link
            href="/"
            aria-current={isHome ? "page" : undefined}
            className={`${tab} ${isHome ? active : inactive}`}
          >
            {isHome && <Indicator />}
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-6"
              fill={isHome ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            >
              <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
            </svg>
            {t("home")}
          </Link>

          <button
            ref={assortmentRef}
            type="button"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            className={`${tab} ${drawerOpen ? active : inactive}`}
          >
            {drawerOpen && <Indicator />}
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            >
              <path d="m12 3 9 5-9 5-9-5z" />
              <path d="m3 12 9 5 9-5" />
              <path d="m3 16.5 9 5 9-5" />
            </svg>
            {t("assortment")}
          </button>

          <Link
            href="/search"
            aria-current={isSearch ? "page" : undefined}
            className={`${tab} ${isSearch ? active : inactive}`}
          >
            {isSearch && <Indicator />}
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            {t("search")}
          </Link>

          <Link
            href="/cart"
            aria-current={isCart ? "page" : undefined}
            className={`${tab} ${isCart ? active : inactive}`}
          >
            {isCart && <Indicator />}
            <span className="relative">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="20" r="1.5" />
                <circle cx="17.5" cy="20" r="1.5" />
                <path d="M2 3h2.5l2.6 12.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L20.5 8H6" />
              </svg>
              {cartCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 -right-2 flex size-4.5 items-center justify-center rounded-full bg-caro-orange px-1 text-[0.625rem] font-bold text-caro-ink tabular-nums"
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </span>
            <span className="sr-only">
              {t("cartAria", { count: cartCount })}
            </span>
            <span aria-hidden="true">{t("cart")}</span>
          </Link>

          {/* Kentekenzoeker staat op de homepage; de gekozen auto tonen we
              hier als bevestiging dat hij actief is */}
          <Link
            href="/"
            className={`${tab} ${inactive}`}
            aria-label={
              vehicle ? t("vehicleSelected", { plate: vehicle.plateFormatted }) : t("vehicle")
            }
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className={`size-6 ${vehicle ? "text-caro-orange" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 13h14l-1.5-4.5A2 2 0 0 0 15.6 7H8.4a2 2 0 0 0-1.9 1.5z" />
              <path d="M4 13h16v4H4z" />
              <circle cx="7.5" cy="17" r="1" />
              <circle cx="16.5" cy="17" r="1" />
            </svg>
            <span aria-hidden="true" className={vehicle ? "text-caro-orange" : ""}>
              {vehicle ? vehicle.plateFormatted : t("vehicle")}
            </span>
          </Link>
        </nav>
      </div>
    </>
  );
}
