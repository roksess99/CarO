import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductGrid } from "@/components/product-grid";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { familySlug, PRODUCT_FAMILIES } from "@/lib/catalog/families";
import { getCatalogProvider } from "@/lib/catalog/provider";
import type { Part } from "@/lib/catalog/types";
import {
  familyMatchLevel,
  type MatchLevel,
  matchesYear,
  vehicleSearchTerms,
} from "@/lib/catalog/vehicle-match";
import { localizedMetadata } from "@/lib/site";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    merk?: string;
    model?: string;
    jaar?: string;
    toon?: string;
  }>;
};

/** Hoeveel artikelen per familie; genoeg om te scannen, niet om in te verdwalen */
const PER_FAMILY = 12;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "myCar" });
  return {
    title: `${t("metaTitle")} — CarO`,
    description: t("metaDescription"),
    // Resultaten hangen aan een querystring en verschillen per auto; die
    // horen niet in de index.
    robots: { index: false, follow: true },
    ...localizedMetadata(locale, (l) =>
      getPathname({ locale: l, href: "/my-car" }),
    ),
  };
}

/**
 * Producten die bij de gekozen auto horen.
 *
 * Zonder TecDoc-koppeling is er geen harde fitment (docs/DECISIONS.md #6).
 * Wat we wél kunnen is de vrije-tekstzoekfunctie van Tyre24 voeden met merk
 * en model, en van specifiek naar breed terugvallen: merk + model, anders
 * alleen merk. Elke sectie zegt erbij op welk niveau de treffer staat, zodat
 * de klant weet hoe zeker het is.
 */
export default async function MyCarPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("myCar");
  const tFamily = await getTranslations("family");

  const { merk, model, jaar, toon } = await searchParams;
  // Meer laden telt op bij het aantal per familie; de gekozen auto blijft
  // in de URL staan, dus de lijst blijft bij dezelfde auto horen.
  const requested = Number(toon);
  const perFamily =
    Number.isInteger(requested) && requested > 0
      ? Math.min(requested, PER_FAMILY * 8)
      : PER_FAMILY;
  const brand = merk?.trim();
  const modelName = model?.trim() ?? "";
  const year = jaar && /^\d{4}$/.test(jaar) ? Number(jaar) : undefined;

  if (!brand) {
    return (
      <div className="site-container py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl">{t("title")}</h1>
        <p className="mt-4 max-w-xl text-muted">{t("noCar")}</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-md bg-caro-orange px-5 py-2.5 font-semibold text-caro-ink"
        >
          {t("chooseCar")}
        </Link>
      </div>
    );
  }

  const carLabel = [brand, modelName].filter(Boolean).join(" ");
  const provider = getCatalogProvider();

  const results = await Promise.all(
    PRODUCT_FAMILIES.map(async (family) => {
      const level = familyMatchLevel(family);
      if (level === "none") return { family, level, parts: [] as Part[] };

      // Van specifiek naar breed: stoppen bij de eerste zoekterm die iets
      // oplevert, zodat "VW GOLF" wint van alleen "VW".
      for (const { term, level: termLevel } of vehicleSearchTerms(
        { brand, model: modelName },
        family,
      )) {
        const found = await provider.getParts({
          family,
          search: term,
          limit: perFamily,
        });
        if (found.length === 0) continue;

        // Bouwjaar is een verfijning, geen zeef: filtert hij alles weg, dan
        // klopt onze aanname over de naamgeving niet en tonen we de lijst
        // ongefilterd.
        const byYear = found.filter((part) => matchesYear(part.name, year));
        return {
          family,
          level: termLevel as MatchLevel,
          parts: byYear.length > 0 ? byYear : found,
        };
      }
      return { family, level, parts: [] as Part[] };
    }),
  );

  const withParts = results.filter((result) => result.parts.length > 0);

  return (
    <div className="site-container py-12 md:py-16">
      <p className="eyebrow text-sm">{t("eyebrow")}</p>
      <h1 className="mt-3 text-3xl md:text-4xl">
        {t("titleFor", { car: carLabel })}
      </h1>
      <p className="mt-4 max-w-2xl text-muted">{t("disclaimer")}</p>

      {withParts.length === 0 && (
        <p className="mt-10 max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
          {t("nothingFound", { car: carLabel })}
        </p>
      )}

      {withParts.map(({ family, level, parts }) => (
        <section key={family} className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-2xl">{tFamily(`${family}.title`)}</h2>
            <Link
              href={{
                pathname: "/[family]",
                params: { family: familySlug(family, locale as Locale) },
              }}
              className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
            >
              {t("viewAll")}
            </Link>
          </div>
          <p className="mt-1 text-sm text-muted">
            {level === "brandModel"
              ? t("matchBrandModel", { car: carLabel })
              : t("matchBrand", { brand })}
          </p>
          <div className="mt-6">
            <ProductGrid parts={parts} />
          </div>
        </section>
      ))}

      {withParts.some(({ parts }) => parts.length >= perFamily) && (
        <div className="mt-10 flex justify-center">
          <Link
            href={{
              pathname: "/my-car",
              query: {
                merk: brand,
                ...(modelName ? { model: modelName } : {}),
                ...(year ? { jaar: String(year) } : {}),
                toon: String(perFamily + PER_FAMILY),
              },
            }}
            className="rounded-md border border-border px-6 py-3 font-semibold hover:border-caro-orange hover:bg-surface"
          >
            {t("loadMore")}
          </Link>
        </div>
      )}

      {/* Eerlijk zijn over wat niet kan is hier belangrijker dan elders: de
          klant heeft net zijn auto ingevuld en verwacht een antwoord. */}
      <section className="mt-14 max-w-2xl rounded-lg border border-border bg-surface p-6">
        <h2 className="text-lg">{t("limitsTitle")}</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          {PRODUCT_FAMILIES.filter(
            (family) => familyMatchLevel(family) === "none",
          ).map((family) => (
            <li key={family}>
              {t("noMatchFor", { family: tFamily(`${family}.title`) })}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
