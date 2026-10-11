"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { pageKind } from "@/lib/stats/page-kind";
import { countStats, type StatEvent } from "@/lib/stats/send";
import { sourceFromReferrer } from "@/lib/stats/types";

/**
 * Telt een paginaweergave, en bij de eerste pagina ook een bezoek.
 *
 * **Wat een "bezoek" hier is** (winkelkeuze A, @docs/DECISIONS.md #24): een
 * paginaweergave zonder verwijzer van onze eigen site. Dus de eerste pagina
 * van iemand die binnenkomt. Dat telt zonder dat er iets op het apparaat van
 * de bezoeker wordt gezet — geen cookie, geen vingerafdruk — en dus zonder
 * toestemmingsbanner.
 *
 * De prijs daarvan staat erbij in de documentatie en op het dashboard: wie 's
 * ochtends en 's avonds terugkomt telt twee keer, en twee tabbladen tellen
 * ook twee keer. Voor de verhouding tussen de stappen maakt dat niets uit, en
 * dat is wat de eigenaar wil weten.
 *
 * `usePathname` geeft het pad mét taalsegment; bij een navigatie binnen de
 * site draait dit effect opnieuw, dus ook een doorklik telt mee.
 */
export function PageBeacon() {
  const pathname = usePathname();
  // React draait effecten in ontwikkelmodus twee keer; zonder dit staat elke
  // pagina in het dashboard dubbel zodra er lokaal gewerkt wordt.
  const gemeld = useRef<string | null>(null);
  // Alleen de eerste pagina van dít document kan een bezoek zijn. Klikt de
  // klant daarna door, dan blijft `document.referrer` staan op wat het was —
  // zonder deze vlag zou elke doorklik van een directe bezoeker als een nieuw
  // bezoek tellen.
  const eerste = useRef(true);

  useEffect(() => {
    if (gemeld.current === pathname) return;
    gemeld.current = pathname;

    // Alles wat dit moment oplevert gaat in één verzoek de deur uit. Op de
    // eerste pagina van een bezoek zijn dat er drie; dat waren er ook drie
    // apart, met drie keer dezelfde reis langs de snelheidsrem en de
    // database (lib/stats/send.ts).
    const events: StatEvent[] = [
      { e: "pageview", l: pageKind(pathname) },
    ];

    if (eerste.current) {
      eerste.current = false;
      const source = sourceFromReferrer(document.referrer, location.hostname);
      // Lege herkomst betekent: de verwijzer is onze eigen site. Dan is dit
      // geen nieuw bezoek maar een pagina die in een nieuw tabblad is
      // geopend.
      if (source) {
        events.push({ e: "visit" }, { e: "source", l: source });
      }
    }

    countStats(events);
  }, [pathname]);

  return null;
}
