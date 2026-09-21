"use client";

import { useActionState } from "react";
import { ROLES, ROLE_LABELS } from "@/lib/admin/roles";
import { type InviteResult, sendInvite } from "./actions";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteResult, FormData>(
    sendInvite,
    undefined,
  );

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="invite-email" className="mb-1 block text-sm font-medium">
            Mailadres van de nieuwe beheerder
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-base"
          />
        </div>
        <div className="min-w-0">
          <label htmlFor="invite-role" className="mb-1 block text-sm font-medium">
            Rol
          </label>
          {/* Geen standaardkeuze op "eigenaar": de veiligste optie hoort
              vooraan te staan, zodat doorklikken zonder nadenken de minste
              rechten geeft en niet de meeste. */}
          <select
            id="invite-role"
            name="role"
            defaultValue="marketing"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-base text-foreground"
          >
            {ROLES.map((role) => (
              <option key={role} value={role} className="bg-background text-foreground">
                {ROLE_LABELS[role].naam}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-caro-orange px-5 py-2.5 font-semibold text-caro-ink disabled:opacity-60"
        >
          {pending ? "Bezig…" : "Uitnodigen"}
        </button>
      </form>

      <ul className="grid gap-1 text-xs text-muted sm:grid-cols-3">
        {ROLES.map((role) => (
          <li key={role}>
            <span className="font-medium text-foreground">
              {ROLE_LABELS[role].naam}
            </span>{" "}
            — {ROLE_LABELS[role].uitleg}
          </li>
        ))}
      </ul>

      <div role="status" aria-live="polite">
        {state && "error" in state && (
          <p className="text-sm text-danger">{state.error}</p>
        )}

        {state && "link" in state && (
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm">
              {state.mailed
                ? "De uitnodiging is gemaild. Hij werkt 48 uur."
                : "De uitnodiging staat klaar, maar de mail kon niet verstuurd worden. Geef de link met de hand door."}
            </p>
            {/* Ook bij een geslaagde mail: als hij in de spam belandt is dit
                de snelste weg, en de link is toch al bij de ontvanger bekend. */}
            <p className="mt-2 font-mono text-xs break-all text-muted">
              {state.link}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
