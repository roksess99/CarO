import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { filterValueLabel } from "@/lib/catalog/filter-values";
import { AvailabilityBadge } from "@/components/availability-badge";
import { AddToCartWithQuantity } from "@/components/cart/add-to-cart-with-quantity";
import { ProductImagePlaceholder } from "@/components/product-image-placeholder";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  familyFromSlug,
  familySlug,
  type ProductFamily,
} from "@/lib/catalog/families";
import { getCatalogProvider } from "@/lib/catalog/provider";
import type { Part } from "@/lib/catalog/types";
import { formatPriceCents, priceCentsToDecimalString } from "@/lib/format";
import { localizedMetadata, SITE_URL } from "@/lib/site";

type Props = {
  params: Promise<{
    locale: string;
    family: string;
    category: string;
    part: string;
  }>;
};

// Bewust geen generateStaticParams: de echte catalogus heeft te veel
// artikelen om voor te renderen. De adapter cachet de API-calls al.

/** Onderdeel ophalen en controleren dat het in déze familie én categorie zit */
async function findPart(
  family: ProductFamily,
  categorySlug: string,
  partSlug: string,
): Promise<Part> {
  const part = await getCatalogProvider().getPartBySlug(family, partSlug);
  // Mismatch → 404, anders is hetzelfde artikel op meerdere URL's
  // bereikbaar (dubbele content)
  if (!part || part.categorySlug !== categorySlug || part.family !== family) {
    notFound();
  }
  return part;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const {
    locale,
    family: familyParam,
    category,
    part: partSlug,
  } = await params;
  const family = familyFromSlug(familyParam, locale);
  if (!family) return {};
  const part = await getCatalogProvider().getPartBySlug(family, partSlug);
  if (!part || part.categorySlug !== category) return {};

  const t = await getTranslations({ locale, namespace: "product" });
  const localizedHref = (targetLocale: string) =>
    getPathname({
      locale: targetLocale as Locale,
      href: {
        pathname: "/[family]/[category]/[part]",
        params: {
          family: familySlug(family, targetLocale),
          category,
          part: partSlug,
        },
      },
    });

  return {
    title: `${part.name} — ${part.brand} — CarO`,
    description: t("metaDescription", {
      name: part.name,
      brand: part.brand,
      oeNumber: part.oeNumber,
    }),
    ...localizedMetadata(locale, localizedHref),
  };
}

const SCHEMA_AVAILABILITY = {
  "in-stock": "https://schema.org/InStock",
  ordered: "https://schema.org/BackOrder",
  "out-of-stock": "https://schema.org/OutOfStock",
} as const;

export default async function ProductPage({ params }: Props) {
  const {
    locale,
    family: familyParam,
    category,
    part: partSlug,
  } = await params;
  setRequestLocale(locale);
  const family = familyFromSlug(familyParam, locale);
  if (!family) notFound();

  const part = await findPart(family, category, partSlug);
  const t = await getTranslations("product");
  const tFamily = await getTranslations("family");
  const tFilters = await getTranslations("filters");
  // Het artikel kent zijn eigen categorienaam; niet elke area levert een
  // categorielijst om die in op te zoeken (area 3 bijvoorbeeld niet).
  const categoryName = part.categoryName || category;

  const canonicalPath = getPathname({
    locale: locale as Locale,
    href: {
      pathname: "/[family]/[category]/[part]",
      params: { family: familyParam, category, part: partSlug },
    },
  });

  // JSON-LD voor rich results (SEO-regel in .claude/rules/frontend.md)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: part.name,
    sku: part.id,
    mpn: part.oeNumber,
    brand: { "@type": "Brand", name: part.brand },
    ...(part.imageUrl ? { image: part.imageUrl } : {}),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}${canonicalPath}`,
      priceCurrency: "EUR",
      price: priceCentsToDecimalString(part.priceCents),
      availability: SCHEMA_AVAILABILITY[part.availability],
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <div className="site-container py-8 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Kruimelpad: Home / familie / categorie */}
      <nav aria-label={t("breadcrumbAria")}>
        <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <li>
            <Link href="/" className="hover:text-foreground">
              {t("breadcrumbHome")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={{ pathname: "/[family]", params: { family: familyParam } }}
              className="hover:text-foreground"
            >
              {tFamily(`${family}.title`)}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={{
                pathname: "/[family]/[category]",
                params: { family: familyParam, category },
              }}
              className="hover:text-foreground"
            >
              {categoryName}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:gap-12">
        <div className="lg:flex-1">
          {part.imageUrl ? (
            <Image
              src={part.imageUrl}
              alt={part.name}
              width={800}
              height={600}
              priority
              className="w-full rounded-lg border border-border bg-surface object-contain"
            />
          ) : (
            <ProductImagePlaceholder
              label={t("noImage")}
              className="aspect-4/3 w-full rounded-lg border border-border"
              iconClassName="size-20"
            />
          )}
        </div>

        <div className="lg:max-w-md lg:flex-1">
          <p className="eyebrow text-xs">{part.brand}</p>
          <h1 className="mt-2 text-3xl md:text-4xl">{part.name}</h1>

          <p className="mt-6">
            <span className="text-3xl font-bold tabular-nums">
              {formatPriceCents(part.priceCents)}
            </span>{" "}
            <span className="text-sm text-muted">{t("inclVat")}</span>
          </p>
          <div className="mt-3">
            <AvailabilityBadge availability={part.availability} />
          </div>

          <div className="mt-8">
            <AddToCartWithQuantity part={part} />
          </div>

          <h2 className="mt-10 text-lg">{t("detailsTitle")}</h2>
          {/* De waarden komen van de leverancier en staan in diens taal;
              dezelfde woordenlijst als bij de filters haalt er "kegel" en
              "Winterreifen" uit. Wat we niet kennen blijft staan zoals het
              geleverd is. */}
          <dl className="mt-4 divide-y divide-border border-y border-border text-sm">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-muted">{t("brandLabel")}</dt>
              <dd className="font-medium">{part.brand}</dd>
            </div>

            {(part.specs ?? []).map((spec) => (
              <div key={spec.key} className="flex justify-between gap-4 py-3">
                <dt className="text-muted">{t(`specs.${spec.key}`)}</dt>
                <dd className="font-medium tabular-nums">
                  {filterValueLabel(spec.value, tFilters)}
                </dd>
              </div>
            ))}

            {/* Alleen tonen als het écht een OE-nummer is. Bij banden staat
                hier anders het leveranciersartikelnummer onder de verkeerde
                kop — dat stond er eerder wel. */}
            {part.oeNumber &&
              !(part.specs ?? []).some(
                (spec) => spec.key === "itemNumber" && spec.value === part.oeNumber,
              ) && (
                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-muted">{t("oeLabel")}</dt>
                  <dd className="font-medium tabular-nums">{part.oeNumber}</dd>
                </div>
              )}

            {part.categoryName && (
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-muted">{t("categoryLabel")}</dt>
                <dd className="font-medium">{categoryName}</dd>
              </div>
            )}

            {part.stock !== undefined && part.stock > 0 && (
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-muted">{t("stockLabel")}</dt>
                <dd className="font-medium tabular-nums">
                  {t("stockValue", { count: part.stock })}
                </dd>
              </div>
            )}
          </dl>

          <p className="mt-6 text-sm text-muted">{t("shippingNote")}</p>
          <p className="mt-2 text-sm text-muted">{t("withdrawalNote")}</p>
        </div>
      </div>
    </div>
  );
}
