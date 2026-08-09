"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { familySlug, type ProductFamily } from "@/lib/catalog/families";
import type { Category } from "@/lib/catalog/types";
import { Link } from "@/i18n/navigation";

export interface FamilyNavItem {
  family: ProductFamily;
  categories: Category[];
}

// Eén uitklapmenu per productfamilie, zodat "Onderdelen" en "Banden"
// zichtbaar twee aparte ingangen zijn (disclosure-patroon: aria-expanded,
// Escape en klik-buiten). Categorieën komen server-side uit de provider.
export function FamilyNav({ items }: { items: FamilyNavItem[] }) {
  const t = useTranslations("family");
  const locale = useLocale();
  const [openFamily, setOpenFamily] = useState<ProductFamily | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Partial<Record<ProductFamily, HTMLButtonElement | null>>>({});

  useEffect(() => {
    if (!openFamily) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenFamily(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        triggerRefs.current[openFamily as ProductFamily]?.focus();
        setOpenFamily(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openFamily]);

  return (
    <div ref={rootRef} className="flex items-center gap-1">
      {items.map(({ family, categories }) => {
        const slug = familySlug(family, locale);
        const open = openFamily === family;
        const menuId = `family-menu-${family}`;

        // Familie zonder categorieën: alleen een link naar de
        // overzichtspagina, die legt uit dat er nog geen aanbod is
        if (categories.length === 0) {
          return (
            <Link
              key={family}
              href={{ pathname: "/[family]", params: { family: slug } }}
              className="rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface"
            >
              {t(`${family}.title`)}
            </Link>
          );
        }

        return (
          <div key={family} className="relative">
            <button
              ref={(node) => {
                triggerRefs.current[family] = node;
              }}
              type="button"
              aria-expanded={open}
              aria-controls={menuId}
              onClick={() => setOpenFamily(open ? null : family)}
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface"
            >
              {t(`${family}.title`)}
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
                aria-label={t(`${family}.menuAria`)}
                className="absolute left-0 z-40 mt-2 w-60 rounded-lg border border-border bg-background p-2 shadow-lg"
              >
                <ul>
                  <li>
                    <Link
                      href={{ pathname: "/[family]", params: { family: slug } }}
                      onClick={() => setOpenFamily(null)}
                      className="block rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface"
                    >
                      {t("allIn", { family: t(`${family}.title`) })}
                    </Link>
                  </li>
                  <li aria-hidden="true" className="my-1 border-t border-border" />
                  {categories.map((category) => (
                    <li key={category.slug}>
                      <Link
                        href={{
                          pathname: "/[family]/[category]",
                          params: { family: slug, category: category.slug },
                        }}
                        onClick={() => setOpenFamily(null)}
                        className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-surface"
                      >
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        );
      })}
    </div>
  );
}
