import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReviewForm } from "@/components/reviews/review-form";
import { Link } from "@/i18n/navigation";
import { readOrder, orderProducts } from "@/lib/orders/store";
import { reviewByToken } from "@/lib/reviews/store";

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

/**
 * Deze pagina hangt aan een persoonlijke link en hoort nergens in een index.
 * `noindex` én uit de sitemap: een beoordelingsformulier met het token van
 * iemand anders erin is precies wat niet gevonden mag worden.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "review" });
  return {
    title: `${t("title")} — CarO`,
    robots: { index: false, follow: false },
  };
}

export default async function ReviewPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("review");

  const review = await reviewByToken(token);
  // Een onbekend of verminkt token is gewoon een pagina die niet bestaat. Geen
  // melding die verraadt dát er beoordelingen zijn en hoe de link eruitziet.
  if (!review) notFound();

  const [order, lines] = await Promise.all([
    readOrder(review.orderReference),
    orderProducts(review.orderReference),
  ]);

  if (review.submittedAt) {
    return (
      <div className="site-container max-w-2xl py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl">{t("alreadyTitle")}</h1>
        <p className="mt-4 text-muted">{t("alreadyBody")}</p>
        <Link
          href="/reviews"
          className="mt-6 inline-flex rounded-md bg-caro-orange px-5 py-2.5 font-semibold text-caro-ink"
        >
          {t("readAll")}
        </Link>
      </div>
    );
  }

  // De voorzet voor de naam: voornaam plus de eerste letter van de achternaam.
  // Dat is hoe beoordelingen er op de site uitzien, en de klant kan het
  // aanpassen of anoniem kiezen.
  const customer = order?.document.customer;
  const suggestedName = customer
    ? [customer.firstName, customer.lastName.slice(0, 1)]
        .filter(Boolean)
        .join(" ")
        .trim() + (customer.lastName ? "." : "")
    : "";

  return (
    <div className="site-container max-w-2xl py-12 md:py-16">
      <p className="eyebrow text-sm">{t("eyebrow")}</p>
      <h1 className="mt-3 text-3xl md:text-4xl">{t("title")}</h1>
      <p className="mt-4 text-muted">
        {t("intro", { reference: review.orderReference })}
      </p>

      <div className="mt-10">
        <ReviewForm
          token={review.token}
          suggestedName={suggestedName}
          products={lines.map((line) => ({
            partId: line.partId,
            name: line.name,
          }))}
        />
      </div>

      <p className="mt-10 text-sm text-muted">{t("privacyNote")}</p>
    </div>
  );
}
