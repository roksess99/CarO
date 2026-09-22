import Link from "next/link";
import { requirePermission } from "@/lib/admin/session";
import { allReviews, reviewSummary } from "@/lib/reviews/store";
import {
  HideForm,
  InviteButton,
  ReplyForm,
  UnhideButton,
} from "./review-actions";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function score(value: number | null): string {
  return value === null ? "—" : `${value}/5`;
}

export default async function BeoordelingenPage() {
  await requirePermission("beoordelingen");
  const [reviews, summary] = await Promise.all([allReviews(), reviewSummary()]);

  const waiting = reviews.filter((review) => !review.submittedAt).length;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <Link
        href="/beheer"
        className="text-sm text-muted underline underline-offset-4 hover:text-foreground"
      >
        ← Terug naar het overzicht
      </Link>

      <h1 className="mt-4 text-xl font-semibold tracking-tight">
        Beoordelingen
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Klanten krijgen één uitnodiging per bestelling: zeven dagen nadat jij
        hebt ingekocht, of anders veertien dagen na de betaling. De link werkt
        één keer.
      </p>

      <div className="mt-4 max-w-prose rounded-lg border border-border border-s-4 border-s-caro-orange bg-background p-4">
        <p className="text-sm">
          <span className="font-semibold">
            Een lage beoordeling mag je niet verbergen.
          </span>{" "}
          Negatieve beoordelingen wegfilteren is een oneerlijke handelspraktijk
          en de ACM handhaaft erop. Verbergen is er voor scheldwoorden, het
          adres van een derde of iets dat niet over de bestelling gaat — en de
          reden wordt vastgelegd.
        </p>
        <p className="mt-2 text-sm">
          Wat je wél kunt doen bij een klacht: er openbaar op antwoorden. Dat
          leest voor een volgende klant beter dan vijf keer vijf sterren.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-6 rounded-lg border border-border bg-background p-4">
        <p className="text-sm">
          <span className="font-semibold">Gemiddeld:</span>{" "}
          {summary === null ? (
            <span className="text-muted">nog geen beoordelingen</span>
          ) : (
            <span className="tabular-nums">
              {summary.average} uit {summary.count} — webshop{" "}
              {summary.shopAverage}, bestelling {summary.orderAverage}
            </span>
          )}
        </p>
        {waiting > 0 && (
          <p className="text-sm text-muted tabular-nums">
            {waiting} uitgenodigd, nog niet ingevuld
          </p>
        )}
        <InviteButton />
      </div>

      <section className="mt-10">
        {reviews.length === 0 ? (
          <p className="rounded-lg border border-border bg-background p-4 text-sm text-muted">
            Er is nog niemand uitgenodigd. Dat gebeurt vanzelf zodra een
            bestelling lang genoeg geleden is.
          </p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((review) => (
              <li
                key={review.id}
                className={`rounded-lg border bg-background p-4 ${
                  review.hiddenAt ? "border-danger/40" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-medium">
                    {review.displayName ?? (
                      <span className="text-muted">nog niet ingevuld</span>
                    )}
                    <span className="ms-2 text-sm font-normal text-muted tabular-nums">
                      {review.orderReference}
                    </span>
                  </p>
                  <p className="text-sm text-muted tabular-nums">
                    {review.submittedAt
                      ? dateFormat.format(review.submittedAt)
                      : `uitgenodigd ${dateFormat.format(review.invitedAt)}`}
                  </p>
                </div>

                {review.submittedAt && (
                  <>
                    <p className="mt-1 text-sm text-muted tabular-nums">
                      Webshop {score(review.shopRating)} · bestelling{" "}
                      {score(review.orderRating)}
                      {review.products.length > 0 && (
                        <>
                          {" · "}
                          {review.products
                            .map((p) => `${p.name}: ${p.rating}/5`)
                            .join(" · ")}
                        </>
                      )}
                    </p>
                    {review.body && (
                      <p className="mt-2 whitespace-pre-line text-sm">
                        {review.body}
                      </p>
                    )}
                  </>
                )}

                {review.hiddenAt && (
                  <p className="mt-2 rounded-md bg-surface px-3 py-2 text-sm">
                    <span className="font-semibold text-danger">Verborgen:</span>{" "}
                    {review.hiddenReason}
                  </p>
                )}

                {review.reply && (
                  <div className="mt-3 rounded-md border-s-2 border-s-caro-orange bg-surface p-3">
                    <p className="text-xs font-semibold text-muted">
                      Jouw antwoord
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm">
                      {review.reply}
                    </p>
                  </div>
                )}

                {review.submittedAt && (
                  <div className="mt-3 flex flex-wrap items-start gap-3">
                    <ReplyForm id={review.id} current={review.reply} />
                    {review.hiddenAt ? (
                      <UnhideButton id={review.id} />
                    ) : (
                      <HideForm id={review.id} />
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
