"use client";

import { useActionState } from "react";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/admin/roles";
import { changeRole, type RoleResult } from "./actions";

/**
 * De rol van één beheerder wijzigen.
 *
 * Een keuzelijst met een knop ernaast, en niet een lijst die bij het wisselen
 * meteen opslaat. Rechten zijn geen voorkeur maar een besluit: er hoort een
 * handeling tussen te zitten die je bewust doet.
 *
 * De knop verschijnt pas als er iets veranderd is, zodat "Opslaan" nooit een
 * lege belofte is.
 */
export function RoleSelect({
  id,
  email,
  role,
}: {
  id: number;
  email: string;
  role: Role;
}) {
  const [state, action, pending] = useActionState<RoleResult, FormData>(
    changeRole,
    undefined,
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <label htmlFor={`rol-${id}`} className="sr-only">
        Rol van {email}
      </label>
      <select
        id={`rol-${id}`}
        name="role"
        defaultValue={role}
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
      >
        {ROLES.map((option) => (
          <option
            key={option}
            value={option}
            className="bg-background text-foreground"
          >
            {ROLE_LABELS[option].naam}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface disabled:opacity-60"
      >
        {pending ? "Bezig…" : "Opslaan"}
      </button>
      <span role="status" aria-live="polite" className="text-xs">
        {state && "error" in state && (
          <span className="text-danger">{state.error}</span>
        )}
        {state && "ok" in state && (
          <span className="text-muted">Opgeslagen</span>
        )}
      </span>
    </form>
  );
}
