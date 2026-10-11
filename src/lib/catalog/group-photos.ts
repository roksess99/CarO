/**
 * Een productfoto per veelgezochte onderdeelgroep.
 *
 * De eigenaar vroeg 2026-10-11 om foto's in plaats van de lijntekeningen in
 * `group-icon.tsx`. Dat draait de keuze van @docs/DECISIONS.md #9 terug, waar
 * "elf foto's inkopen zou elf licenties vragen" de reden was om zelf te
 * tekenen.
 *
 * **Die reden is vervallen, want deze foto's zijn niet ingekocht.** Het zijn
 * de productfoto's van de groothandel — dezelfde bron als elke productkaart
 * in deze winkel. Ze staan in `public/onderdelen/`, op onze eigen server en
 * niet als hotlink; herkomst per bestand in `public/onderdelen/BRONNEN.md`.
 *
 * GEMETEN 2026-10-11, want vrije stockfoto's waren de eerste gedachte:
 * Openverse (CC0 en publiek domein) geeft **nul** treffers voor
 * interieurfilter, remblok, koelvloeistof en wisserblad; "motorolie" geeft er
 * 240 die allemaal reclameplaten uit 1934-1953 zijn. Pexels geeft bij "brake
 * pads" motorfietsremklauwen en monteurs in garages. Deze categorieën zijn te
 * specifiek voor stockfotografie — ga daar niet opnieuw zoeken.
 *
 * **Waarom een lijst en niet `/onderdelen/${key}.jpg`.** Dan zou elke nieuwe
 * sleutel in `quick-links.ts` stilletjes een 404 opleveren: een kapot plaatje
 * in de winkel, zonder dat iets faalt bij het bouwen. Nu is "geen foto"
 * expliciet, en valt de tegel terug op de tekening.
 *
 * Vandaag hebben alle veertien groepen er een, en de terugval staat er dus
 * voor de volgende groep die erbij komt.
 *
 * **De schokdemper kwam er pas via de winkel zelf.** Vijf wegen door de API
 * liepen dood (zoeken geeft alleen beschermkappen en aanslagrubbers,
 * `filter[genericArticleId]=854` geeft HTTP 500, en een directe vraag om
 * knoop 775 gaf nul artikelen) terwijl de tegel er 86 toonde. De
 * categoriepagina van diezelfde knoop liet ze gewoon zien. Les: als de winkel
 * iets kan wat een los script niet kan, is het antwoord in de winkel te
 * vinden — zie BRONNEN.md.
 */

/** Sleutel uit `POPULAR_PART_GROUPS` → bestand in `public/onderdelen/` */
const PHOTOS: Record<string, string> = {
  oliefilter: "/onderdelen/oliefilter.jpg",
  luchtfilter: "/onderdelen/luchtfilter.jpg",
  brandstoffilter: "/onderdelen/brandstoffilter.jpg",
  interieurfilter: "/onderdelen/interieurfilter.jpg",
  remblok: "/onderdelen/remblok.jpg",
  remschijf: "/onderdelen/remschijf.jpg",
  motorolie: "/onderdelen/motorolie.jpg",
  remvloeistof: "/onderdelen/remvloeistof.jpg",
  koelvloeistof: "/onderdelen/koelvloeistof.jpg",
  accu: "/onderdelen/accu.jpg",
  wisserblad: "/onderdelen/wisserblad.jpg",
  bougie: "/onderdelen/bougie.jpg",
  schokdemper: "/onderdelen/schokdemper.jpg",
  distributieriem: "/onderdelen/distributieriem.jpg",
};

/**
 * Alle bestanden zijn 400×400 op wit (verkleind met sharp, mozjpeg q82).
 * Vierkant, zodat de tegel geen enkele foto hoeft bij te snijden.
 */
export const GROUP_PHOTO_SIZE = 400;

/** De foto bij een groep, of `undefined` als die er niet is */
export function groupPhoto(key: string | undefined): string | undefined {
  return key ? PHOTOS[key] : undefined;
}
