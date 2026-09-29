"use client";

import { useActionState, useState } from "react";
import { formatPriceCents } from "@/lib/format";
import {
  declineReturn,
  receiveReturn,
  refundReturn,
  type ReturnAdminResult,
} from "./actions";

const feedback = (state: ReturnAdminResult) => (
  <span role="status" aria-live="polite" className="text-sm">
    {state && "error" in state && (
      <span className="text-danger">{state.error}</span>
    )}
    {state && "ok" in state && <span className="text-muted">{state.ok}</span>}
  </span>
);

const primary =
  "rounded-md bg-caro-orange px-3 py-1.5 text-sm font-semibold text-caro-ink disabled:opacity-60";
const secondary =
  "rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface";

/** Pakket binnen. Ongevaarlijk, dus zonder bevestiging. */
export function ReceiveButton({ reference }: { reference: string }) {
  const [state, action, pending] = useActionState<ReturnAdminResult, FormData>(
    receiveReturn,
    undefined,
  );
  if (state && "ok" in state) {
    return <span className="text-sm text-muted">{state.ok}</span>;
  }
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="reference" value={reference} />
      <button type="submit" disabled={pending} className={secondary}>
        {pending ? "Bezig…" : "Pakket ontvangen"}
      </button>
      {feedback(state)}
    </form>
  );
}

/**
 * Terugbetalen, met een bevestiging én het bedrag in beeld.
 *
 * Dit is de enige knop in het paneel die geld verplaatst en hij kan niet
 * teruggedraaid worden. De bevestigingsstap noemt daarom het bedrag: "weet je
 * het zeker?" zonder getal erbij is geen bevestiging.
 *
 * Het bedrag staat in een veld zodat er mínder terugbetaald kan worden dan
 * gevraagd — een artikel dat beschadigd terugkomt is minder waard. Meer dan
 * het volle bedrag weigert de server.
 */
export function RefundButton({
  reference,
  amountCents,
}: {
  reference: string;
  amountCents: number;
}) {
  const [state, action, pending] = useActionState<ReturnAdminResult, FormData>(
    refundReturn,
    undefined,
  );
  const [asking, setAsking] = useState(false);
  const [euros, setEuros] = useState((amountCents / 100).toFixed(2));

  if (state && "ok" in state) {
    return <span className="text-sm font-medium">{state.ok}</span>;
  }

  if (!asking) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAsking(true)}
          className={primary}
        >
          Terugbetalen
        </button>
        {feedback(state)}
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="reference" value={reference} />
      {/* De server rekent in centen; dit veld toont euro's zoals de beheerder
          ze leest. Afronden gebeurt hier één keer, niet in de actie. */}
      <input
        type="hidden"
        name="amount"
        value={Math.round(Number(euros.replace(",", ".")) * 100) || amountCents}
      />
      <label className="text-sm text-muted">
        Bedrag €{" "}
        <input
          value={euros}
          onChange={(event) => setEuros(event.target.value)}
          inputMode="decimal"
          className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm tabular-nums"
        />
      </label>
      <span className="text-sm text-muted">
        van {formatPriceCents(amountCents)} — nu echt terugboeken?
      </span>
      <button type="submit" disabled={pending} className={primary}>
        {pending ? "Bezig…" : "Ja, terugboeken"}
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        className={secondary}
      >
        Nee
      </button>
      {feedback(state)}
    </form>
  );
}

/** Afwijzen kan alleen met een reden; die komt in de database en het logboek. */
export function DeclineButton({ reference }: { reference: string }) {
  const [state, action, pending] = useActionState<ReturnAdminResult, FormData>(
    declineReturn,
    undefined,
  );
  const [open, setOpen] = useState(false);

  if (state && "ok" in state) {
    return <span className="text-sm text-muted">{state.ok}</span>;
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOpen(true)} className={secondary}>
          Afwijzen
        </button>
        {feedback(state)}
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="reference" value={reference} />
      <input
        name="reason"
        required
        minLength={5}
        maxLength={190}
        placeholder="Reden, bv. gemonteerd geweest"
        className="w-64 rounded-md border border-border bg-background px-2 py-1 text-sm"
      />
      <button type="submit" disabled={pending} className={secondary}>
        {pending ? "Bezig…" : "Afwijzen"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className={secondary}>
        Annuleren
      </button>
      {feedback(state)}
    </form>
  );
}
