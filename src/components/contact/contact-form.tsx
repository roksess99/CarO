"use client";

import { useTranslations } from "next-intl";
import { useActionState, useId } from "react";
import {
  type ContactState,
  sendContactMessageAction,
} from "@/components/contact/actions";
import { type ContactField, HONEYPOT_FIELD, MESSAGE_MAX } from "@/lib/contact/schema";

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm";
const labelClass = "mb-1 block text-sm font-medium";

const INITIAL: ContactState = { status: "idle" };

/**
 * Contactformulier.
 *
 * `useActionState` en geen eigen fetch: het formulier verstuurt naar een
 * Server Action, dus het werkt ook als het JavaScript nog niet geladen is.
 * De validatie draait daarom óók op de server — een controle in de browser
 * is een gemak voor de bezoeker, geen beveiliging.
 */
export function ContactForm() {
  const t = useTranslations("contact");
  const [state, formAction, pending] = useActionState(
    sendContactMessageAction,
    INITIAL,
  );
  const uid = useId();

  const fieldId = (field: string) => `${uid}-${field}`;
  const errorId = (field: string) => `${uid}-${field}-error`;
  const errorFor = (field: ContactField) => state.fieldErrors?.[field];

  if (state.status === "sent") {
    return (
      <div
        role="status"
        className="rounded-lg border border-border bg-surface p-6"
      >
        <p className="font-bold">{t("sentTitle")}</p>
        <p className="mt-2 text-sm text-muted">{t("sentBody")}</p>
      </div>
    );
  }

  const field = (
    name: ContactField,
    options: { type?: string; autoComplete?: string; rows?: number } = {},
  ) => {
    const error = errorFor(name);
    return (
      <div>
        <label htmlFor={fieldId(name)} className={labelClass}>
          {t(`fields.${name}`)}
        </label>
        {options.rows ? (
          <textarea
            id={fieldId(name)}
            name={name}
            rows={options.rows}
            maxLength={MESSAGE_MAX}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId(name) : undefined}
            className={`${inputClass} ${error ? "border-danger" : ""}`}
          />
        ) : (
          <input
            id={fieldId(name)}
            name={name}
            type={options.type ?? "text"}
            autoComplete={options.autoComplete}
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId(name) : undefined}
            className={`${inputClass} ${error ? "border-danger" : ""}`}
          />
        )}
        {/* Fout in tekst én gekoppeld aan het veld, niet alleen een rode rand */}
        {error && (
          <p id={errorId(name)} className="mt-1 text-sm text-danger">
            {t(`errors.${error}`)}
          </p>
        )}
      </div>
    );
  };

  return (
    <form action={formAction} noValidate className="space-y-4">
      {field("name", { autoComplete: "name" })}
      {field("email", { type: "email", autoComplete: "email" })}
      {field("subject")}
      {field("message", { rows: 7 })}

      {/* Honeypot. `hidden` en niet `display:none` via een klasse, zodat het
          ook zonder CSS wegblijft; tabIndex en aria-hidden houden het uit de
          toetsenbord- en schermlezervolgorde. Zie HONEYPOT_FIELD. */}
      <input
        type="text"
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        hidden
      />

      <div role="status" aria-live="polite">
        {state.error && (
          <p className="text-sm text-danger">{t(`errors.${state.error}`)}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted"
      >
        {pending ? t("sending") : t("submit")}
      </button>

      <p className="text-sm text-muted">{t("privacyNote")}</p>
    </form>
  );
}
