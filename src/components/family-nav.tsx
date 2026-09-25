"use client";

import { useLocale, useTranslations } from "next-intl";
import { useVehicle } from "@/components/vehicle/use-vehicle";
import { useEffect, useRef, useState } from "react";
import {
  quickLinkChildrenAction,
  type QuickLinkMenu,
} from "@/components/catalog/actions";
import {
  familySlug,
  PRODUCT_FAMILIES,
  usesVehicleCatalog,
} from "@/lib/catalog/families";
import { MAINTENANCE_GROUPS } from "@/lib/catalog/quick-links";
import { Link } from "@/i18n/navigation";

/**
 * De vier productfamilies in de tweede headerrij, plus Olie en Filters.
 *
 * **Een familie is een link, geen menu.** Banden, velgen en toebehoren
 * klapten tot 2026-09-17 uit naar hun categorieën; winkelkeuze van de
 * eigenaar is dat een klik meteen de familiepagina opent, zoals Onderdelen
 * dat altijd al deed. De categorieën staan op die pagina zelf als filterrij,
 * met de producten eronder — dus het paneel voegde een klik toe zonder
 * ergens eerder te komen. Het scheelt bovendien vier categorielijsten bij de
 * leverancier per paginaweergave.
 *
 * Olie en Filters blijven wél menu's, en dat is geen inconsequentie: hun
 * subgroepen hangen aan de gekozen auto (een Citroën C3 heeft er zeven onder
 * `Filter`, een McLaren 720S twee). Die lijst bestaat niet als pagina, dus er
 * valt niet naar door te linken.
 */
export function FamilyNav() {
  const t = useTranslations("family");
  const tCommon = useTranslations("common");
  const carId = useVehicle()?.carId;
  const locale = useLocale();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Het menu achter Olie en Filters: pas ophalen als het opengaat, en per
  // auto onthouden. Zie components/catalog/actions.ts voor het waarom — ook
  // de hoofdgroep zelf komt daaruit, want zijn nummer verschilt per auto.
  const [menus, setMenus] = useState<Record<string, QuickLinkMenu>>({});

  function openQuickMenu(key: string) {
    const next = openKey === key ? null : key;
    setOpenKey(next);
    if (next === null || !carId || menus[key]) return;
    void quickLinkChildrenAction(carId, key).then((menu) => {
      setMenus((current) => ({ ...current, [key]: menu }));
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

  return (
    <div ref={rootRef} className="flex items-center gap-0.5">
      {PRODUCT_FAMILIES.map((family) => (
        <Link
          key={family}
          href={{
            pathname: "/[family]",
            params: { family: familySlug(family, locale) },
            // De onderdelencatalogus hangt aan een TecDoc-voertuig; met de
            // auto al in de link hoeft de pagina niet eerst te laden en dan
            // te herladen.
            ...(usesVehicleCatalog(family) && carId
              ? { query: { auto: String(carId) } }
              : {}),
          }}
          className="rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap text-foreground hover:bg-surface"
        >
          {t(`${family}.title`)}
        </Link>
      ))}

      {/* Olie en Filters. Ze horen bij Onderdelen maar liggen daar verstopt
          tussen 36 hoofdgroepen — zie lib/catalog/quick-links.ts. */}
      {MAINTENANCE_GROUPS.map((link) => {
        const open = openKey === link.key;
        const menuId = `nav-menu-${link.key}`;
        const partsSlug = familySlug("onderdelen", locale);
        const menu = menus[link.key];
        const children = menu?.children;
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
                {/* Zonder auto (of zolang de boom nog niet binnen is) weten
                    we het groepsnummer niet; dan wijst de kop naar de
                    onderdelenpagina in plaats van naar een gokje. */}
                <Link
                  href={
                    menu?.slug
                      ? {
                          pathname: "/[family]/[category]" as const,
                          params: { family: partsSlug, category: menu.slug },
                          ...(carId ? { query: { auto: String(carId) } } : {}),
                        }
                      : {
                          pathname: "/[family]" as const,
                          params: { family: partsSlug },
                          ...(carId ? { query: { auto: String(carId) } } : {}),
                        }
                  }
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
