import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { CompanyDetails } from "@/components/company-details";
import { Link } from "@/i18n/navigation";
import { familySlug, PRODUCT_FAMILIES } from "@/lib/catalog/families";
import { CAR_MAKES, PART_BRANDS, POPULAR_PARTS } from "@/lib/footer-links";
import { PAYMENT_METHODS } from "@/lib/payment-methods";

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
 */
const CARRIERS = [
  { name: "PostNL", logo: "/vervoerders/postnl.jpg" },
  { name: "DHL", logo: "/vervoerders/dhl.png" },
  { name: "DPD", logo: "/vervoerders/dpd.png" },
] as const;

const linkClass =
  "text-muted underline-offset-4 hover:text-foreground hover:underline";

function Column({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="eyebrow text-xs text-foreground">{title}</h2>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </section>
  );
}

export function SiteFooter() {
  const t = useTranslations("footer");
  const tFamily = useTranslations("family");
  const locale = useLocale();

  return (
    <footer className="mt-16 border-t border-border">
      {/* pb-28 op mobiel: de zwevende tabbalk hangt over de onderkant van
          het venster. De ruimte hoort hier en niet op <main>, want de footer
          is het laatste element op de pagina — anders verdwijnt juist deze
          regel met de bedrijfsgegevens erachter. */}
      <div className="site-container pt-12 pb-28 text-sm lg:pb-12">
        <nav
          aria-label={t("navLabel")}
          className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5"
        >
          <Column title={t("serviceTitle")}>
            <li>
              <Link href="/contact" className={linkClass}>
                {t("contactLink")}
              </Link>
            </li>
            <li>
              <Link href="/faq" className={linkClass}>
                {t("faqLink")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className={linkClass}>
                {t("termsLink")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className={linkClass}>
                {t("privacyLink")}
              </Link>
            </li>
            <li>
              <Link href="/cart" className={linkClass}>
                {t("cartLink")}
              </Link>
            </li>
          </Column>

          <Column title={t("assortmentTitle")}>
            {PRODUCT_FAMILIES.map((family) => (
              <li key={family}>
                <Link
                  href={{
                    pathname: "/[family]",
                    params: { family: familySlug(family, locale) },
                  }}
                  className={linkClass}
                >
                  {tFamily(`${family}.title`)}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/my-car" className={linkClass}>
                {t("myCarLink")}
              </Link>
            </li>
          </Column>

          <Column title={t("makesTitle")}>
            {CAR_MAKES.map((make) => (
              <li key={make}>
                <Link
                  href={{ pathname: "/my-car", query: { merk: make } }}
                  className={linkClass}
                >
                  {make}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/my-car" className={`${linkClass} font-semibold`}>
                {t("moreMakes")} ›
              </Link>
            </li>
          </Column>

          <Column title={t("brandsTitle")}>
            {PART_BRANDS.map((brand) => (
              <li key={brand}>
                <Link
                  href={{ pathname: "/search", query: { q: brand } }}
                  className={linkClass}
                >
                  {brand}
                </Link>
              </li>
            ))}
          </Column>

          <Column title={t("popularTitle")}>
            {POPULAR_PARTS.map((part) => (
              <li key={part}>
                <Link
                  href={{ pathname: "/search", query: { q: part } }}
                  className={linkClass}
                >
                  {part}
                </Link>
              </li>
            ))}
          </Column>
        </nav>

        <div className="mt-12 grid gap-8 border-t border-border pt-8 sm:grid-cols-2">
          <section>
            <h2 className="eyebrow text-xs text-foreground">
              {t("paymentTitle")}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((method) => (
                <li
                  key={method}
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium"
                >
                  {method}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-muted">{t("paymentNote")}</p>
          </section>

          <section>
            <h2 className="eyebrow text-xs text-foreground">
              {t("shippingTitle")}
            </h2>
            <ul className="mt-4 flex flex-wrap items-center gap-2">
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
            <p className="mt-3 text-muted">{t("shippingPending")}</p>
          </section>
        </div>

        <div className="mt-8 grid gap-8 border-t border-border pt-8 text-muted sm:grid-cols-2">
          <section>
            <h2 className="eyebrow text-xs text-foreground">
              {t("termsTitle")}
            </h2>
            <ul className="mt-4 space-y-2">
              <li>{t("vat")}</li>
              <li>{t("shipping")}</li>
              <li>{t("withdrawal")}</li>
            </ul>
          </section>

          <section>
            <h2 className="eyebrow text-xs text-foreground">
              {t("contactTitle")}
            </h2>
            <CompanyDetails className="mt-4" showAddress={false} />
          </section>
        </div>

        <p className="mt-8 border-t border-border pt-6 text-muted">
          {t("copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
