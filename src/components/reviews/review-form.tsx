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
 * van diezelfde radio's, met `peer-checked` in CSS.
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
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{legend}</legend>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      <div className="mt-2 flex items-center gap-1">
        {STEPS.map((step) => (
          <label
            key={step}
            className="cursor-pointer rounded-md p-1 hover:bg-surface"
          >
            <input
              type="radio"
              name={name}
              value={step}
              required={required && step === 1}
              className="peer sr-only"
            />
            {/* De ster hoort bij het label, dus de tekst mag niet dubbel
                voorgelezen worden; sr-only draagt de betekenis. */}
            <span className="sr-only">{step}</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-8 text-border peer-checked:text-caro-orange peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-caro-orange"
              fill="currentColor"
            >
              <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
            </svg>
          </label>
        ))}
      </div>
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
