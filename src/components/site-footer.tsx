import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { CompanyDetails } from "@/components/company-details";
import { Link } from "@/i18n/navigation";
import { familySlug, PRODUCT_FAMILIES } from "@/lib/catalog/families";
import { CAR_MAKES, PART_BRANDS, POPULAR_PARTS } from "@/lib/footer-links";

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
  // Mollie levert de badge in vijf talen; wij gebruiken er twee. Elke andere
  // locale valt terug op Engels in plaats van op een leeg beeld.
  const mollieLocale = locale === "nl" ? "nl" : "en";

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
            {/* Geen tegel eromheen: beide merkbeelden dragen hun eigen
                achtergrond, een gele en een witte pil. Een witte kaart met
                rand erachter maakte er een sticker-in-een-lijstje van.

                Onder elkaar en niet naast elkaar: het Mollie-blok is ruim
                vier keer zo breed als hoog, dus naast de lockup bleef er zo
                weinig breedte over dat de regel "Veilige betalingen mogelijk
                gemaakt door mollie" onleesbaar klein werd. */}
            <ul className="mt-4 space-y-3">
              <li>
                {/* iDEAL en Wero leveren maar één versie: geel. Die staat
                    goed op beide thema's en mag van hun merkrichtlijnen ook
                    niet omgekleurd worden. */}
                <Image
                  src="/betaalmethodes/ideal-wero.svg"
                  alt={t("idealWeroAlt")}
                  width={480}
                  height={182}
                  className="h-12 w-auto"
                />
              </li>
              <li>
                {/* Mollie levert het blok in een witte en een zwarte pil. Wij
                    gebruiken in béide thema's de witte, en dat pakt in allebei
                    goed uit: in lichte modus lost de pil op in de pagina en
                    blijft alleen de regel met de kaartlogo's over, in donkere
                    modus is het een strak wit vlak.

                    De zwarte pil is daarmee vervallen. Die stond in donkere
                    modus namelijk net níet gelijk aan de achtergrond
                    (#0F0B08 tegen #0E1013): een vaag warm rechthoekje, en
                    omkleuren mag niet van de merkkit.

                    Eén bestand per taal scheelt bovendien een halve download:
                    een tweede <img> achter `dark:hidden` wordt evengoed
                    opgehaald, en deze badges zijn 35–45 kB per stuk. */}
                <Image
                  src={`/betaalmethodes/mollie-${mollieLocale}.svg`}
                  alt={t("mollieAlt")}
                  width={593}
                  height={139}
                  className="h-auto w-full max-w-xs"
                />
              </li>
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
