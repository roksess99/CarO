"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { saveReview, type ReviewResult } from "@/app/[locale]/reviews/[token]/actions";

/**
 * Het beoordelingsformulier.
 *
 * **Radio's, geen sterrenwidget met JavaScript.** Vijf radio's in een
 * `<fieldset>` met een `<legend>` zijn met het toetsenbord te bedienen, een
 * schermlezer leest "Webshop, 4 van 5, keuzerondje", en het werkt zonder dat
 * er ook maar iets geladen hoeft te zijn. De sterren zijn puur de weergave
 * van diezelfde radio's.
 *
 * **Twee cijfers zijn verplicht, de rest niet.** De webshop en de bestelling
 * zijn twee verschillende vragen (zie lib/reviews/store.ts). Een cijfer per
 * artikel en een tekst mogen leeg blijven — de respons is het hele punt, en
 * een formulier dat om acht dingen vraagt krijgt er nul terug.
 */

export interface ReviewProductOption {
  partId: string;
  name: string;
}

const STEPS = [1, 2, 3, 4, 5];

/**
 * Vijf sterren met het cijfer eronder, en eronder in tekst wat er gekozen is.
 *
 * **Er stonden alleen sterren, en dat was verwarrend** (gemeld door de
 * eigenaar 2026-11-15). Twee dingen tegelijk:
 *
 * 1. **Geen cijfers.** De 1 tot en met 5 stonden er wel, maar `sr-only` — dus
 *    alleen voor een schermlezer. Wie kijkt zag vijf gelijke vormen en moest
 *    tellen.
 * 2. **De sterren vulden niet op.** De kleur hing aan `peer-checked`, en die
 *    raakt alleen de ster van de aangevinkte radio. GEMETEN: bij een keuze
 *    van 4 kleurde uitsluitend de vierde ster oranje en bleven 1 tot en met 3
 *    grijs. Dat leest als "één ster, de vierde" — en op een rij van vijf lijkt
 *    dat eerder op een 1 dan op een 4.
 *
 * De vulling loopt nu mee tot de gekozen ster. Dat vraagt om de keuze in
 * state: met alleen CSS kan een ster niet weten of een ster verderop
 * aangevinkt is zonder de volgorde in de HTML om te draaien, en dan staat de
 * tabvolgorde van 5 naar 1.
 *
 * **De radio's blijven het echte formulierveld.** `peer-checked` staat er
 * daarom nog steeds bij: zonder JavaScript licht de gekozen ster nog op en
 * verstuurt het formulier gewoon de waarde.
 */
function StarChoice({
  name,
  legend,
  hint,
  required,
}: {
  name: string;
  legend: string;
  hint?: string;
  required?: boolean;
}) {
  const t = useTranslations("review");
  const [chosen, setChosen] = useState(0);

  return (
    <fieldset>
      <legend className="text-sm font-semibold">{legend}</legend>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      <div className="mt-2 flex items-center gap-1">
        {STEPS.map((step) => {
          const filled = step <= chosen;
          return (
            <label
              key={step}
              className="cursor-pointer rounded-md px-1.5 py-1 text-center hover:bg-surface"
            >
              <input
                type="radio"
                name={name}
                value={step}
                required={required && step === 1}
                onChange={() => setChosen(step)}
                // Expliciet, niet via de tekst in het label eromheen. GEMETEN
                // in de toegankelijkheidsboom: daar heette het keuzerondje
                // gewoon "4", want het zichtbare cijfer is het enige dat
                // meetelt. Nu staat er "4 van 5".
                aria-label={t("ratingOption", { value: step })}
                className="peer sr-only"
              />
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className={`mx-auto size-8 peer-checked:text-caro-orange peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-caro-orange ${
                  filled ? "text-caro-orange" : "text-border"
                }`}
                fill="currentColor"
              >
                <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
              </svg>
              <span
                aria-hidden="true"
                className={`mt-0.5 block text-xs tabular-nums ${
                  filled ? "font-semibold text-foreground" : "text-muted"
                }`}
              >
                {step}
              </span>
            </label>
          );
        })}
      </div>
      {/* Alleen voor wie kijkt: een schermlezer heeft de keuze al voorgelezen
          toen de radio aangevinkt werd, dus dit zou een herhaling zijn.

          Pas tekst zodra er gekozen is. Een vaste "nog geen cijfer gekozen"
          stond vier keer onder elkaar op een formulier met twee verplichte en
          twee optionele vragen, en dat leest als een rij foutmeldingen. De
          hoogte staat wel vast (`min-h-5`), anders verspringt de pagina bij de
          eerste klik. */}
      <p aria-hidden="true" className="mt-1 min-h-5 text-sm text-muted">
        {chosen > 0 ? t("ratingChosen", { value: chosen }) : ""}
      </p>
    </fieldset>
  );
}

export function ReviewForm({
  token,
  suggestedName,
  products,
}: {
  token: string;
  suggestedName: string;
  products: ReviewProductOption[];
}) {
  const t = useTranslations("review");
  const [state, action, pending] = useActionState<ReviewResult, FormData>(
    saveReview,
    undefined,
  );
  const [anonymous, setAnonymous] = useState(false);
  const [name, setName] = useState(suggestedName);

  if (state && "ok" in state) {
    return (
      <div className="rounded-lg border border-border border-t-4 border-t-caro-orange bg-surface p-6">
        <h2 className="text-lg font-semibold">{t("thanksTitle")}</h2>
        <p className="mt-2 text-muted">{t("thanksBody")}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="token" value={token} />

      <StarChoice
        name="shopRating"
        legend={t("shopLegend")}
        hint={t("shopHint")}
        required
      />
      <StarChoice
        name="orderRating"
        legend={t("orderLegend")}
        hint={t("orderHint")}
        required
      />

      {products.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold">{t("productsLegend")}</h2>
          <p className="mt-0.5 text-sm text-muted">{t("productsHint")}</p>
          <ul className="mt-3 space-y-4">
            {products.map((product) => (
              <li key={product.partId}>
                <StarChoice
                  name={`part:${product.partId}`}
                  legend={product.name}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label htmlFor="body" className="mb-1 block text-sm font-semibold">
          {t("bodyLabel")}
        </label>
        <textarea
          id="body"
          name="body"
          rows={5}
          maxLength={2000}
          placeholder={t("bodyPlaceholder")}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-base"
        />
      </div>

      <div>
        <label htmlFor="displayName" className="mb-1 block text-sm font-semibold">
          {t("nameLabel")}
        </label>
        <input
          id="displayName"
          name="displayName"
          maxLength={60}
          value={anonymous ? "" : name}
          onChange={(event) => setName(event.target.value)}
          disabled={anonymous}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-base disabled:opacity-60"
        />
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="anonymous"
            value="1"
            checked={anonymous}
            onChange={(event) => setAnonymous(event.target.checked)}
            className="size-4"
          />
          {t("anonymous")}
        </label>
        <p className="mt-2 text-sm text-muted">{t("nameHint")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink disabled:opacity-60"
        >
          {pending ? t("sending") : t("send")}
        </button>
        <span role="status" aria-live="polite" className="text-sm">
          {state && "error" in state && (
            <span className="text-danger">{state.error}</span>
          )}
        </span>
      </div>
    </form>
  );
}
