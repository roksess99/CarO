"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import {
  searchSuggestionsAction,
  type SearchSuggestion,
} from "@/components/search/actions";
import { formatPriceCents } from "@/lib/format";

/** Wachten tot iemand uitgetypt is; elke aanroep kost zes Tyre24-calls */
const DEBOUNCE_MS = 350;

/** Onder dit aantal tekens zoeken we niet — zie actions.ts */
const MIN_TERM_LENGTH = 3;

export function SearchBox({
  action,
  id,
  defaultValue,
  className = "",
  autoFocus = false,
}: {
  /** Vertaald pad van de zoekpagina; het formulier blijft zonder JS werken */
  action: string;
  id: string;
  defaultValue?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const t = useTranslations("search");
  const locale = useLocale();
  const router = useRouter();
  const listId = useId();

  const [term, setTerm] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Resultaten samen met de term waar ze bij horen. Zo is "aan het laden"
  // af te leiden in plaats van los bij te houden — en kan de effectbody
  // zonder setState, wat cascaderende renders voorkomt.
  const [result, setResult] = useState<{
    term: string;
    items: SearchSuggestion[];
  }>({ term: "", items: [] });

  const rootRef = useRef<HTMLDivElement>(null);
  // Volgnummer van de laatste aanvraag: een traag antwoord op een oude term
  // mag een sneller antwoord op een nieuwere term niet overschrijven.
  const requestRef = useRef(0);

  const trimmed = term.trim();
  const longEnough = trimmed.length >= MIN_TERM_LENGTH;
  const ready = result.term === trimmed;
  const suggestions = ready && longEnough ? result.items : [];
  const loading = longEnough && !ready;

  useEffect(() => {
    if (!longEnough) return;
    const requestId = ++requestRef.current;
    const timer = setTimeout(async () => {
      const items = await searchSuggestionsAction(trimmed, locale);
      if (requestId !== requestRef.current) return;
      setResult({ term: trimmed, items });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmed, longEnough, locale]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const showList = open && longEnough;
  const hasResults = suggestions.length > 0;
  // Nieuwe resultaten kunnen korter zijn dan de vorige lijst; een index die
  // daarbuiten valt zou naar een niet-bestaande optie wijzen.
  const highlighted = activeIndex < suggestions.length ? activeIndex : -1;

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!showList || !hasResults) return;

    // Functionele updater: bij ingedrukt houden of snel typen volgen twee
    // toetsaanslagen elkaar binnen één render op, en dan leest een directe
    // berekening nog de vorige index.
    const clamp = (i: number) => (i < suggestions.length ? i : -1);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (clamp(i) + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => {
        const current = clamp(i);
        return current <= 0 ? suggestions.length - 1 : current - 1;
      });
    } else if (event.key === "Enter" && highlighted >= 0) {
      // Een gekozen suggestie wint van het formulier: direct naar het
      // artikel in plaats van naar de resultatenpagina.
      event.preventDefault();
      router.push(suggestions[highlighted].href);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <form action={action} role="search">
        <label htmlFor={id} className="sr-only">
          {t("label")}
        </label>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="pointer-events-none absolute top-1/2 start-3 size-5 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          id={id}
          name="q"
          type="search"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t("placeholder")}
          autoComplete="off"
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={showList && hasResults}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            highlighted >= 0 ? `${listId}-${highlighted}` : undefined
          }
          className="w-full rounded-md border border-border bg-background py-2 pe-20 ps-10 text-sm"
        />
        <button
          type="submit"
          className="absolute top-1/2 end-1 -translate-y-1/2 rounded-md bg-caro-orange px-4 py-1.5 text-sm font-semibold text-caro-ink"
        >
          {t("submit")}
        </button>
      </form>

      {showList && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-background shadow-xl">
          <ul id={listId} role="listbox" aria-label={t("suggestionsLabel")}>
            {suggestions.map((suggestion, index) => (
              <li key={suggestion.id}>
                <Link
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === highlighted}
                  href={suggestion.href}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm ${
                    index === highlighted ? "bg-surface" : ""
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">
                      {suggestion.name}
                    </span>
                    <span className="block truncate text-xs text-muted tabular-nums">
                      {suggestion.brand}
                      {suggestion.oeNumber ? ` · ${suggestion.oeNumber}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums">
                    {formatPriceCents(suggestion.priceCents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Statusregel i.p.v. een lege lijst: anders lijkt de zoekbalk stuk */}
          {!hasResults && (
            <p className="px-3 py-3 text-sm text-muted" role="status">
              {loading ? t("suggestionsLoading") : t("suggestionsEmpty")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
