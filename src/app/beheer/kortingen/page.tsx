import Link from "next/link";
import { requireAdmin } from "@/lib/admin/session";
import { listRules } from "@/lib/discounts/rules";
import { RuleForm } from "./rule-form";
import { StopButton } from "./stop-button";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const SCOPE_LABEL: Record<string, string> = {
  family: "productgroep",
  category: "categorie",
  part: "artikel",
};

function statusOf(rule: {
  startsAt: Date;
  endsAt: Date;
  disabledAt: Date | null;
}): { text: string; running: boolean } {
  if (rule.disabledAt) return { text: "gestopt", running: false };
  const now = Date.now();
  if (rule.startsAt.getTime() > now) return { text: "gepland", running: false };
  if (rule.endsAt.getTime() <= now) return { text: "afgelopen", running: false };
  return { text: "loopt nu", running: true };
}

export default async function KortingenPage() {
  await requireAdmin();
  const rules = await listRules();

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <Link
        href="/beheer"
        className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
      >
        ← Terug naar het overzicht
      </Link>

      <h1 className="mt-4 text-xl font-semibold tracking-tight">Kortingen</h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Een actie geldt op een hele productgroep, één categorie of één artikel,
        tussen twee datums. Je kunt hem vooruit plannen.
      </p>

      <div className="mt-4 max-w-prose rounded-lg border border-border border-s-4 border-s-caro-orange bg-background p-4">
        <p className="text-sm">
          <span className="font-semibold">De marge gaat voor het percentage.</span>{" "}
          Zou een artikel door jouw korting onder de ondergrens van 25% winst
          zakken, dan krijgt dát artikel minder korting. De rest van de actie
          gaat gewoon door. Zo kan er nooit met verlies verkocht worden, ook
          niet als de leverancier zijn inkoopprijs later verhoogt.
        </p>
      </div>

      <section className="mt-8 rounded-lg border border-border bg-background p-6">
        <h2 className="mb-4 text-base font-semibold">Nieuwe actie</h2>
        <RuleForm />
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold">Acties</h2>

        {rules.length === 0 ? (
          <p className="mt-3 rounded-lg border border-border bg-background p-4 text-sm text-muted">
            Er loopt nog geen actie.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-background">
            {rules.map((rule) => {
              const status = statusOf(rule);
              return (
                <li
                  key={rule.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {rule.label}
                      <span className="ms-2 rounded-full bg-surface px-2 py-0.5 text-xs font-normal text-muted">
                        {status.text}
                      </span>
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      <span className="font-semibold tabular-nums">
                        {rule.percent}%
                      </span>{" "}
                      op {SCOPE_LABEL[rule.scope]}{" "}
                      <span className="font-mono text-xs">{rule.target}</span>
                    </p>
                    <p className="text-xs text-muted tabular-nums">
                      {dateFormat.format(rule.startsAt)} t/m{" "}
                      {dateFormat.format(rule.endsAt)}
                    </p>
                  </div>
                  {!rule.disabledAt && <StopButton id={rule.id} label={rule.label} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-8 max-w-prose text-sm text-muted">
        De doorgestreepte &ldquo;van&rdquo;-prijs staat nog niet op de site. Die
        mag pas als er dertig dagen prijsgeschiedenis is: de wet vraagt de
        laagste prijs van die periode, niet die van gisteren. Tot dan ziet de
        klant alleen de nieuwe, lagere prijs.
      </p>
    </div>
  );
}
