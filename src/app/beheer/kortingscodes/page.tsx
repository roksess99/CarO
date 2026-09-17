import Link from "next/link";
import { requireAdmin } from "@/lib/admin/session";
import { listCodes } from "@/lib/discounts/codes";
import { formatPriceCents } from "@/lib/format";
import { CodeForm } from "./code-form";
import { StopButton } from "./stop-button";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function statusOf(code: {
  startsAt: Date;
  endsAt: Date;
  disabledAt: Date | null;
  maxUses: number | null;
  usedCount: number;
}): string {
  if (code.disabledAt) return "gestopt";
  if (code.maxUses !== null && code.usedCount >= code.maxUses) return "op";
  const now = Date.now();
  if (code.startsAt.getTime() > now) return "gepland";
  if (code.endsAt.getTime() <= now) return "afgelopen";
  return "loopt nu";
}

export default async function KortingscodesPage() {
  await requireAdmin();
  const codes = await listCodes();

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <Link
        href="/beheer"
        className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
      >
        ← Terug naar het overzicht
      </Link>

      <h1 className="mt-4 text-xl font-semibold tracking-tight">
        Kortingscodes
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Een code geeft een percentage korting op de artikelen in de bestelling,
        tussen twee datums. Je kunt hem vooruit plannen.
      </p>

      <div className="mt-4 max-w-prose rounded-lg border border-border border-s-4 border-s-caro-orange bg-background p-4">
        <p className="text-sm">
          <span className="font-semibold">
            Twee dingen die de code niet doet.
          </span>{" "}
          Hij geldt niet op artikelen die al in de aanbieding zijn — twee
          kortingen over elkaar zakken door de marge-ondergrens. En het
          minimumbedrag kijkt alleen naar de artikelen waar de code op geldt,
          niet naar de verzendkosten.
        </p>
      </div>

      <section className="mt-8 rounded-lg border border-border bg-background p-6">
        <h2 className="mb-4 text-base font-semibold">Nieuwe code</h2>
        <CodeForm />
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold">Codes</h2>

        {codes.length === 0 ? (
          <p className="mt-3 rounded-lg border border-border bg-background p-4 text-sm text-muted">
            Er is nog geen code.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-background">
            {codes.map((code) => (
              <li
                key={code.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    <span className="font-mono">{code.code}</span>
                    <span className="ms-2 rounded-full bg-surface px-2 py-0.5 text-xs font-normal text-muted">
                      {statusOf(code)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    <span className="font-semibold tabular-nums">
                      {code.percent}%
                    </span>
                    {code.minSpendCents > 0 && (
                      <> vanaf {formatPriceCents(code.minSpendCents)}</>
                    )}
                    {code.oncePerCustomer && <> · één keer per klant</>}
                  </p>
                  <p className="text-xs text-muted tabular-nums">
                    {dateFormat.format(code.startsAt)} t/m{" "}
                    {dateFormat.format(code.endsAt)} ·{" "}
                    {/* Wat er van de code gebruikt is. Pas geteld als er
                        betaald is: een afgebroken checkout telt niet mee. */}
                    {code.maxUses === null
                      ? `${code.usedCount}× gebruikt`
                      : `${code.usedCount} van ${code.maxUses} gebruikt`}
                  </p>
                </div>
                {!code.disabledAt && (
                  <StopButton id={code.id} code={code.code} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
