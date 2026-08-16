"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useMemo, useRef, useState } from "react";

/**
 * Keuzelijst met zoekveld, in plaats van een native <select>.
 *
 * Een native select met zestig automerken is op een telefoon onwerkbaar: het
 * OS toont een lange lijst zonder zoekfunctie, met rijen die te klein zijn om
 * betrouwbaar te raken. Hier kun je typen om te filteren en zijn de rijen
 * 48px hoog.
 *
 * Onder sm hangt het paneel onderaan het scherm — daar zit de duim, en zo
 * blijft er ruimte voor het toetsenbord. Vanaf sm hangt het als gewone
 * dropdown onder de knop.
 */
export function SearchableSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
  disabled = false,
  /** Verschijnt links in de knop, bijvoorbeeld een stapnummer */
  leading,
  /** Rand oplichten omdat deze stap aan de beurt is */
  highlighted = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
  leading?: React.ReactNode;
  highlighted?: boolean;
}) {
  const t = useTranslations("common");
  const baseId = useId();
  const listId = `${baseId}-list`;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.toLowerCase().includes(needle));
  }, [options, query]);

  // Een index die buiten de gefilterde lijst valt zou naar niets wijzen
  const active = activeIndex < filtered.length ? activeIndex : 0;

  function close() {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // De actieve rij in beeld houden bij pijltjesnavigatie
  useEffect(() => {
    if (!open) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function choose(option: string) {
    onChange(option);
    close();
    triggerRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      triggerRef.current?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(filtered.length ? (active + 1) % filtered.length : 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        filtered.length ? (active <= 0 ? filtered.length - 1 : active - 1) : 0,
      );
    } else if (event.key === "Enter" && filtered[active]) {
      event.preventDefault();
      choose(filtered[active]);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        className={`flex min-h-12 w-full items-center gap-3 rounded-md border bg-background px-3 py-2 text-left disabled:cursor-not-allowed ${
          highlighted ? "border-caro-orange" : "border-border"
        }`}
      >
        {leading}
        <span className="sr-only">{label}</span>
        <span
          className={`min-w-0 flex-1 truncate text-sm ${
            value ? "font-medium" : "text-muted"
          }`}
        >
          {value || placeholder}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`size-4 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
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
        <>
          {/* Alleen op mobiel een scrim: daar dekt het paneel de pagina af */}
          <div
            aria-hidden="true"
            onClick={close}
            className="fixed inset-0 z-40 bg-caro-ink/60 sm:hidden"
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col rounded-t-2xl border-t border-border bg-background shadow-xl sm:absolute sm:inset-x-auto sm:top-full sm:bottom-auto sm:mt-1 sm:max-h-80 sm:w-full sm:rounded-lg sm:border"
          >
            <div className="border-b border-border p-2">
              <label htmlFor={`${baseId}-search`} className="sr-only">
                {label}
              </label>
              <input
                ref={inputRef}
                id={`${baseId}-search`}
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={t("filterPlaceholder")}
                autoComplete="off"
                className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm"
              />
            </div>

            {filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted">{t("noMatches")}</p>
            ) : (
              <ul
                ref={listRef}
                id={listId}
                role="listbox"
                aria-label={label}
                className="flex-1 overflow-y-auto overscroll-contain p-1"
              >
                {filtered.map((option, index) => {
                  const selected = option === value;
                  return (
                    <li key={option}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => choose(option)}
                        onMouseEnter={() => setActiveIndex(index)}
                        // 48px hoog: betrouwbaar te raken met een duim
                        className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-md px-3 text-left text-sm ${
                          index === active ? "bg-surface" : ""
                        } ${selected ? "font-semibold" : ""}`}
                      >
                        {option}
                        {selected && (
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="size-4 shrink-0 text-caro-orange"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m4 12.5 5 5L20 6.5" />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
