"use client";

import { useLinkStatus } from "next/link";
import { Link } from "@/i18n/navigation";
import type { ComponentProps } from "react";

type Href = ComponentProps<typeof Link>["href"];

/**
 * "Meer laden" onder een productlijst.
 *
 * Het aantal staat in de URL (`?toon=40`), niet in state: zo blijft een lijst
 * deelbaar, werkt de terugknop en is er geen JavaScript nodig om hem te
 * bedienen. Wat er wél voor nodig was:
 *
 * **`scroll={false}`.** Next springt bij elke navigatie naar de bovenkant van
 * de pagina. GEMETEN op /nl/banden/auto-suv-1: `scrollY` ging van 5430 naar 0,
 * dus de klant stond na het klikken weer bij de eerste band en moest langs
 * alle twintig die hij al gezien had terugscrollen naar de nieuwe. Dat is ook
 * waar het gevoel "de hele pagina laadt opnieuw" vandaan kwam — het ís één
 * navigatie, maar zonder documentverversing (gemeten: een variabele op
 * `window` overleeft de klik).
 *
 * **Een wachtmelding.** De lijst komt bij de leverancier vandaan en dat duurt;
 * zonder terugkoppeling lijkt de knop kapot en klikt de klant nog eens.
 */
export function LoadMore({
  href,
  label,
  busyLabel,
}: {
  href: Href;
  label: string;
  busyLabel: string;
}) {
  return (
    <div className="mt-8 flex justify-center">
      <Link
        href={href}
        scroll={false}
        className="rounded-md border border-border px-6 py-3 font-semibold hover:border-caro-orange hover:bg-surface"
      >
        <LoadMoreLabel label={label} busyLabel={busyLabel} />
      </Link>
    </div>
  );
}

/**
 * `useLinkStatus` werkt alleen binnen de `Link` zelf, vandaar dit aparte
 * onderdeel: het weet of de navigatie loopt, de knop eromheen niet.
 */
function LoadMoreLabel({
  label,
  busyLabel,
}: {
  label: string;
  busyLabel: string;
}) {
  const { pending } = useLinkStatus();
  return (
    // Ook voor schermlezers: de knop blijft staan, alleen zijn tekst verandert
    <span aria-live="polite" className={pending ? "text-muted" : undefined}>
      {pending ? busyLabel : label}
    </span>
  );
}
