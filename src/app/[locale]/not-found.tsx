import { useLocale, useTranslations } from "next-intl";
import { SiteSearch } from "@/components/site-search";
import { Link } from "@/i18n/navigation";
import { familySlug, PRODUCT_FAMILIES } from "@/lib/catalog/families";

/**
 * Doodlopende pagina's krijgen een uitweg mee.
 *
 * Hier stond alleen "deze pagina bestaat niet" met een knop naar de homepage.
 * Wie op een 404 komt is meestal ergens naar op zoek — een oud bladwijsje, een
 * hernoemde categorie, een typefout in een OE-nummer. Zoekveld en de vier
 * families brengen hem in één klik verder; terug naar de homepage kost er
 * twee.
 */
export default function NotFound() {
  const t = useTranslations("notFound");
  const tFamily = useTranslations("family");
  const locale = useLocale();

  return (
    <div className="site-container py-16 md:py-24">
      <h1 className="text-3xl">{t("title")}</h1>
      <p className="mt-4 max-w-xl text-muted">{t("description")}</p>

      <div className="mt-8 max-w-xl">
        <SiteSearch locale={locale} id="notfound-search" />
      </div>

      <h2 className="mt-12 text-sm font-bold">{t("browseTitle")}</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {PRODUCT_FAMILIES.map((family) => (
          <li key={family}>
            <Link
              href={{
                pathname: "/[family]",
                params: { family: familySlug(family, locale) },
              }}
              className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-semibold hover:bg-surface"
            >
              {tFamily(`${family}.title`)}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm text-muted">
        {t.rich("helpLine", {
          faq: (chunks) => (
            <Link
              href="/faq"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>

      <Link
        href="/"
        className="mt-8 inline-block rounded-md bg-caro-orange px-6 py-3 font-semibold text-caro-ink"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
