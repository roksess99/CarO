"use client";

import { useTranslations } from "next-intl";
import { useActionState, useId, useState } from "react";
import {
  lookupOrderAction,
  submitReturnAction,
  type SubmitResult,
} from "@/components/returns/actions";
import { formatPriceCents } from "@/lib/format";
import { refundTotal } from "@/lib/returns/eligibility";
import type { LookupResult } from "@/lib/returns/lookup";
import { RETURN_REASONS, type ReturnReason } from "@/lib/returns/types";

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm";
const labelClass = "mb-1 block text-sm font-medium";
const buttonClass =
  "rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted";

const NOTHING: SubmitResult = { status: "idle" };

/**
 * Retour aanmelden, in twee stappen op één pagina.
 *
 * Stap 1 zoekt de bestelling op; stap 2 laat kiezen wat er terug gaat. Komt de
 * bezoeker via de link uit zijn bevestigingsmail, dan is stap 1 al gedaan
 * (`initial`) en begint hij meteen bij het kiezen.
 *
 * Het bedrag dat hier meeloopt komt uit dezelfde functie als die van de server
 * (`refundTotal`). Dat is geen dubbele logica maar precies het tegenovergestelde:
 * één rekensom op twee plekken uitgevoerd, zodat het scherm niet iets anders
 * kan beloven dan er wordt teruggeboekt.
 */
export function ReturnForm({
  initial,
  token,
}: {
  initial: LookupResult;
  token?: string;
}) {
  const t = useTranslations("returns");
  const [lookup, lookupAction, looking] = useActionState(
    lookupOrderAction,
    initial,
  );

  if (lookup.status === "ok" && lookup.order) {
    return <ChooseLines order={lookup.order} token={token} />;
  }

  return (
    <form action={lookupAction} noValidate className="space-y-4">
      {token && <input type="hidden" name="token" value={token} />}

      <div>
        <label htmlFor="ret-reference" className={labelClass}>
          {t("fields.reference")}
        </label>
        <input
          id="ret-reference"
          name="reference"
          required
          placeholder="CARO-20260924-G5QG"
          autoComplete="off"
          spellCheck={false}
          className={`${inputClass} font-mono tabular-nums uppercase`}
        />
        <p className="mt-1 text-sm text-muted">{t("fields.referenceHint")}</p>
      </div>

      <div>
        <label htmlFor="ret-email" className={labelClass}>
          {t("fields.email")}
        </label>
        <input
          id="ret-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
        <p className="mt-1 text-sm text-muted">{t("fields.emailHint")}</p>
      </div>

      {/* Eén melding voor "bestaat niet" en "adres klopt niet": het verschil
          noemen maakt van dit formulier een raadmachine (lib/returns/lookup). */}
      <div role="status" aria-live="polite">
        {lookup.status !== "idle" && lookup.status !== "ok" && (
          <p className="text-sm text-danger">{t(`lookup.${lookup.status}`)}</p>
        )}
      </div>

      <button type="submit" disabled={looking} className={buttonClass}>
        {looking ? t("searching") : t("search")}
      </button>
    </form>
  );
}

type FoundOrder = NonNullable<LookupResult["order"]>;

function ChooseLines({ order, token }: { order: FoundOrder; token?: string }) {
  const t = useTranslations("returns");
  const uid = useId();
  const [state, formAction, pending] = useActionState(
    submitReturnAction,
    NOTHING,
  );
  const [chosen, setChosen] = useState<Record<string, number>>({});

  if (state.status === "done") {
    return (
      <div
        role="status"
        className="rounded-lg border border-border bg-surface p-6"
      >
        <p className="text-lg font-bold">{t("done.title")}</p>
        <p className="mt-2">
          {t("done.reference")}{" "}
          <span className="font-mono font-bold tabular-nums">
            {state.reference}
          </span>
        </p>
        <p className="mt-2 text-sm text-muted">
          {t("done.amount", {
            amount: formatPriceCents(state.amountCents ?? 0),
          })}
        </p>
        <p className="mt-4 text-sm">{t("done.next")}</p>
      </div>
    );
  }

  const selectedGross = order.lines.reduce(
    (sum, line) => sum + line.unitGrossCents * (chosen[line.partId] ?? 0),
    0,
  );
  const isComplete = order.lines.every(
    (line) => (chosen[line.partId] ?? 0) >= line.returnable,
  );
  const refund = refundTotal({
    selectedGross,
    itemsGrossCents: order.itemsGrossCents,
    discountCents: order.discountCents,
    shippingGrossCents: order.shippingGrossCents,
    isComplete,
  });
  const nothingChosen = selectedGross === 0;

  return (
    <form action={formAction} noValidate className="space-y-6">
      <input type="hidden" name="reference" value={order.reference} />
      <input type="hidden" name="email" value={order.email} />
      {token && <input type="hidden" name="token" value={token} />}

      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-muted">{t("found")}</p>
        <p className="font-mono font-bold tabular-nums">{order.reference}</p>
      </div>

      <fieldset>
        <legend className="mb-2 font-bold">{t("whatBack")}</legend>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {order.lines.map((line) => (
            <li
              key={line.partId}
              className="flex flex-wrap items-center gap-3 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm">{line.name}</p>
                <p className="text-sm text-muted tabular-nums">
                  {formatPriceCents(line.unitGrossCents)}
                  {line.alreadyReturned > 0 &&
                    ` · ${t("alreadyReturned", { count: line.alreadyReturned })}`}
                </p>
              </div>
              <label
                htmlFor={`${uid}-${line.partId}`}
                className="text-sm text-muted"
              >
                {t("quantity")}
              </label>
              <input
                id={`${uid}-${line.partId}`}
                name={`qty-${line.partId}`}
                type="number"
                min={0}
                max={line.returnable}
                step={1}
                defaultValue={0}
                disabled={line.returnable === 0}
                onChange={(event) =>
                  setChosen((current) => ({
                    ...current,
                    [line.partId]: Math.min(
                      Math.max(0, Number(event.target.value) || 0),
                      line.returnable,
                    ),
                  }))
                }
                className="w-20 rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums"
              />
              <span className="text-sm text-muted tabular-nums">
                {t("ofOrdered", { count: line.returnable })}
              </span>
            </li>
          ))}
        </ul>
      </fieldset>

      {/* Het veld staat naast het label en niet erin. Een label dat het rondje
          omsluit maakt álle tekst eronder de naam van die optie, dus een
          schermlezer leest "Bedenktijd Je hebt veertien dagen na ontvangst om
          je bestelling te annuleren…" voor als naam. Nu is de naam kort en
          hangt de uitleg eraan als beschrijving. */}
      <fieldset>
        <legend className="mb-2 font-bold">{t("whyBack")}</legend>
        <div className="space-y-2">
          {RETURN_REASONS.map((reason: ReturnReason, index) => (
            <div key={reason} className="flex items-start gap-3 text-sm">
              <input
                id={`${uid}-${reason}`}
                type="radio"
                name="reason"
                value={reason}
                defaultChecked={index === 0}
                required
                aria-describedby={`${uid}-${reason}-hint`}
                className="mt-1"
              />
              <span>
                <label
                  htmlFor={`${uid}-${reason}`}
                  className="font-medium cursor-pointer"
                >
                  {t(`reasons.${reason}`)}
                </label>
                <span
                  id={`${uid}-${reason}-hint`}
                  className="block text-muted"
                >
                  {t(`reasonHints.${reason}`)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${uid}-note`} className={labelClass}>
          {t("fields.note")}
        </label>
        <textarea
          id={`${uid}-note`}
          name="note"
          rows={4}
          maxLength={1000}
          className={inputClass}
        />
        <p className="mt-1 text-sm text-muted">{t("fields.noteHint")}</p>
      </div>

      <div className="rounded-lg border-2 border-foreground p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted">{t("summary.items")}</span>
          <span className="tabular-nums">
            {formatPriceCents(refund.itemsCents)}
          </span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span className="text-muted">{t("summary.shipping")}</span>
          <span className="tabular-nums">
            {refund.shippingCents > 0
              ? formatPriceCents(refund.shippingCents)
              : t("summary.shippingStays")}
          </span>
        </div>
        <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold">
          <span>{t("summary.total")}</span>
          <span className="tabular-nums">
            {formatPriceCents(refund.totalCents)}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted">{t("summary.note")}</p>
      </div>

      <div role="status" aria-live="polite">
        {state.status !== "idle" && (
          <p className="text-sm text-danger">{t(`submit.${state.status}`)}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending || nothingChosen}
        className={buttonClass}
      >
        {pending ? t("sending") : t("submitButton")}
      </button>
    </form>
  );
}
