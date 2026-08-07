"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/catalog/types";
import { Link } from "@/i18n/navigation";

// Uitklapmenu met categorieën (disclosure-patroon: aria-expanded + Escape
// + klik-buiten). De categorieën komen server-side uit de provider mee.
export function CategoryNav({ categories }: { categories: Category[] }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (categories.length === 0) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="category-menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface"
      >
        {t("categories")}
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
          id="category-menu"
          aria-label={t("categoriesAria")}
          className="absolute left-0 z-40 mt-2 w-56 rounded-lg border border-border bg-background p-2 shadow-lg"
        >
          <ul>
            {categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={{
                    pathname: "/[category]",
                    params: { category: category.slug },
                  }}
                  onClick={() => setOpen(false)}
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
}
