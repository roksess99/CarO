import Link from "next/link";
import { listAdmins } from "@/lib/admin/admins";
import { recentAudit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/admin/session";
import { InviteForm } from "./invite-form";
import { RevokeButton } from "./revoke-button";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function BeheerdersPage() {
  const me = await requireAdmin();
  const [admins, audit] = await Promise.all([listAdmins(), recentAudit(15)]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href="/beheer"
        className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
      >
        ← Terug naar het overzicht
      </Link>

      <h1 className="mt-4 text-xl font-semibold tracking-tight">Beheerders</h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Wie je uitnodigt kiest zelf een wachtwoord en stelt zelf zijn
        authenticator-app in. Je ziet dat wachtwoord dus nooit, en hoeft er ook
        nooit een door te bellen.
      </p>

      <section className="mt-8 rounded-lg border border-border bg-background p-6">
        <InviteForm />
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold">Huidige beheerders</h2>
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-background">
          {admins.map((admin) => (
            <li
              key={admin.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {admin.email}
                  {admin.id === me.id && (
                    <span className="ms-2 text-xs text-muted">(jij)</span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {admin.disabledAt
                    ? `Uitgeschakeld op ${dateFormat.format(admin.disabledAt)}`
                    : admin.lastLoginAt
                      ? `Laatst ingelogd ${dateFormat.format(admin.lastLoginAt)}`
                      : "Nog nooit ingelogd"}
                </p>
              </div>
              {!admin.disabledAt && admin.id !== me.id && (
                <RevokeButton id={admin.id} email={admin.email} />
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold">Logboek</h2>
        <p className="mt-1 text-sm text-muted">
          Wat er in het paneel veranderd is. Mislukte inlogpogingen staan hier
          bewust niet in — die worden geteld en verder vergeten.
        </p>

        {audit.length === 0 ? (
          <p className="mt-3 rounded-lg border border-border bg-background p-4 text-sm text-muted">
            Nog niets gebeurd.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-background text-sm">
            {audit.map((entry) => (
              <li key={entry.id} className="flex flex-wrap gap-x-3 gap-y-1 p-3">
                <span className="text-muted tabular-nums">
                  {dateFormat.format(entry.createdAt)}
                </span>
                <span className="font-medium">{entry.action}</span>
                {entry.subject && <span className="text-muted">{entry.subject}</span>}
                <span className="ms-auto text-muted">{entry.email}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
