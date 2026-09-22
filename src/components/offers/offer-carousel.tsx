"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DiscountBadge } from "@/components/discount-badge";
import { OldPrice } from "@/components/old-price";
import { ProductImagePlaceholder } from "@/components/product-image-placeholder";
import { Link } from "@/i18n/navigation";
import { familySlug } from "@/lib/catalog/families";
import type { Part } from "@/lib/catalog/types";
import { formatPriceCents } from "@/lib/format";

/**
 * De aanbiedingen in de bannerkolom van de hero, die vanzelf doorschuiven.
 *
 * Drie dingen zitten er met opzet in en mogen er niet uit:
 *
 * - **Een pauzeknop.** WCAG 2.2.2 eist dat bewegende inhoud die langer dan vijf
 *   seconden doorloopt te stoppen is. Hij pauzeert ook vanzelf zodra de muis
 *   erop staat of het toetsenbord erin komt, en bij `prefers-reduced-motion`
 *   beweegt hij helemaal niet.
 * - **Alle dia's staan in de HTML.** Dit is het grootste beeld van de pagina en
 *   dus de LCP; het eerste artikel moet meekomen met het antwoord van de
 *   server, niet pas door JavaScript worden opgehaald.
 * - **De doorgestreepte prijs verschijnt vanzelf**, zodra een artikel dertig
 *   dagen prijsgeschiedenis heeft. Tot dan staat er alleen het percentage —
 *   dat is geen tekortkoming maar de wet (docs/DECISIONS.md #14).
 */

const INTERVAL_MS = 6000;

export function OfferCarousel({ parts }: { parts: Part[] }) {
  const t = useTranslations("home");
  const locale = useLocale();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState(false);

  const total = parts.length;

  useEffect(() => {
    if (total < 2 || !playing || held) return;
    // Wie aangeeft minder beweging te willen, krijgt een stilstaande dia
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % total);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [total, playing, held]);

  if (total === 0) return null;

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-background"
      // Pauzeren zodra iemand kijkt of navigeert: een dia die wegschuift
      // terwijl je hem leest of erop wilt klikken is de bekendste klacht over
      // dit soort blokken.
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
      aria-roledescription="carousel"
      aria-label={t("offersEyebrow")}
    >
      <div className="relative">
        {parts.map((part, slide) => (
          <Slide
            key={part.id}
            part={part}
            locale={locale}
            active={slide === index}
            first={slide === 0}
            position={slide + 1}
            total={total}
          />
        ))}
      </div>

      {total > 1 && (
        <div className="flex items-center gap-3 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={() => setPlaying((on) => !on)}
            aria-pressed={!playing}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-foreground hover:bg-surface"
            title={playing ? t("offersPause") : t("offersPlay")}
          >
            <span className="sr-only">
              {playing ? t("offersPause") : t("offersPlay")}
            </span>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-4"
              fill="currentColor"
            >
              {playing ? (
                <>
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </>
              ) : (
                <path d="M8 5.5v13l11-6.5z" />
              )}
            </svg>
          </button>

          <div className="flex flex-wrap gap-2">
            {parts.map((part, slide) => (
              <button
                key={part.id}
                type="button"
                onClick={() => setIndex(slide)}
                aria-current={slide === index}
                className={`size-3 rounded-full border border-border ${
                  slide === index ? "bg-caro-orange" : "bg-surface"
                }`}
              >
                <span className="sr-only">
                  {t("offersGoTo", { number: slide + 1 })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Slide({
  part,
  locale,
  active,
  first,
  position,
  total,
}: {
  part: Part;
  locale: string;
  active: boolean;
  first: boolean;
  position: number;
  total: number;
}) {
  const t = useTranslations("home");
  const tProduct = useTranslations("product");
  const href = {
    pathname: "/[family]/[category]/[part]",
    params: {
      family: familySlug(part.family, locale),
      category: part.categorySlug,
      part: part.slug,
    },
  } as const;

  // De eerste dia bepaalt de hoogte van het vak en blijft in de stroom staan;
  // de rest ligt eroverheen. Zo hoeft er geen hoogte geraden te worden voor
  // beeld dat per artikel verschilt, en springt de pagina niet als er een
  // langere artikelnaam langskomt.
  const placement = first
    ? "relative"
    : `absolute inset-0 ${active ? "" : "pointer-events-none"}`;

  return (
    <div
      className={`${placement} transition-opacity duration-500 ${active ? "opacity-100" : "opacity-0"}`}
      aria-hidden={!active}
      // Zonder dit blijft een onzichtbare dia bereikbaar met de tabtoets
      inert={!active}
      aria-roledescription="slide"
      aria-label={t("offersCount", { number: position, total })}
    >
      <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,14rem)_1fr] sm:items-center md:p-6">
        <div className="relative">
          {part.imageUrl ? (
            <Image
              src={part.imageUrl}
              alt=""
              width={400}
              height={400}
              // Het grootste beeld boven de vouw: de eerste dia laadt met
              // voorrang, de rest pas als de klant doorschuift.
              priority={first}
              sizes="(min-width: 1024px) 14rem, (min-width: 640px) 40vw, 90vw"
              className="aspect-4/3 w-full rounded-lg bg-surface object-contain sm:aspect-square"
            />
          ) : (
            <ProductImagePlaceholder
              label={tProduct("noImage")}
              className="aspect-4/3 rounded-lg opacity-60 sm:aspect-square"
            />
          )}
          <DiscountBadge
            percent={part.discountPercent}
            className="absolute start-2 top-2 shadow-sm"
          />
        </div>

        <div className="min-w-0">
          <p className="eyebrow text-xs">{t("offersEyebrow")}</p>
          <p className="mt-2 line-clamp-2 text-lg font-semibold md:text-xl">
            {part.name}
          </p>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
            <span className="text-3xl font-bold tabular-nums">
              {formatPriceCents(part.priceCents)}
            </span>
            <OldPrice cents={part.listPriceCents} />
          </p>
          <p className="text-xs text-muted">{tProduct("inclVat")}</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={href}
              className="inline-flex rounded-md bg-caro-orange px-5 py-2.5 font-semibold text-caro-ink"
            >
              {t("offersCta")}
            </Link>
            <Link
              href="/offers"
              className="inline-flex rounded-md border border-border px-5 py-2.5 font-semibold hover:bg-surface"
            >
              {t("offersAll")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
