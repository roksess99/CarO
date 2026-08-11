import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Vervoerders waarmee we verzenden.
 *
 * Nog geen logo's: die zijn merkbeeldmateriaal van PostNL en DHL en mogen
 * pas gebruikt worden als er een vervoerdersovereenkomst ligt. Tot die tijd
 * de naam in tekst — dat mag wel en het is eerlijk.
 *
 * Betaaliconen (iDEAL, Bancontact, Visa, Mastercard, Klarna) staan hier
 * bewust nog niet: die volgen met de Mollie-integratie in fase 5. Een
 * betaalmethode tonen die nog niet werkt is misleidend.
 */
const CARRIERS = ["PostNL", "DHL"] as const;

export function SiteFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="mt-16 border-t border-border">
      {/* pb-28 op mobiel: de zwevende tabbalk hangt over de onderkant van
          het venster. De ruimte hoort hier en niet op <main>, want de footer
          is het laatste element op de pagina — anders verdwijnt juist deze
          regel met de bedrijfsgegevens erachter. */}
      <div className="site-container pt-10 pb-28 text-sm text-muted lg:pb-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <section>
            <h2 className="eyebrow text-xs">{t("termsTitle")}</h2>
            <ul className="mt-3 space-y-2">
              <li>{t("vat")}</li>
              <li>{t("shipping")}</li>
              <li>{t("withdrawal")}</li>
            </ul>
          </section>

          <section>
            <h2 className="eyebrow text-xs">{t("shippingTitle")}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {CARRIERS.map((carrier) => (
                <li
                  key={carrier}
                  className="rounded-md border border-border px-3 py-1.5 font-semibold text-foreground"
                >
                  {carrier}
                </li>
              ))}
            </ul>
            <p className="mt-3">{t("shippingPending")}</p>
          </section>

          <section>
            <h2 className="eyebrow text-xs">{t("contactTitle")}</h2>
            {/* TODO: vervangen zodra de KvK-inschrijving rond is
                (docs/DECISIONS.md #3). Een webshop moet deze gegevens
                wettelijk tonen — dit is dus geen optionele opsmuk. */}
            <dl className="mt-3 space-y-2">
              <div className="flex gap-2">
                <dt className="font-semibold text-foreground">
                  {t("companyLabel")}
                </dt>
                <dd>{t("placeholder")}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-foreground">
                  {t("emailLabel")}
                </dt>
                <dd>{t("placeholder")}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-foreground">
                  {t("kvkLabel")}
                </dt>
                <dd>{t("placeholder")}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-foreground">
                  {t("vatNumberLabel")}
                </dt>
                <dd>{t("placeholder")}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-6">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <Link
            href="/privacy"
            className="underline underline-offset-4 hover:text-foreground"
          >
            {t("privacyLink")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
