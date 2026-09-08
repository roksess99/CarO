import Image from "next/image";
import { useTranslations } from "next-intl";
import { CompanyDetails } from "@/components/company-details";
import { Link } from "@/i18n/navigation";

/**
 * Vervoerders waarmee we verzenden.
 *
 * De logo's staan op een witte tegel: het zijn merkbeelden met vaste kleuren
 * (PostNL-oranje, DHL-rood op geel, DPD-rood) die op onze donkere
 * achtergrond onleesbaar worden. Wit is ook wat de merkrichtlijnen van deze
 * vervoerders voorschrijven.
 *
 * Let op: dit is beeldmateriaal van derden. Het hoort pas op een live shop
 * te staan als de vervoerdersovereenkomst rond is — zie de tekst eronder,
 * die dat voorbehoud maakt.
 *
 * Betaaliconen (iDEAL, Bancontact, Visa, Mastercard, Klarna) staan hier
 * bewust nog niet: die volgen met de Mollie-integratie in fase 5. Een
 * betaalmethode tonen die nog niet werkt is misleidend.
 */
const CARRIERS = [
  { name: "PostNL", logo: "/vervoerders/postnl.jpg" },
  { name: "DHL", logo: "/vervoerders/dhl.png" },
  { name: "DPD", logo: "/vervoerders/dpd.png" },
] as const;

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
<ul className="mt-3 flex flex-wrap items-center gap-2">
              {CARRIERS.map((carrier) => (
                <li
                  key={carrier.name}
                  className="flex h-12 w-24 items-center justify-center rounded-md border border-border bg-white p-2"
                >
                  <Image
                    src={carrier.logo}
                    alt={carrier.name}
                    width={96}
                    height={48}
                    className="h-full w-full object-contain"
                  />
                </li>
              ))}
            </ul>
            <p className="mt-3">{t("shippingPending")}</p>
          </section>

          <section>
            <h2 className="eyebrow text-xs">{t("contactTitle")}</h2>
            <CompanyDetails className="mt-3" showAddress={false} />
          </section>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-6">
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
          <Link
            href="/faq"
            className="underline underline-offset-4 hover:text-foreground"
          >
            {t("faqLink")}
          </Link>
          <Link
            href="/privacy"
            className="underline underline-offset-4 hover:text-foreground"
          >
            {t("privacyLink")}
          </Link>
          <Link
            href="/terms"
            className="underline underline-offset-4 hover:text-foreground"
          >
            {t("termsLink")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
