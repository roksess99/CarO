"use client";

import { useTranslations } from "next-intl";
import { useEffect, useSyncExternalStore } from "react";

// Eigen thema-logica ter vervanging van next-themes (verlaten package,
// React 19-warning door zijn geïnjecteerde <script>). Het init-script in
// [locale]/layout.tsx zet de class al vóór de eerste paint; dit component
// houdt de class, localStorage en systeemvoorkeur daarna in sync.
//
// **Drie standen, niet twee.** GEVONDEN 2026-09-21: de knop wisselde alleen
// tussen licht en donker, en schreef die keuze weg. Wie één keer geklikt had
// zat er voorgoed aan vast — de site volgde zijn telefoon nooit meer, ook niet
// als die 's avonds vanzelf op donker gaat. Er was geen weg terug, want
// "volg mijn apparaat" is de afwezigheid van een opgeslagen waarde en daar
// kwam je met twee standen nooit meer in.
//
// De volgorde is apparaat → licht → donker → apparaat.

const STORAGE_KEY = "theme";
const THEME_EVENT = "caro-theme";

/** Wat de bezoeker gekozen heeft. `system` = niets opgeslagen. */
type Choice = "system" | "light" | "dark";
/** Wat dat op dít moment oplevert */
type Resolved = "light" | "dark";
/**
 * Eén string, want `useSyncExternalStore` vergelijkt met `Object.is`: geef je
 * per aanroep een nieuw object terug, dan denkt React dat er steeds iets
 * veranderd is en rendert hij zichzelf vast.
 */
type Snapshot = `${Choice}:${Resolved}`;

const NEXT: Record<Choice, Choice> = {
  system: "light",
  light: "dark",
  dark: "system",
};

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

/**
 * localStorage kan gooien (privémodus, geblokkeerde site-gegevens). Dan is er
 * geen keuze en volgen we gewoon het apparaat — een winkel die omvalt omdat
 * iemand zijn opslag dichtzet is erger dan een vergeten voorkeur.
 */
function storedChoice(): Choice {
  try {
    const pref = localStorage.getItem(STORAGE_KEY);
    return pref === "light" || pref === "dark" ? pref : "system";
  } catch {
    return "system";
  }
}

function systemResolved(): Resolved {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getSnapshot(): Snapshot {
  const choice = storedChoice();
  return `${choice}:${choice === "system" ? systemResolved() : choice}`;
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
  const snapshot = useSyncExternalStore<Snapshot | null>(
    subscribe,
    getSnapshot,
    () => null,
  );

  const [choice, resolved] = snapshot
    ? (snapshot.split(":") as [Choice, Resolved])
    : [null, null];

  useEffect(() => {
    if (resolved) {
      applyTheme(resolved);
    }
  }, [resolved]);

  // Het label zegt wat de klik dóét; het pictogram toont waar je nu staat.
  const label = t(NEXT[choice ?? "system"]);

  function toggle() {
    const next = NEXT[storedChoice()];
    try {
      if (next === "system") {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // Niets op te slaan: het thema geldt dan alleen voor deze pagina
    }
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
      {choice === "light" ? (
        // Zon
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
      ) : choice === "dark" ? (
        // Maan
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
      ) : (
        // Beeldscherm: volgt het apparaat. Ook de neutrale stand vóór hydration.
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
          <rect x="2.5" y="4" width="19" height="12" rx="2" />
          <path d="M9 20h6M12 16v4" />
        </svg>
      )}
    </button>
  );
}
