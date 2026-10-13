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
 * Hoofdgroep uit het categorierooster → foto.
 *
 * De eigenaar vroeg 2026-10-12 ook foto's bij "Categorieën voor jouw auto",
 * het rooster onder de rij "meest gezocht". Daar stond het pictogram van de
 * leverancier: een lijntekening van het systeem, en alleen hoofdgroepen
 * hebben er een.
 *
 * **De sleutel is de naam en niet het nummer**, en dat is geen smaak maar de
 * les van @docs/DECISIONS.md #7: een `assemblyGroupNodeId` is een verwijzing
 * en geen sleutel. Tien van de elf nummers die daar ooit vastlagen wezen een
 * jaar later naar de groep ernaast, en dat ging stil mis — de tegel werkte,
 * hij toonde alleen een ander onderdeel. Namen zijn wél stabiel; ze komen van
 * het NL-platform.
 *
 * `photoKey()` haalt leestekens en hoofdletters eruit, want de leverancier is
 * daar niet consequent in ("Service-/ Inspectie/ Onderhoudsonderdelen",
 * "smeermiddelen" met een kleine letter).
 *
 * **Tien groepen lenen een foto die er al stond.** Een accu ís het beeld bij
 * Elektrische systemen en een remschijf bij Remsysteem; er een tweede voor
 * zoeken zou alleen een tweede bestand opleveren.
 *
 * **Drie groepen hebben er bewust geen.** Bij Informatie / Communicatie,
 * Veiligheidssystemen en Hybride-/elektrische aandrijving leverde de catalogus
 * voor de gemeten auto geen bruikbare foto — een haaienvinantenne met het
 * watermerk van de groothandel er dwars overheen, of helemaal niets. Die
 * houden de lijntekening van de leverancier.
 *
 * **Persluchtsysteem en Wielen/Banden kwamen er 2026-10-13 alsnog bij**, en
 * langs een andere weg: niet via de categorieboom maar via een zoekopdracht op
 * naam. Die boom hangt aan de gekozen auto en had voor deze twee niets; een
 * zoekopdracht niet, want die werkt zonder auto (@docs/api/WEARPARTS.md). Dat
 * is de weg om te volgen als er nog een groep bijkomt die leeg blijft.
 */
const MAIN_PHOTOS: Record<string, string> = {
  aandrijfassentoebehoren: "/onderdelen/groep-aandrijfassen.jpg",
  accessoires: "/onderdelen/groep-accessoires.jpg",
  airconditioning: "/onderdelen/groep-airconditioning.jpg",
  asaandrijving: "/onderdelen/groep-asaandrijving.jpg",
  brandstofmanagement: "/onderdelen/brandstoffilter.jpg",
  brandstofvoorbereiding: "/onderdelen/groep-brandstofvoorbereiding.jpg",
  carrosserie: "/onderdelen/groep-carrosserie.jpg",
  comfortsystemen: "/onderdelen/groep-comfortsystemen.jpg",
  elektrischesystemen: "/onderdelen/accu.jpg",
  filter: "/onderdelen/luchtfilter.jpg",
  interieuruitvoering: "/onderdelen/groep-interieuruitvoering.jpg",
  koelsysteem: "/onderdelen/groep-koelsysteem.jpg",
  koppelingmontageonderdelen: "/onderdelen/groep-koppeling.jpg",
  motor: "/onderdelen/groep-motor.jpg",
  nevenbak: "/onderdelen/groep-nevenbak.jpg",
  persluchtsysteem: "/onderdelen/groep-persluchtsysteem.jpg",
  ontstekinggloeisysteem: "/onderdelen/bougie.jpg",
  remsysteem: "/onderdelen/remschijf.jpg",
  riemenspanenlooprollen: "/onderdelen/distributieriem.jpg",
  serviceinspectieonderhoudsonderdelen: "/onderdelen/oliefilter.jpg",
  smeermiddelen: "/onderdelen/motorolie.jpg",
  stuurinrichting: "/onderdelen/groep-stuurinrichting.jpg",
  transportsystemen: "/onderdelen/groep-transportsystemen.jpg",
  trekhakenonderdelen: "/onderdelen/groep-trekhaken.jpg",
  uitlaatsysteem: "/onderdelen/groep-uitlaatsysteem.jpg",
  vergrendelsystemen: "/onderdelen/groep-vergrendelsystemen.jpg",
  veringdemping: "/onderdelen/schokdemper.jpg",
  versnellingsbak: "/onderdelen/groep-versnellingsbak.jpg",
  verwarmingventilatie: "/onderdelen/groep-verwarming.jpg",
  wielenbanden: "/onderdelen/groep-wielen-banden.jpg",
  wielophangingwiellagers: "/onderdelen/groep-wielophanging.jpg",
  wisserbladentoebehoren: "/onderdelen/wisserblad.jpg",
};

/** Naam → sleutel: alleen letters en cijfers, in kleine letters */
function photoKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * De foto bij een hoofdgroep uit het rooster, of `undefined`.
 *
 * Geen foto is geen fout: `group-list.tsx` valt dan terug op het pictogram van
 * de leverancier, en dat is precies wat er vóór 2026-10-12 overal stond.
 */
export function mainGroupPhoto(name: string | undefined): string | undefined {
  return name ? MAIN_PHOTOS[photoKey(name)] : undefined;
}

/**
 * Alle bestanden zijn 400×400 op wit (verkleind met sharp, mozjpeg q82).
 * Vierkant, zodat de tegel geen enkele foto hoeft bij te snijden.
 */
export const GROUP_PHOTO_SIZE = 400;

/** De foto bij een groep, of `undefined` als die er niet is */
export function groupPhoto(key: string | undefined): string | undefined {
  return key ? PHOTOS[key] : undefined;
}
