import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { COMPANY } from "@/lib/company";
import { formatPriceCents } from "@/lib/format";
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  STANDARD_SHIPPING_CENTS,
} from "@/lib/shipping";
import { SITE_NAME } from "@/lib/site";

/**
 * Lopende tekst onderaan de homepage: wat de winkel verkoopt, hoe je het
 * juiste vindt en wie erachter zit.
 *
 * De homepage bestond tot nu toe uit een zoekpaneel, tegels en
 * productrasters — GEMETEN 2026-11-23: geen enkele alinea die zegt waar de
 * site over gaat. Een zoekmachine (en een AI-samenvatting) heeft dan niets om
 * te citeren behalve productnamen. Elke zin hier is een feit dat ook elders in
 * de winkel staat: het verzendtarief en de grens komen uit `lib/shipping.ts`,
 * vestigingsplaats en KvK uit `COMPANY`. Geen verkooppraat (docs/BRAND.md).
 *
 * Onderaan en niet bovenaan: wie weet wat hij zoekt begint bij het kenteken
 * of de maat, en hoeft hier niet langs.
 */
export async function HomeAbout() {
  const t = await getTranslations("homeInfo");

  const links = [
    { href: "/my-car", label: t("linkMyCar") },
    { href: "/faq", label: t("linkFaq") },
    { href: "/returns", label: t("linkReturns") },
    { href: "/contact", label: t("linkContact") },
  ] as const;

  return (
    <section className="border-t border-border bg-surface">
      <div className="site-container grid gap-8 py-12 md:py-16 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-16">
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-3xl">
            {t("aboutTitle", { site: SITE_NAME })}
          </h2>
          <p className="mt-4 text-muted">
            {t("aboutParts", { site: SITE_NAME })}
          </p>
          <p className="mt-4 text-muted">{t("aboutTyres")}</p>
          <p className="mt-4 text-muted">
            {t("aboutShop", {
              site: SITE_NAME,
              shipping: formatPriceCents(STANDARD_SHIPPING_CENTS),
              amount: formatPriceCents(FREE_SHIPPING_THRESHOLD_CENTS),
              city: COMPANY.city,
              coc: COMPANY.cocNumber,
            })}
          </p>
        </div>

        <nav aria-label={t("linksAria")}>
          <h2 className="eyebrow text-sm">{t("linksTitle")}</h2>
          <ul className="mt-4 space-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="font-semibold underline decoration-caro-orange decoration-2 underline-offset-4 hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
