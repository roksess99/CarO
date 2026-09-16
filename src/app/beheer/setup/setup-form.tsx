"use client";

// De gewone Link, niet die uit @/i18n/navigation: het paneel staat buiten
// de taalboom en heeft geen /nl-voorvoegsel.
import Link from "next/link";
import { useActionState } from "react";
import { completeSetup, type SetupResult } from "../actions";

const labelClass = "mb-1 block text-sm font-medium";
const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-base";

export function SetupForm({
  secretBase32,
  otpauthUri,
}: {
  secretBase32: string;
  otpauthUri: string;
}) {
  const [state, action, pending] = useActionState<SetupResult, FormData>(
    completeSetup,
    undefined,
  );

  // Gelukt: dan is het enige dat nu telt dat deze codes overgeschreven worden.
  if (state && "codes" in state) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-semibold">Je beheerder staat klaar</h2>
          <p className="mt-2 text-sm text-muted">
            Schrijf deze herstelcodes over en bewaar ze los van je telefoon. Ze
            zijn hierna niet meer op te vragen — er staat alleen een afdruk in
            de database. Elke code werkt één keer.
          </p>
        </div>

        <ul className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-surface p-4 font-mono text-sm tabular-nums">
          {state.codes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>

        <div className="rounded-lg border border-border border-s-4 border-s-caro-orange bg-background p-4">
          <p className="text-sm">
            Haal daarna <code className="font-mono">ADMIN_SETUP_TOKEN</code> uit
            je <code className="font-mono">.env</code>. Deze pagina sluit
            zichzelf zodra er een beheerder is, maar een sleutel die nergens
            meer voor dient hoort niet te blijven liggen.
          </p>
        </div>

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
      <div>
        <h2 className="text-lg font-semibold">1. Zet de app klaar</h2>
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
        <h2 className="text-lg font-semibold">2. Vul je gegevens in</h2>
      </div>

      <input type="hidden" name="secret" value={secretBase32} />

      <div>
        <label htmlFor="token" className={labelClass}>
          Instelwachtwoord
        </label>
        <input
          id="token"
          name="token"
          type="password"
          required
          className={inputClass}
        />
        <p className="mt-1 text-xs text-muted">
          De waarde van ADMIN_SETUP_TOKEN uit .env.
        </p>
      </div>

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
          aria-describedby={state?.error ? "setup-error" : undefined}
          className={`${inputClass} font-mono tracking-[0.3em] tabular-nums`}
        />
        <p className="mt-1 text-xs text-muted">
          Hiermee controleren we dat de app goed staat vóór je jezelf
          buitensluit.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink disabled:opacity-60"
      >
        {pending ? "Bezig…" : "Beheerder aanmaken"}
      </button>

      <div role="alert" aria-live="polite">
        {state && "error" in state && (
          <p id="setup-error" className="text-sm text-danger">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
