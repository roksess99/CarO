"use client";

import { useActionState } from "react";
import { signIn, type SignInResult } from "../actions";

const labelClass = "mb-1 block text-sm font-medium";
const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-base";

export function LoginForm() {
  const [state, action, pending] = useActionState<SignInResult, FormData>(
    signIn,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className={labelClass}>
          Mailadres
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          aria-describedby={state?.error ? "login-error" : undefined}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          Wachtwoord
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-describedby={state?.error ? "login-error" : undefined}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="code" className={labelClass}>
          Code uit je app
        </label>
        <input
          id="code"
          name="code"
          // Numeriek toetsenbord op een telefoon, maar geen type="number":
          // die knipt een voorloopnul weg en toont pijltjes.
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          aria-describedby={state?.error ? "login-error" : undefined}
          className={`${inputClass} font-mono tracking-[0.3em] tabular-nums`}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink disabled:opacity-60"
      >
        {pending ? "Bezig…" : "Inloggen"}
      </button>

      {/* role="alert" zodat een schermlezer de fout hoort zonder te zoeken */}
      <div role="alert" aria-live="polite">
        {state?.error && (
          <p id="login-error" className="text-sm text-danger">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
