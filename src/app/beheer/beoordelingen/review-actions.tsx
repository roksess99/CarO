"use client";

import { useActionState, useState } from "react";
import {
  hide,
  inviteNow,
  inviteOrder,
  postReply,
  type ReviewAdminResult,
  unhide,
} from "./actions";

const feedback = (state: ReviewAdminResult) => (
  <span role="status" aria-live="polite" className="text-sm">
    {state && "error" in state && <span className="text-danger">{state.error}</span>}
    {state && "ok" in state && <span className="text-muted">{state.ok}</span>}
  </span>
);

/**
 * Eén bestelling nu uitnodigen, vóór de termijn om is.
 *
 * Met een bevestiging ertussen. Dit verstuurt een echte mail naar een echte
 * klant en kan niet teruggedraaid worden: er gaat er precies één per
 * bestelling uit, dus een misklik kost die klant zijn uitnodiging.
 */
export function InviteOrderButton({ reference }: { reference: string }) {
  const [state, action, pending] = useActionState<ReviewAdminResult, FormData>(
    inviteOrder,
    undefined,
  );
  const [asking, setAsking] = useState(false);

  if (state && "ok" in state) {
    return <span className="text-sm text-muted">{state.ok}</span>;
  }

  return (
    <form
      action={action}
      className="flex flex-wrap items-center justify-end gap-2"
    >
      <input type="hidden" name="reference" value={reference} />
      {asking ? (
        <>
          <span className="text-sm text-muted">Mail nu versturen?</span>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-caro-orange px-3 py-1.5 text-sm font-semibold text-caro-ink disabled:opacity-60"
          >
            {pending ? "Bezig…" : "Ja, versturen"}
          </button>
          <button
            type="button"
            onClick={() => setAsking(false)}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface"
          >
            Nee
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setAsking(true)}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface"
        >
          Nu uitnodigen
        </button>
      )}
      {feedback(state)}
    </form>
  );
}

/** Uitnodigingen nu versturen, zonder te wachten op de dagelijkse taak */
export function InviteButton() {
  const [state, action, pending] = useActionState<ReviewAdminResult, FormData>(
    inviteNow,
    undefined,
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface disabled:opacity-60"
      >
        {pending ? "Bezig…" : "Nu uitnodigen"}
      </button>
      {feedback(state)}
    </form>
  );
}

export function ReplyForm({ id, current }: { id: number; current: string | null }) {
  const [state, action, pending] = useActionState<ReviewAdminResult, FormData>(
    postReply,
    undefined,
  );
  const [open, setOpen] = useState(false);

  if (!open && !current) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface"
      >
        Antwoorden
      </button>
    );
  }

  return (
    <form action={action} className="mt-3 w-full">
      <input type="hidden" name="id" value={id} />
      <label htmlFor={`reply-${id}`} className="mb-1 block text-sm font-medium">
        {current ? "Antwoord aanpassen" : "Openbaar antwoord"}
      </label>
      <textarea
        id={`reply-${id}`}
        name="reply"
        rows={3}
        maxLength={2000}
        defaultValue={current ?? ""}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-caro-orange px-4 py-2 text-sm font-semibold text-caro-ink disabled:opacity-60"
        >
          {pending ? "Bezig…" : "Plaatsen"}
        </button>
        {feedback(state)}
      </div>
    </form>
  );
}

/**
 * Verbergen vraagt om een reden, en dat is geen formaliteit: die reden komt
 * in de database en in het logboek. Zonder dat spoor is niet aantoonbaar dat
 * je verbergt om misbruik en niet om een laag cijfer.
 */
export function HideForm({ id }: { id: number }) {
  const [state, action, pending] = useActionState<ReviewAdminResult, FormData>(
    hide,
    undefined,
  );
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:border-danger hover:text-danger"
      >
        Verbergen
      </button>
    );
  }

  return (
    <form action={action} className="mt-3 w-full">
      <input type="hidden" name="id" value={id} />
      <label htmlFor={`reason-${id}`} className="mb-1 block text-sm font-medium">
        Reden om te verbergen
      </label>
      <input
        id={`reason-${id}`}
        name="reason"
        required
        minLength={5}
        maxLength={190}
        placeholder="Scheldwoorden / adres van een derde / gaat niet over deze bestelling"
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      <p className="mt-1 text-xs text-muted">
        Alleen bij misbruik. Een lage beoordeling verbergen mag niet — antwoord
        er liever op.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-danger px-4 py-2 text-sm font-semibold text-danger disabled:opacity-60"
        >
          {pending ? "Bezig…" : "Verbergen"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-muted underline underline-offset-4"
        >
          Annuleren
        </button>
        {feedback(state)}
      </div>
    </form>
  );
}

export function UnhideButton({ id }: { id: number }) {
  const [state, action, pending] = useActionState<ReviewAdminResult, FormData>(
    unhide,
    undefined,
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface disabled:opacity-60"
      >
        {pending ? "Bezig…" : "Weer tonen"}
      </button>
      {feedback(state)}
    </form>
  );
}
