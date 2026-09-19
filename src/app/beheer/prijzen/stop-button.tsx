"use client";

import { useActionState } from "react";
import { endPriceRule, type PriceRuleResult } from "./actions";

export function StopButton({ id, label }: { id: number; label: string }) {
  const [state, action, pending] = useActionState<PriceRuleResult, FormData>(
    endPriceRule,
    undefined,
  );

  return (
    <form
      action={action}
      onSubmit={(event) => {
        // Zodra deze regel weg is valt het artikel terug op de bredere regel,
        // of op de adviesprijs van de leverancier. Dat verandert de prijs in
        // de winkel meteen, dus even bevestigen.
        if (!confirm(`Prijsregel "${label}" stoppen?`)) event.preventDefault();
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
