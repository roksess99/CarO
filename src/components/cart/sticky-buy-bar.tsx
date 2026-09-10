"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import type { Part } from "@/lib/catalog/types";
import { formatPriceCents } from "@/lib/format";

/**
 * Koopbalk die op mobiel verschijnt zodra de gewone bestelknop uit beeld is.
 *
 * Een productpagina op een telefoon is lang: foto, passendheid, omschrijving,
 * artikelgegevens. Wie halverwege besluit te kopen moet nu terugscrollen naar
 * een knop die hij niet meer ziet staan. Deze balk houdt prijs én knop onder
 * de duim, zonder ze te verdubbelen zolang de echte knop gewoon in beeld is.
 *
 * Hij zweeft bóven de tabbalk (bottom-nav.tsx) in plaats van eroverheen: die
 * balk is de navigatie van de hele site en mag niet verdwijnen omdat er
 * toevallig een product op het scherm staat.
 *
 * Alleen onder lg, want daarboven staat de tabbalk er ook niet en past de
 * bestelknop naast de foto in beeld.
 */
export function StickyBuyBar({
  part,
  /** Id van het element dat de echte bestelknop bevat */
  watch,
}: {
  part: Part;
  watch: string;
}) {
  const t = useTranslations("product");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watch);
    // Geen doel gevonden: dan liever géén balk dan een balk die altijd staat.
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      // De balk hoort pas te komen als de knop écht weg is, niet als er nog
      // een randje van zichtbaar is.
      { threshold: 0 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [watch]);

  return (
    <div
      // aria-hidden als hij weg is: de echte knop staat dan in beeld en twee
      // keer "In winkelwagen" in de voorleesvolgorde is verwarrend.
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 px-3 transition-[opacity,transform] lg:hidden ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-border bg-background/95 p-2 shadow-lg backdrop-blur">
        {/* Prijs en btw-regel onder elkaar, niet achter elkaar: op 375px
            bleef er naast de knop een strook van zo'n 150px over en brak
            "€ 37,51 incl. 21% btw" middenin af. De artikelnaam valt daar
            helemaal weg — die staat als kop bovenaan dezelfde pagina. */}
        <div className="min-w-0 flex-1 ps-1">
          <p className="hidden truncate text-xs text-muted sm:block">
            {part.name}
          </p>
          <p className="truncate text-lg leading-tight font-bold tabular-nums">
            {formatPriceCents(part.priceCents)}
          </p>
          <p className="truncate text-xs leading-tight text-muted">
            {t("inclVat")}
          </p>
        </div>
        <AddToCartButton
          part={part}
          className="h-12 shrink-0 px-5"
          // De knop mag niet in de tabvolgorde staan zolang de balk verstopt
          // is; anders springt de focus naar een onzichtbare knop.
          tabIndex={visible ? undefined : -1}
        />
      </div>
    </div>
  );
}
