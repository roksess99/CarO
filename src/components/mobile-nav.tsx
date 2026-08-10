"use client";

import { useTranslations } from "next-intl";
import { Suspense, useEffect, useRef, useState } from "react";
import type { FamilyNavItem } from "@/components/family-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { familySlug } from "@/lib/catalog/families";
import { Link } from "@/i18n/navigation";

// Navigatielade voor mobiel. Op smalle schermen passen twee uitklapmenu's
// plus taal, thema en winkelwagen niet naast elkaar in de balk.
export function MobileNav({
  items,
  locale,
}: {
  items: FamilyNavItem[];
  locale: string;
}) {
  const t = useTranslations("nav");
  const tFamily = useTranslations("family");
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    // Achtergrond niet mee laten scrollen zolang de lade openstaat
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={t("openMenu")}
        onClick={() => setOpen(true)}
        className="inline-flex size-10 items-center justify-center rounded-md text-foreground hover:bg-surface"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-caro-ink/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            id="mobile-nav-panel"
            role="dialog"
            aria-modal="true"
            aria-label={t("menuAria")}
            tabIndex={-1}
            className="fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] flex-col overflow-y-auto bg-background p-4 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="eyebrow text-xs">{t("menuAria")}</span>
              <button
                type="button"
                aria-label={t("closeMenu")}
                onClick={() => setOpen(false)}
                className="inline-flex size-10 items-center justify-center rounded-md text-foreground hover:bg-surface"
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

            <nav aria-label={t("menuAria")} className="mt-4 flex-1">
              {items.map(({ family, categories }) => {
                const slug = familySlug(family, locale);
                return (
                  <section key={family} className="mb-6">
                    <Link
                      href={{ pathname: "/[family]", params: { family: slug } }}
                      onClick={() => setOpen(false)}
                      className="block rounded-md px-3 py-2 text-base font-bold text-foreground hover:bg-surface"
                    >
                      {tFamily(`${family}.title`)}
                    </Link>
                    {categories.length > 0 && (
                      <ul className="mt-1 border-l border-border pl-3">
                        {categories.map((category) => (
                          <li key={category.slug}>
                            <Link
                              href={{
                                pathname: "/[family]/[category]",
                                params: { family: slug, category: category.slug },
                              }}
                              onClick={() => setOpen(false)}
                              className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-surface"
                            >
                              {category.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </nav>

            <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
              <Suspense fallback={null}>
                <LocaleSwitcher />
              </Suspense>
              <ThemeToggle />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
