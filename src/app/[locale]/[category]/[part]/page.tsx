import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CaroMark } from "@/components/brand/caro-mark";
import { AddToCartWithQuantity } from "@/components/cart/add-to-cart-with-quantity";
import { getPathname, Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCatalogProvider } from "@/lib/catalog/provider";
import type { Part } from "@/lib/catalog/types";
import { formatPriceCents, priceCentsToDecimalString } from "@/lib/format";

type Props = {
  params: Promise<{ locale: string; category: string; part: string }>;
};

// TODO: echte domeinnaam zodra hosting vaststaat (docs/DECISIONS.md #2)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Bewust geen generateStaticParams: de echte catalogus heeft te veel
// artikelen om voor te renderen. De adapter cachet de API-calls al.

/** Eén onderdeel ophalen en controleren dat het in déze categorie zit */
async function findPart(categorySlug: string, partSlug: string): Promise<Part> {
  const part = await getCatalogProvider().getPartBySlug(partSlug);
  // Categorie-mismatch → 404, anders is hetzelfde artikel op meerdere
  // URL's bereikbaar (dubbele content)
  if (!part || part.categorySlug !== categorySlug) notFound();
  return part;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category, part: partSlug } = await params;
  const part = await getCatalogProvider().getPartBySlug(partSlug);
  if (!part || part.categorySlug !== category) return {};

  const t = await getTranslations({ locale, namespace: "product" });
  const href = {
    pathname: "/[category]/[part]",
    params: { category, part: partSlug },
  } as const;

  return {
    title: `${part.name} — ${part.brand} — CarO`,
    description: t("metaDescription", {
      name: part.name,
      brand: part.brand,
      oeNumber: part.oeNumber,
    }),
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: getPathname({ locale: locale as Locale, href }),
      languages: {
        nl: getPathname({ locale: "nl", href }),
        en: getPathname({ locale: "en", href }),
      },
    },
  };
}

const SCHEMA_AVAILABILITY = {
  "in-stock": "https://schema.org/InStock",
  ordered: "https://schema.org/BackOrder",
  "out-of-stock": "https://schema.org/OutOfStock",
} as const;

export default async function ProductPage({ params }: Props) {
  const { locale, category, part: partSlug } = await params;
  setRequestLocale(locale);

  const part = await findPart(category, partSlug);
  const t = await getTranslations("product");
  const categories = await getCatalogProvider().getCategories();
  const categoryName =
    categories.find((c) => c.slug === category)?.name ?? category;

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
      url: `${SITE_URL}${getPathname({
        locale: locale as Locale,
        href: {
          pathname: "/[category]/[part]",
          params: { category, part: partSlug },
        },
      })}`,
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
              href={{ pathname: "/[category]", params: { category } }}
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
            <div
              role="img"
              aria-label={t("noImage")}
              className="flex aspect-4/3 w-full items-center justify-center rounded-lg border border-border bg-surface"
            >
              <CaroMark variant="line" className="size-16 opacity-30" />
            </div>
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
          <p
            className={
              part.availability === "out-of-stock"
                ? "mt-2 text-sm text-muted"
                : "mt-2 text-sm font-medium"
            }
          >
            {t(`availability.${part.availability}`)}
          </p>

          <div className="mt-8">
            <AddToCartWithQuantity part={part} />
          </div>

          <h2 className="mt-10 text-lg">{t("detailsTitle")}</h2>
          <dl className="mt-4 divide-y divide-border border-y border-border text-sm">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-muted">{t("brandLabel")}</dt>
              <dd className="font-medium">{part.brand}</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-muted">{t("oeLabel")}</dt>
              <dd className="font-medium tabular-nums">{part.oeNumber}</dd>
            </div>
          </dl>

          <p className="mt-6 text-sm text-muted">{t("shippingNote")}</p>
          <p className="mt-2 text-sm text-muted">{t("withdrawalNote")}</p>
        </div>
      </div>
    </div>
  );
}
