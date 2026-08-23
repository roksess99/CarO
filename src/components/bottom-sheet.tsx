"use client";

import { useEffect, useRef } from "react";

/**
 * Paneel dat vanaf de onderkant omhoog komt.
 *
 * Onderin verankerd en niet vanaf de zijkant: op een telefoon zit de duim
 * daar al, en de vaste tabbalk staat er vlak onder.
 *
 * Regelt wat elk modaal paneel moet regelen — Escape sluit, achtergrond
 * scrollt niet mee, focus springt naar binnen en bij sluiten terug naar de
 * knop die het opende.
 */
export function BottomSheet({
  label,
  closeLabel,
  onClose,
  /** Knop die het paneel opende; krijgt de focus terug bij sluiten */
  returnFocusTo,
  header,
  children,
}: {
  label: string;
  closeLabel: string;
  onClose: () => void;
  returnFocusTo?: React.RefObject<HTMLElement | null>;
  header?: React.ReactNode;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Alleen het paneel zelf focussen als de inhoud dat niet al deed. De
    // kentekendrawer zet de focus op het invoerveld; die zou anders meteen
    // weer worden weggenomen.
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      panel.focus();
    }

    const button = returnFocusTo?.current;
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
      button?.focus();
    };
  }, [onClose, returnFocusTo]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-caro-ink/70"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        // pb-24: de tabbalk zweeft eroverheen en mag niets afdekken
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] flex-col rounded-t-2xl border-t border-border bg-background pb-24"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          {header ?? <span className="eyebrow text-xs">{label}</span>}
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="-me-2 inline-flex size-10 shrink-0 items-center justify-center rounded-md text-foreground hover:bg-surface"
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
        {children}
      </div>
    </>
  );
}
