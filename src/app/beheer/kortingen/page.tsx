import Link from "next/link";
import { categoryOptions } from "@/lib/admin/catalog-options";
import { requirePermission } from "@/lib/admin/session";
import { listRules } from "@/lib/discounts/rules";
import { historySize, jobIsLate, lastJobRun } from "@/lib/prices/history";
import { PRICE_JOB } from "@/lib/prices/snapshot";
import { PriceClock } from "./price-clock";
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

const FAMILY_LABEL: Record<string, string> = {
  onderdelen: "Onderdelen",
  banden: "Banden",
  velgen: "Velgen",
  toebehoren: "Toebehoren",
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
  await requirePermission("kortingen");
  const [rules, categories, lastRun, size] = await Promise.all([
    listRules(),
    categoryOptions(),
    lastJobRun(PRICE_JOB),
    historySize(),
  ]);

  // De regel bewaart de slug; de beheerder herkent de naam. Staat de categorie
  // niet meer in de catalogus, dan valt hij terug op de slug.
  const categoryNames = new Map(
    Object.values(categories)
      .flat()
      .map((option) => [option.slug, option.name]),
  );

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
          Zou een artikel door jouw korting onder de ondergrens zakken, dan
          krijgt dát artikel minder korting. De rest van de actie gaat gewoon
          door. Zo kan er nooit met verlies verkocht worden, ook niet als de
          leverancier zijn inkoopprijs later verhoogt.
        </p>
        <p className="mt-2 text-sm">
          Waar die ondergrens ligt hangt af van{" "}
          <Link href="/beheer/prijzen" className="underline underline-offset-4">
            Prijzen
          </Link>
          . Heb je daar een opslag ingesteld, dan is de inkoopprijs de bodem en
          past er hoogstens zoveel korting als je opslag toelaat — bij 10%
          opslag is dat 9%. Staat er geen prijsregel, dan is de bodem 25% winst
          op de inkoopprijs — of de adviesprijs zelf, als die lager ligt.
        </p>
      </div>

      <PriceClock
        lastRun={
          lastRun
            ? {
                startedAt: lastRun.startedAt.toISOString(),
                finishedAt: lastRun.finishedAt?.toISOString() ?? null,
              }
            : null
        }
        parts={size.parts}
        days={size.parts > 0 ? Math.ceil(size.rows / size.parts) : 0}
        stale={jobIsLate(lastRun)}
      />

      <section className="mt-8 rounded-lg border border-border bg-background p-6">
        <h2 className="mb-4 text-base font-semibold">Nieuwe actie</h2>
        <RuleForm categories={categories} />
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
                      <span className="text-foreground">
                        {rule.scope === "family"
                          ? (FAMILY_LABEL[rule.target] ?? rule.target)
                          : (categoryNames.get(rule.target) ?? rule.target)}
                      </span>
                      {rule.scope !== "family" && rule.family && (
                        <span> in {FAMILY_LABEL[rule.family] ?? rule.family}</span>
                      )}
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
        De doorgestreepte &ldquo;van&rdquo;-prijs is de laagste prijs van de
        afgelopen dertig dagen — dat is wat de wet als referentie vraagt, niet
        de prijs van gisteren. Hij verschijnt per artikel vanzelf zodra die
        dertig dagen gemeten zijn.
      </p>
    </div>
  );
}
