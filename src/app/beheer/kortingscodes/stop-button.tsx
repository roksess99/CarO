"use client";

import { useActionState } from "react";
import { type CodeResult, endCode } from "./actions";

export function StopButton({ id, code }: { id: number; code: string }) {
  const [state, action, pending] = useActionState<CodeResult, FormData>(
    endCode,
    undefined,
  );

  return (
    <form
      action={action}
      onSubmit={(event) => {
        // Stoppen kan niet ongedaan gemaakt worden vanuit het paneel; er moet
        // dan een nieuwe code aangemaakt worden.
        if (!confirm(`Code "${code}" stoppen?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:border-danger hover:text-danger disabled:opacity-60"
      >
        {pending ? "Bezig…" : "Stoppen"}
      </button>
      <span role="status" aria-live="polite">
        {state && "error" in state && (
          <span className="ms-2 text-sm text-danger">{state.error}</span>
        )}
      </span>
    </form>
  );
}
