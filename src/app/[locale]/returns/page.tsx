import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReturnForm } from "@/components/returns/return-form";
import { getPathname, Link } from "@/i18n/navigation";
import { COMPANY } from "@/lib/company";
import {
  describeOrder,
  verifyOrder,
  type LookupResult,
} from "@/lib/returns/lookup";
import { SITE_NAME, localizedMetadata, socialMetadata } from "@/lib/site";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string; t?: string }>;
};

const HREF = "/returns" as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "returns" });
  const title = `${t("metaTitle")} — ${SITE_NAME}`;
  const description = t("metaDescription");

  return {
    title,
    description,
    ...localizedMetadata(locale, (l) => getPathname({ locale: l, href: HREF })),
    ...socialMetadata({
      locale,
      title,
      description,
      path: getPathname({ locale, href: HREF }),
    }),
  };
}

/**
 * Een retour aanmelden.
 *
 * Twee ingangen. Via de link in de bevestigingsmail (`?ref=…&t=…`) is de
 * bestelling al bewezen en slaan we het zoekformulier over; wie hier gewoon
 * langskomt vult zijn ordernummer en mailadres in. Waarom dat er altijd twee
 * moeten zijn staat in `lib/returns/lookup.ts`.
 *
 * De uitleg boven het formulier is geen bijzaak: art. 6:230m BW vraagt dat de
 * klant wéét hoe hij herroept voordat hij bestelt, en het modelformulier voor
 * herroeping moet beschikbaar zijn. Dat laatste is deze pagina — een klant
 * mag hem ook op eigen woorden sturen, en dat staat er dan ook bij.
 */
export default async function ReturnsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("returns");

  const { ref, t: token } = await searchParams;

  // Alleen met een geldig teken uit de bevestigingsmail; een verkeerd of
  // ontbrekend teken laat gewoon het zoekformulier staan.
  let initial: LookupResult = { status: "idle" };
  if (ref && token) {
    try {
      const order = await verifyOrder({ reference: ref, token });
      if (order) initial = await describeOrder(order);
    } catch {
      initial = { status: "error" };
    }
  }

  return (
    <div className="site-container py-10 md:py-16">
      <h1 className="text-3xl md:text-4xl">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-muted">{t("intro")}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <div className="max-w-xl">
          <ReturnForm initial={initial} token={token} />
        </div>

        <aside className="space-y-6 rounded-lg border border-border bg-surface p-6 text-sm">
          <section>
            <h2 className="text-base">{t("rules.title")}</h2>
            <ul className="mt-3 list-disc space-y-2 ps-5 text-muted">
              <li>{t("rules.window")}</li>
              <li>{t("rules.condition")}</li>
              <li>{t("rules.cost")}</li>
              <li>{t("rules.refund")}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base">{t("address.title")}</h2>
            <p className="mt-3 text-muted">{t("address.body")}</p>
            <p className="mt-3 not-italic text-foreground">
              {COMPANY.legalName}
              <br />
              {COMPANY.street}
              <br />
              {COMPANY.postcode} {COMPANY.city}
            </p>
          </section>

          <section>
            <h2 className="text-base">{t("help.title")}</h2>
            <p className="mt-3 text-muted">
              {t.rich("help.body", {
                contact: (chunks) => (
                  <Link
                    href="/contact"
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
            <p className="mt-3 text-muted">
              {t.rich("help.terms", {
                terms: (chunks) => (
                  <Link
                    href="/terms"
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
