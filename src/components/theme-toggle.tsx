"use client";

import { useTranslations } from "next-intl";
import { useEffect, useSyncExternalStore } from "react";

// Eigen thema-logica ter vervanging van next-themes (verlaten package,
// React 19-warning door zijn geïnjecteerde <script>). Het init-script in
// [locale]/layout.tsx zet de class al vóór de eerste paint; dit component
// houdt de class, localStorage en systeemvoorkeur daarna in sync.

const STORAGE_KEY = "theme";
const THEME_EVENT = "caro-theme";

type Resolved = "light" | "dark";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", onChange);
  // "storage" dekt andere tabs; het eigen event dekt deze tab
  window.addEventListener("storage", onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    mql.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function getResolved(): Resolved {
  const pref = localStorage.getItem(STORAGE_KEY);
  if (pref === "light" || pref === "dark") {
    return pref;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(resolved: Resolved) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

export function ThemeToggle() {
  const t = useTranslations("themeToggle");
  // Server-snapshot null: vóór hydration is het thema onbekend (SSR kent
  // localStorage noch systeemvoorkeur); tot die tijd een neutrale knop.
  const resolved = useSyncExternalStore<Resolved | null>(
    subscribe,
    getResolved,
    () => null,
  );

  useEffect(() => {
    if (resolved) {
      applyTheme(resolved);
    }
  }, [resolved]);

  const isDark = resolved === "dark";
  const label = isDark ? t("light") : t("dark");

  function toggle() {
    const next: Resolved = getResolved() === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={toggle}
      className="inline-flex size-10 items-center justify-center rounded-md border border-border text-foreground hover:bg-surface"
    >
      {isDark ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  );
}
