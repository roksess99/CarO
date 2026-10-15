"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * De strook onderaan over wat de winkel op je apparaat zet.
 *
 * **Dit is geen toestemmingsbanner, en dat is geen woordenspel.** De
 * toestemmingsplicht van art. 11.7a Telecommunicatiewet gaat over opslag die
 * niet nodig is om de site te laten werken; alles wat deze winkel neerzet is
 * noodzakelijk (winkelwagen, bezorggegevens) of een keuze van de bezoeker
 * zelf (taal, thema, zijn auto), en er is geen enkele derde partij in de
 * browser (@docs/DECISIONS.md #16, @docs/PRIVACY.md).
 *
 * Vragen zou hier dus **misleidend** zijn: op "weigeren" klikken zou moeten
 * betekenen dat de winkelwagen leeg blijft, en dat is geen keuze. Deze strook
 * vertelt het daarom alleen, met één knop om hem weg te doen en een link naar
 * de verklaring. Gevraagd door de eigenaar op 2026-10-14.
 *
 * **Komt er ooit iets bij van buiten** — analytics, een advertentiepixel, een
 * ingesloten YouTube-speler, een chatwidget — dan is dit niet genoeg en moet
 * er een echte banner mét voorafgaande blokkering komen: weigeren net zo
 * makkelijk als accepteren, en niets laden voordat er geklikt is. Vervang dan
 * dit bestand, hergebruik het niet.
 */

/** Zelfde voorvoegsel als de rest van onze opslag; staat in de privacytabel */
const KEY = "caro-cookie-notice";
const SEEN = "gelezen";

/**
 * Of de strook al weggeklikt is, gelezen als externe toestand.
 *
 * `useSyncExternalStore` in plaats van een effect dat state zet, en dat is
 * hier precies waar hij voor bedoeld is: de waarde staat in de browser van de
 * bezoeker en de server kent hem niet. Op de server is het antwoord daarom
 * "weggeklikt" — dan staat de strook niet in de HTML en flitst hij niet bij
 * iedereen die hem allang kent.
 */
let dismissed = false;
let listeners: Array<() => void> = [];

function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((entry) => entry !== listener);
  };
}

function read(): boolean {
  if (dismissed) return true;
  try {
    return localStorage.getItem(KEY) === SEEN;
  } catch {
    // Opslag geweigerd (privévenster) of vol: dan verschijnt de strook bij
    // elke verse paginalading opnieuw. Hinderlijker dan nodig, nooit kapot.
    return false;
  }
}

function dismiss(): void {
  // Eerst in het geheugen, dán pas opslaan. Kan de browser niets bewaren, dan
  // moet de knop nog steeds werken — anders klikt de bezoeker op "begrepen"
  // en blijft de strook staan.
  dismissed = true;
  try {
    localStorage.setItem(KEY, SEEN);
  } catch {
    // Niet kunnen onthouden is geen reden om hem te laten staan.
  }
  for (const listener of listeners) listener();
}

export function CookieNotice() {
  const t = useTranslations("cookies");
  const seen = useSyncExternalStore(subscribe, read, () => true);

  if (seen) return null;

  return (
    <div
      // bottom-28 op mobiel: de zwevende tabbalk staat op bottom-0 en is ruim
      // vier rem hoog. Eronder zou de strook de navigatie afdekken — zelfde
      // reden als bij de knop terug naar boven. lg:bottom-0 omdat die balk
      // daar niet bestaat.
      className="fixed inset-x-0 bottom-28 z-40 px-3 lg:bottom-0 lg:px-6 lg:pb-4"
      role="region"
      aria-label={t("label")}
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-border bg-background p-4 shadow-lg">
        <p className="min-w-56 flex-1 text-sm text-muted">
          {t("text")}{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-4 hover:text-foreground"
          >
            {t("link")}
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md bg-caro-orange px-4 py-2 text-sm font-semibold text-caro-ink"
        >
          {t("ok")}
        </button>
      </div>
    </div>
  );
}
