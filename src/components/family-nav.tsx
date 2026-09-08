"use client";

import { useLocale, useTranslations } from "next-intl";
import { useVehicle } from "@/components/vehicle/use-vehicle";
import { useEffect, useRef, useState } from "react";
import {
  quickLinkChildrenAction,
  type QuickLinkChild,
} from "@/components/catalog/actions";
import {
  familySlug,
  NAV_GROUPS,
  type ProductFamily,
  usesVehicleCatalog,
} from "@/lib/catalog/families";
import { MAINTENANCE_LINKS } from "@/lib/catalog/quick-links";
import type { Category } from "@/lib/catalog/types";
import { Link } from "@/i18n/navigation";

export interface FamilyNavItem {
  family: ProductFamily;
  categories: Category[];
}

/** Categorieën per familie in het paneel; de rest via "alles bekijken" */
const CATEGORIES_PER_FAMILY = 8;


// Eén knop per productgroep in plaats van alles onder één menu. De groep
// "Assortiment" bundelt de twee onderdelen-families; de rest zijn losse
// knoppen met hun eigen categorieën eronder.
export function FamilyNav({ items }: { items: FamilyNavItem[] }) {
  const t = useTranslations("family");
  const tCommon = useTranslations("common");
  const carId = useVehicle()?.carId;
  const locale = useLocale();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Subgroepen achter Olie en Filters: pas ophalen als het menu opengaat, en
  // per auto onthouden. Zie components/catalog/actions.ts voor het waarom.
  const [quickChildren, setQuickChildren] = useState<
    Record<string, QuickLinkChild[]>
  >({});

  function openQuickMenu(key: string) {
    const next = openKey === key ? null : key;
    setOpenKey(next);
    if (next === null || !carId || quickChildren[key]) return;
    void quickLinkChildrenAction(carId, key).then((children) => {
      setQuickChildren((current) => ({ ...current, [key]: children }));
    });
  }

  useEffect(() => {
    if (!openKey) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpenKey(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        triggerRefs.current[openKey as string]?.focus();
        setOpenKey(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openKey]);

  const byFamily = new Map(items.map((item) => [item.family, item.categories]));

  return (
    <div ref={rootRef} className="flex items-center gap-0.5">
      {NAV_GROUPS.map((group) => {
        const families = group.families.filter((f) => byFamily.has(f));
        if (families.length === 0) return null;

        const open = openKey === group.key;
        const menuId = `nav-menu-${group.key}`;
        // Eén familie in de groep: de knop draagt de familienaam.
        // Meerdere: een groepsnaam met de families als kopjes eronder.
        const single = families.length === 1 ? families[0] : null;
        const label = single ? t(`${single}.title`) : t(`group.${group.key}`);
        const totalCategories = families.reduce(
          (sum, f) => sum + (byFamily.get(f)?.length ?? 0),
          0,
        );

        // Geen categorieën én één familie: gewoon een link, geen leeg menu
        if (single && totalCategories === 0) {
          return (
            <Link
              key={group.key}
              href={{
                pathname: "/[family]",
                params: { family: familySlug(single, locale) },
                // De onderdelencatalogus hangt aan een TecDoc-voertuig; met
                // de auto al in de link hoeft de pagina niet eerst te laden
                // en dan te herladen.
                ...(usesVehicleCatalog(single) && carId
                  ? { query: { auto: String(carId) } }
                  : {}),
              }}
              className="rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap text-foreground hover:bg-surface"
            >
              {label}
            </Link>
          );
        }

        return (
          <div key={group.key} className="relative">
            <button
              ref={(node) => {
                triggerRefs.current[group.key] = node;
              }}
              type="button"
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => setOpenKey(open ? null : group.key)}
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap text-foreground hover:bg-surface"
            >
              {label}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {open && (
              <nav
                id={menuId}
                aria-label={label}
                className={`absolute start-0 z-40 mt-2 rounded-lg border border-border bg-background p-4 shadow-xl ${
                  families.length > 1 || totalCategories > 6
                    ? "w-[min(40rem,calc(100vw-2rem))]"
                    : "w-64"
                }`}
              >
                <div
                  className={
                    families.length > 1 || totalCategories > 6
                      ? "grid grid-cols-2 gap-6"
                      : ""
                  }
                >
                  {families.map((family) => {
                    const slug = familySlug(family, locale);
                    const categories = byFamily.get(family) ?? [];
                    return (
                      <div key={family}>
                        <Link
                          href={{ pathname: "/[family]", params: { family: slug } }}
                          onClick={() => setOpenKey(null)}
                          className="block rounded-md px-2 py-1 text-sm font-bold text-foreground hover:bg-surface"
                        >
                          {t(`${family}.title`)}
                        </Link>
                        {categories.length > 0 && (
                          <ul className="mt-1">
                            {categories.slice(0, CATEGORIES_PER_FAMILY).map((category) => (
                              <li key={category.slug}>
                                <Link
                                  href={{
                                    pathname: "/[family]/[category]",
                                    params: { family: slug, category: category.slug },
                                  }}
                                  onClick={() => setOpenKey(null)}
                                  className="block truncate rounded-md px-2 py-1.5 text-sm text-muted hover:bg-surface hover:text-foreground"
                                >
                                  {category.name}
                                </Link>
                              </li>
                            ))}
                            {categories.length > CATEGORIES_PER_FAMILY && (
                              <li>
                                <Link
                                  href={{ pathname: "/[family]", params: { family: slug } }}
                                  onClick={() => setOpenKey(null)}
                                  className="block rounded-md px-2 py-1.5 text-sm text-muted underline underline-offset-4 hover:text-foreground"
                                >
                                  {t("viewAll")}
                                </Link>
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </nav>
            )}
          </div>
        );
      })}

      {/* Olie en Filters. Ze horen bij Onderdelen maar liggen daar verstopt
          tussen 36 hoofdgroepen — zie lib/catalog/quick-links.ts. Zelfde
          opbouw als de familieknoppen hiernaast: knop met een menu eronder,
          zodat de balk één patroon houdt. */}
      {MAINTENANCE_LINKS.map((link) => {
        const open = openKey === link.key;
        const menuId = `nav-menu-${link.key}`;
        const partsSlug = familySlug("onderdelen", locale);
        const children = quickChildren[link.key];
        const label = t(`quick.${link.key}`);

        return (
          <div key={link.key} className="relative">
            <button
              ref={(node) => {
                triggerRefs.current[link.key] = node;
              }}
              type="button"
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => openQuickMenu(link.key)}
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap text-foreground hover:bg-surface"
            >
              {label}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {open && (
              <nav
                id={menuId}
                aria-label={label}
                className="absolute end-0 z-40 mt-2 w-72 rounded-lg border border-border bg-background p-4 shadow-xl"
              >
                <Link
                  href={{
                    pathname: "/[family]/[category]",
                    params: { family: partsSlug, category: link.slug },
                    ...(carId ? { query: { auto: String(carId) } } : {}),
                  }}
                  onClick={() => setOpenKey(null)}
                  className="block rounded-md px-2 py-1 text-sm font-bold text-foreground hover:bg-surface"
                >
                  {label}
                </Link>

                {/* Zonder auto weten we niet welke subgroepen bestaan: de boom
                    hangt aan het voertuig. Dan alleen de hoofdlink, net als bij
                    Onderdelen. */}
                {carId && (
                  <ul className="mt-1">
                    {children === undefined ? (
                      <li className="px-2 py-1.5 text-sm text-muted">
                        {tCommon("loading")}
                      </li>
                    ) : (
                      children.map((child) => (
                        <li key={child.slug}>
                          <Link
                            href={{
                              pathname: "/[family]/[category]",
                              params: { family: partsSlug, category: child.slug },
                              query: { auto: String(carId) },
                            }}
                            onClick={() => setOpenKey(null)}
                            className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-surface hover:text-foreground"
                          >
                            <span className="truncate">{child.name}</span>
                            {child.articleCount !== undefined &&
                              child.articleCount > 0 && (
                                <span className="shrink-0 text-xs tabular-nums">
                                  {child.articleCount}
                                </span>
                              )}
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </nav>
            )}
          </div>
        );
      })}
    </div>
  );
}
