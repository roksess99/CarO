import { getTranslations } from "next-intl/server";
import { formatRating, Stars } from "@/components/reviews/stars";
import { Link } from "@/i18n/navigation";
import { reviewSummary } from "@/lib/reviews/store";

/**
 * Het gemiddelde cijfer op de homepage, met een link naar de beoordelingen.
 *
 * **Verschijnt pas als er echte beoordelingen zijn.** Een lege strook met
 * "nog geen beoordelingen" verkoopt niets en een verzonnen cijfer is een
 * oneerlijke handelspraktijk; zolang er niets staat is er ook niets te tonen.
 * Zelfde regel als bij de aanbiedingencarrousel: geen plaatshouder voor iets
 * wat nog niet bestaat.
 *
 * Deze staat in een eigen `<Suspense>` op de homepage, want hij raakt de
 * database en de hero mag daar niet op wachten.
 */
export async function ReviewStrip() {
  const summary = await reviewSummary();
  if (summary === null) return null;

  const t = await getTranslations("reviews");
  const rating = summary.average.toLocaleString("nl-NL", {
    minimumFractionDigits: 1,
  });

  return (
    <section className="site-container pb-16 md:pb-24">
      <Link
        href="/reviews"
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-border bg-surface p-5 hover:border-caro-orange"
      >
        <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-3xl font-bold tabular-nums">{rating}</span>
          <Stars
            rating={summary.average}
            label={t("outOfFive", { rating: formatRating(summary.average) })}
          />
          <span className="text-sm text-muted">
            {t("count", { count: summary.count })}
          </span>
        </span>
        <span className="text-sm font-semibold underline underline-offset-4">
          {t("title")}
        </span>
      </Link>
    </section>
  );
}
