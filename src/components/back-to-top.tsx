"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/** Pas tonen als terugscrollen echt moeite kost */
const SHOW_AFTER_PX = 600;

/**
 * Knop terug naar de bovenkant.
 *
 * Onze categoriepagina's worden lang en de filters staan bovenaan; zonder
 * deze knop is dat op een telefoon veel vegen.
 *
 * Rechtsonder, maar op mobiel bóven de zwevende tabbalk — die staat daar al
 * en zou anders overlappen.
 */
export function BackToTop() {
  const t = useTranslations("common");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  function toTop() {
    // Respecteert de systeeminstelling voor minder beweging
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label={t("backToTop")}
      title={t("backToTop")}
      className="fixed end-4 bottom-28 z-30 inline-flex size-11 items-center justify-center rounded-md bg-caro-orange text-caro-ink shadow-lg lg:bottom-6"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
