"use client";

import { useActionState } from "react";
import { type DisableResult, revokeAdmin } from "./actions";

export function RevokeButton({ id, email }: { id: number; email: string }) {
  const [state, action, pending] = useActionState<DisableResult, FormData>(
    revokeAdmin,
    undefined,
  );

  return (
    <form
      action={action}
      onSubmit={(event) => {
        // Toegang intrekken is niet terug te draaien vanuit het paneel, dus
        // één bevestiging. Bewust de browserdialoog en geen eigen venster:
        // dit is de enige plek in het paneel waar het nodig is.
        if (!confirm(`Toegang intrekken voor ${email}?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:border-danger hover:text-danger disabled:opacity-60"
      >
        {pending ? "Bezig…" : "Toegang intrekken"}
      </button>
      <span role="status" aria-live="polite">
        {state && "error" in state && (
          <span className="ms-2 text-sm text-danger">{state.error}</span>
        )}
      </span>
    </form>
  );
}
