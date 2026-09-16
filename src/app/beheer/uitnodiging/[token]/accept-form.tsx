"use client";

import Link from "next/link";
import { useActionState } from "react";
import { acceptInvite, type AcceptResult } from "../actions";

const labelClass = "mb-1 block text-sm font-medium";
const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-base";

export function AcceptForm({
  token,
  email,
  secretBase32,
  otpauthUri,
}: {
  token: string;
  email: string;
  secretBase32: string;
  otpauthUri: string;
}) {
  const [state, action, pending] = useActionState<AcceptResult, FormData>(
    acceptInvite,
    undefined,
  );

  if (state && "codes" in state) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-semibold">Je account staat klaar</h2>
          <p className="mt-2 text-sm text-muted">
            Schrijf deze herstelcodes over en bewaar ze los van je telefoon. Ze
            zijn hierna niet meer op te vragen. Elke code werkt één keer.
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface p-4 font-mono text-sm tabular-nums">
          {state.codes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>

        <Link
          href="/beheer/login"
          className="rounded-md bg-caro-orange px-6 py-3 text-center font-semibold text-caro-ink"
        >
          Naar het inlogscherm
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="secret" value={secretBase32} />

      <div>
        <h2 className="text-lg font-semibold">1. Zet je app klaar</h2>
        <p className="mt-2 text-sm text-muted">
          Voeg in Google Authenticator, 1Password of Bitwarden een account toe
          met deze sleutel. Kies daar &ldquo;handmatig invoeren&rdquo;.
        </p>
        <p className="mt-3 rounded-lg border border-border bg-surface p-3 font-mono text-sm break-all">
          {secretBase32.replace(/(.{4})/g, "$1 ").trim()}
        </p>
        <p className="mt-2 text-xs text-muted break-all">{otpauthUri}</p>
      </div>

      <div className="border-t border-border pt-5">
        <h2 className="text-lg font-semibold">2. Kies een wachtwoord</h2>
        <p className="mt-1 text-sm text-muted">
          Je account komt op <span className="font-medium">{email}</span>.
        </p>
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          Wachtwoord
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
        />
        <p className="mt-1 text-xs text-muted">
          Minimaal twaalf tekens. Een zin werkt beter dan een kort wachtwoord
          met tekens erdoor.
        </p>
      </div>

      <div>
        <label htmlFor="repeat" className={labelClass}>
          Wachtwoord nogmaals
        </label>
        <input
          id="repeat"
          name="repeat"
          type="password"
          autoComplete="new-password"
          required
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
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          required
          aria-describedby={state?.error ? "accept-error" : undefined}
          className={`${inputClass} font-mono tracking-[0.3em] tabular-nums`}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink disabled:opacity-60"
      >
        {pending ? "Bezig…" : "Account aanmaken"}
      </button>

      <div role="alert" aria-live="polite">
        {state && "error" in state && (
          <p id="accept-error" className="text-sm text-danger">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
