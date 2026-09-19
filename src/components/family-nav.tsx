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
  PRODUCT_FAMILIES,
  usesVehicleCatalog,
} from "@/lib/catalog/families";
import { MAINTENANCE_LINKS } from "@/lib/catalog/quick-links";
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
