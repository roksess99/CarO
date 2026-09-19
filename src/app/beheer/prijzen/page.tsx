import Link from "next/link";
import { categoryOptions } from "@/lib/admin/catalog-options";
import { partKindName } from "@/lib/admin/part-kinds";
import { requireAdmin } from "@/lib/admin/session";
import { listPriceRules } from "@/lib/prices/markup";
import { maxDiscountPercent } from "@/lib/prices/markup-math";
import { MarkupForm } from "./markup-form";
import { StopButton } from "./stop-button";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const SCOPE_LABEL: Record<string, string> = {
  shop: "de hele winkel",
  family: "productgroep",
  category: "categorie",
  kind: "soort onderdeel",
  part: "artikel",
};

const FAMILY_LABEL: Record<string, string> = {
  onderdelen: "Onderdelen",
  banden: "Banden",
  velgen: "Velgen",
  toebehoren: "Toebehoren",
};

export default async function PrijzenPage() {
  await requireAdmin();
  const [rules, categories] = await Promise.all([
    listPriceRules(),
    categoryOptions(),
  ]);

  // De regel bewaart de slug; de beheerder herkent de naam.
  const categoryNames = new Map(
    Object.values(categories)
      .flat()
      .map((option) => [option.slug, option.name]),
  );

  const running = rules.filter((rule) => !rule.disabledAt);

  function targetName(rule: (typeof rules)[number]): string {
    switch (rule.scope) {
      case "shop":
        return "alle artikelen";
      case "family":
        return FAMILY_LABEL[rule.family] ?? rule.family;
      case "category":
        return categoryNames.get(rule.target) ?? rule.target;
      case "kind":
        return partKindName(rule.target) ?? `soort ${rule.target}`;
      default:
        return rule.target;
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <Link
        href="/beheer"
        className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
      >
        ← Terug naar het overzicht
      </Link>

      <h1 className="mt-4 text-xl font-semibold tracking-tight">Prijzen</h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Je bepaalt zelf wat je boven op de inkoopprijs van de leverancier zet.
        Vul je 10% in, dan kost een artikel met een inkoop van € 50 straks
        € 66,55 in de winkel — € 55 plus 21% btw.
      </p>

      <div className="mt-4 max-w-prose rounded-lg border border-border border-s-4 border-s-caro-orange bg-background p-4">
        <p className="text-sm">
          <span className="font-semibold">De smalste regel wint.</span> Staat er
          een prijs op de hele winkel én een op banden, dan geldt die van
          banden. Eén artikel gaat vóór een soort, een soort vóór een categorie,
          een categorie vóór een productgroep.
        </p>
        <p className="mt-2 text-sm">
          <span className="font-semibold">
            Zonder regel verandert er niets.
          </span>{" "}
          Dan staat de adviesprijs van de leverancier er onaangeroerd:
          precies het bedrag dat Alzura bij het artikel meegeeft, en dat is bij
          hen al inclusief btw. Wij leggen er niets overheen.
        </p>
        <p className="mt-2 text-sm">
          <span className="font-semibold">Dit is geen aanbieding.</span> Zet je
          een prijs lager, dan is dat gewoon je nieuwe prijs — er komt geen
          kortingsvlag bij en geen doorgestreepte van-prijs. Voor een tijdelijke
          verlaging gebruik je{" "}
          <Link
            href="/beheer/kortingen"
            className="underline underline-offset-4"
          >
            Kortingen
          </Link>
          .
        </p>
      </div>

      <section className="mt-8 rounded-lg border border-border bg-background p-6">
        <h2 className="mb-4 text-base font-semibold">Nieuwe prijsregel</h2>
        <MarkupForm categories={categories} />
      </section>

      <section className="mt-10">
        <h2 className="text-base font-semibold">Prijsregels</h2>

        {rules.length === 0 ? (
          <p className="mt-3 rounded-lg border border-border bg-background p-4 text-sm text-muted">
            Er staat nog geen prijsregel. De winkel volgt de adviesprijs van de
            leverancier.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-background">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {rule.label}
                    {rule.disabledAt && (
                      <span className="ms-2 rounded-full bg-surface px-2 py-0.5 text-xs font-normal text-muted">
                        gestopt
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    <span className="font-semibold tabular-nums">
                      +{rule.markupPercent}%
                    </span>{" "}
                    op {SCOPE_LABEL[rule.scope]}{" "}
                    <span className="text-foreground">{targetName(rule)}</span>
                    {rule.scope !== "shop" &&
                      rule.scope !== "family" &&
                      rule.family && (
                        <span>
                          {" "}
                          in {FAMILY_LABEL[rule.family] ?? rule.family}
                        </span>
                      )}
                  </p>
                  <p className="text-xs text-muted tabular-nums">
                    Sinds {dateFormat.format(rule.createdAt)} · hoogstens{" "}
                    {maxDiscountPercent(rule.markupPercent)}% korting mogelijk
                  </p>
                </div>
                {!rule.disabledAt && (
                  <StopButton id={rule.id} label={rule.label} />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {running.length > 0 && (
        <p className="mt-8 max-w-prose text-sm text-muted">
          Let op de wisselwerking met kortingen: een korting rekent over de
          prijs die hieruit komt, en kan nooit onder de inkoopprijs zakken. Bij
          een opslag van 10% is dus hoogstens 9% korting mogelijk — vraag je
          meer, dan weigert het kortingsformulier en zegt het wat er wél kan.
        </p>
      )}
    </div>
  );
}
