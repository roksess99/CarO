import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { formatRating, Stars } from "@/components/reviews/stars";
import { getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { COMPANY } from "@/lib/company";
import { publishedReviews, reviewSummary } from "@/lib/reviews/store";
import { localizedMetadata, SITE_URL, socialMetadata } from "@/lib/site";

type Props = { params: Promise<{ locale: string }> };

/** Elk uur opnieuw: beoordelingen komen binnen, maar niet bij de minuut */
export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviews" });
  const href = "/reviews" as const;
  const path = (l: Locale) => getPathname({ locale: l, href });
  const title = `${t("title")} — CarO`;

  return {
    title,
    description: t("intro"),
    ...localizedMetadata(locale, path),
    ...socialMetadata({
      locale,
      title,
      description: t("intro"),
      path: path(locale as Locale),
    }),
  };
}

const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function ReviewsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("reviews");

  const [summary, reviews] = await Promise.all([
    reviewSummary(),
    publishedReviews(),
  ]);

  // Markering alleen met echte beoordelingen erachter. Cijfers verzinnen is
  // voor Google reden om de markering van de héle site te negeren, en voor de
  // ACM een oneerlijke handelspraktijk (.claude/rules/frontend.md).
  const jsonLd =
    summary === null
      ? null
      : {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: COMPANY.name,
          url: SITE_URL,
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: summary.average,
            reviewCount: summary.count,
            bestRating: 5,
            worstRating: 1,
          },
        };

  return (
    <div className="site-container max-w-3xl py-12 md:py-16">
      {jsonLd && <JsonLd data={jsonLd} />}

      <p className="eyebrow text-sm">{t("eyebrow")}</p>
      <h1 className="mt-3 text-3xl md:text-4xl">{t("title")}</h1>
      <p className="mt-4 max-w-2xl text-muted">{t("intro")}</p>

      {summary === null ? (
        <p className="mt-10 max-w-xl rounded-lg border border-border bg-surface p-6 text-muted">
          {t("empty")}
        </p>
      ) : (
        <>
          <div className="mt-8 rounded-lg border border-border border-t-4 border-t-caro-orange bg-surface p-6">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <p className="text-4xl font-bold tabular-nums">
                {summary.average.toLocaleString("nl-NL", {
                  minimumFractionDigits: 1,
                })}
              </p>
              <Stars
                rating={summary.average}
                label={t("outOfFive", { rating: formatRating(summary.average) })}
              />
              <p className="text-sm text-muted">
                {t("count", { count: summary.count })}
              </p>
            </div>
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="flex items-baseline justify-between gap-3 rounded-md bg-background px-3 py-2">
                <dt className="text-sm">{t("shopAverage")}</dt>
                <dd className="text-sm font-semibold tabular-nums">
                  {summary.shopAverage.toLocaleString("nl-NL", {
                    minimumFractionDigits: 1,
                  })}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 rounded-md bg-background px-3 py-2">
                <dt className="text-sm">{t("orderAverage")}</dt>
                <dd className="text-sm font-semibold tabular-nums">
                  {summary.orderAverage.toLocaleString("nl-NL", {
                    minimumFractionDigits: 1,
                  })}
                </dd>
              </div>
            </dl>
            {/* Waarom dit cijfer te vertrouwen is. De Omnibus-richtlijn vraagt
                dit letterlijk: zeg of en hoe je controleert dat beoordelingen
                van echte kopers komen. */}
            <p className="mt-4 text-sm text-muted">{t("verified")}</p>
          </div>

          <ul className="mt-10 space-y-6">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-lg border border-border bg-background p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <p className="font-semibold">{review.displayName}</p>
                  <p className="text-sm text-muted tabular-nums">
                    {review.submittedAt
                      ? dateFormat.format(review.submittedAt)
                      : ""}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-muted">{t("shopAverage")}</span>
                    <Stars
                      rating={review.shopRating ?? 0}
                      label={t("outOfFive", { rating: formatRating(review.shopRating ?? 0) })}
                    />
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted">{t("orderAverage")}</span>
                    <Stars
                      rating={review.orderRating ?? 0}
                      label={t("outOfFive", { rating: formatRating(review.orderRating ?? 0) })}
                    />
                  </span>
                </div>

                {review.body && (
                  <p className="mt-3 whitespace-pre-line">{review.body}</p>
                )}

                {review.products.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {review.products.map((product) => (
                      <li
                        key={product.partId}
                        className="flex flex-wrap items-center gap-2 text-sm text-muted"
                      >
                        <Stars
                          rating={product.rating}
                          label={t("outOfFive", { rating: formatRating(product.rating) })}
                        />
                        <span>{product.name}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {review.reply && (
                  <div className="mt-4 rounded-md border-s-2 border-s-caro-orange bg-surface p-3">
                    <p className="text-sm font-semibold">{t("replyFrom")}</p>
                    <p className="mt-1 text-sm whitespace-pre-line">
                      {review.reply}
                    </p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-10 text-sm text-muted">{t("howToGet")}</p>
    </div>
  );
}
