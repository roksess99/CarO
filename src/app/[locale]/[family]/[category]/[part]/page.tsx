import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { filterValueLabel } from "@/lib/catalog/filter-values";
import { AvailabilityBadge } from "@/components/availability-badge";
import { AddToCartWithQuantity } from "@/components/cart/add-to-cart-with-quantity";
import { JsonLd } from "@/components/json-ld";
import { ProductImagePlaceholder } from "@/components/product-image-placeholder";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  familyFromSlug,
  familySlug,
  type ProductFamily,
  usesVehicleCatalog,
} from "@/lib/catalog/families";
import { localizeCategories } from "@/lib/catalog/localized-categories";
import { loadPartBySlug } from "@/lib/catalog/lookup";
import { getCatalogProvider } from "@/lib/catalog/provider";
import type { Part } from "@/lib/catalog/types";
import { formatPriceCents, priceCentsToDecimalString } from "@/lib/format";
import {
  breadcrumbJsonLd,
  localizedMetadata,
  offerPolicies,
  SITE_URL,
  socialMetadata,
} from "@/lib/site";

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

// Bij onderdelen (Wearparts) hoort een artikel niet bij één vaste categorie:
// dezelfde remschijf hangt onder meerdere assemblagegroepen en past op
// meerdere auto's. De categorie in de URL is daar dus context, geen
// identiteit — vandaar dat alleen de andere families erop gecontroleerd
// worden.

async function findPart(
  family: ProductFamily,
  categorySlug: string,
  partSlug: string,
): Promise<Part> {
  const part = await loadPartBySlug(family, partSlug);
  if (!part || part.family !== family) notFound();
  // Mismatch → 404, anders is hetzelfde artikel op meerdere URL's
  // bereikbaar (dubbele content). Een categorie die alleen hernoemd is vangt
  // de proxy al af met een 308 (proxy.ts), dus wat hier binnenkomt wijst
  // echt naar een andere categorie.
  if (!usesVehicleCatalog(family) && part.categorySlug !== categorySlug) {
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
  const part = await loadPartBySlug(family, partSlug);
  if (!part) return {};
  if (!usesVehicleCatalog(family) && part.categorySlug !== category) return {};

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

  // Niet elk artikel heeft een bruikbaar merk — bij velgen staat daar een
  // omschrijving die we wegfilteren. Dan geen lege streepjes in de titel.
  const title = [part.name, part.brand, "CarO"].filter(Boolean).join(" — ");
  const description = t("metaDescription", {
    name: part.name,
    brand: part.brand,
    oeNumber: part.oeNumber,
  });

  return {
    title,
    description,
    ...localizedMetadata(locale, localizedHref),
    // De productfoto van de leverancier als deelbeeld; ontbreekt hij, dan
    // valt Next terug op de merkkaart in app/[locale]/opengraph-image.tsx.
    ...socialMetadata({
      locale,
      title,
      description,
      path: localizedHref(locale),
      image: part.imageUrl,
    }),
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
  // Het artikel kent zijn eigen categorienaam, maar die komt in de taal van
  // de leverancier. De categorielijst kent onze vertaling; lukt het opzoeken
  // niet (area 3 levert geen lijst), dan valt hij terug op de naam van het
  // artikel zelf.
  const categories = await localizeCategories(
    await getCatalogProvider().getCategories(family),
  );
  const categoryName =
    categories.find((item) => item.slug === part.categorySlug)?.name ??
    part.categoryName ??
    category;

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
    description: t("metaDescription", {
      name: part.name,
      brand: part.brand,
      oeNumber: part.oeNumber,
    }),
    sku: part.id,
    mpn: part.oeNumber,
    category: categoryName,
    ...(part.brand ? { brand: { "@type": "Brand", name: part.brand } } : {}),
    ...(part.imageUrl ? { image: part.imageUrl } : {}),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}${canonicalPath}`,
      priceCurrency: "EUR",
      price: priceCentsToDecimalString(part.priceCents),
      availability: SCHEMA_AVAILABILITY[part.availability],
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "CarO" },
      ...offerPolicies(),
    },
  };

  // Hetzelfde pad als het zichtbare kruimelpad hieronder
  const breadcrumbs = breadcrumbJsonLd([
    { name: t("breadcrumbHome"), path: `/${locale}` },
    {
      name: tFamily(`${family}.title`),
      path: getPathname({
        locale: locale as Locale,
        href: { pathname: "/[family]", params: { family: familyParam } },
      }),
    },
    {
      name: categoryName,
      path: getPathname({
        locale: locale as Locale,
        href: {
          pathname: "/[family]/[category]",
          params: { family: familyParam, category },
        },
      }),
    },
    { name: part.name, path: canonicalPath },
  ]);

  return (
    <div className="site-container py-8 md:py-12">
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbs} />

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
          {part.brand && <p className="eyebrow text-xs">{part.brand}</p>}
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
            {part.brand && (
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-muted">{t("brandLabel")}</dt>
                <dd className="font-medium">{part.brand}</dd>
              </div>
            )}

            {(part.specs ?? []).map((spec) => (
              <div key={spec.key} className="flex justify-between gap-4 py-3">
                <dt className="text-muted">
                  {spec.label ?? t(`specs.${spec.key}`)}
                </dt>
                <dd className="font-medium tabular-nums">
                  {/* Waarden van de leverancier die al een eigen label
                      dragen zijn ook al vertaald; die door de woordenlijst
                      halen zou "155/80-15" tot "155 / 80-15" verbouwen. */}
                  {spec.label ? spec.value : filterValueLabel(spec.value, tFilters)}
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
