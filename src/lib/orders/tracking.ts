/**
 * Track & trace: van wat de beheerder intypt naar een link die de klant kan
 * aanklikken.
 *
 * Framework-onafhankelijk en zonder database eromheen, zodat zowel de Server
 * Action als het formulier in de browser hem mag importeren — dezelfde reden
 * als bij `markup-math.ts` en `code-base.ts` (@docs/DECISIONS.md #17: een
 * bestand dat de database aanspreekt trekt de MySQL-driver de browserbundel
 * in en de hele pagina geeft HTTP 500).
 *
 * **Twee soorten invoer, en de link wint altijd.** De beheerder krijgt van de
 * vervoerder een mail met een lijn erin; die mag hij plakken en dan gaat hij
 * onveranderd naar de klant. Heeft hij alleen een barcode, dan bouwen wij de
 * link uit de vervoerder plus het bezorgadres. Dat laatste kan niet voor elke
 * vervoerder (zie `anders`), en dan krijgt de klant de code zonder link —
 * eerlijker dan een gok die op een 404 uitkomt.
 */

export type CarrierId = "postnl" | "dhl" | "dpd" | "gls" | "ups" | "anders";

export interface Carrier {
  id: CarrierId;
  name: string;
  /**
   * De link bij een kale code, of `null` als die niet te bouwen is.
   *
   * **Deze adressen zijn niet gemeten tegen een echte zending**, want daarvoor
   * is een echt pakket nodig. Ze komen van de volgsites van de vervoerders
   * zelf. Klopt er één niet meer, dan is het één regel hier — en de beheerder
   * kan in de tussentijd altijd de lijn uit zijn eigen mail plakken, die gaat
   * hier niet langs.
   */
  url: (code: string, address: TrackingAddress) => string | null;
}

/** Wat een vervoerder naast de code nodig heeft om de zending te vinden */
export interface TrackingAddress {
  /** Zonder spatie, in hoofdletters: `7038DE` */
  postcode: string;
  /** Landcode van het bezorgadres, bv. `NL` */
  country: string;
}

export const CARRIERS: ReadonlyArray<Carrier> = [
  {
    id: "postnl",
    name: "PostNL",
    // PostNL wil de barcode, het land én de postcode: zonder die laatste twee
    // geeft de pagina "zending niet gevonden". Wij hebben ze op de bestelling
    // staan, dus de beheerder hoeft ze niet in te typen.
    url: (code, address) =>
      address.postcode
        ? `https://jouw.postnl.nl/track-and-trace/${code}-${address.country}-${address.postcode}`
        : null,
  },
  {
    id: "dhl",
    name: "DHL",
    url: (code) =>
      `https://www.dhl.com/nl-nl/home/traceren.html?tracking-id=${code}`,
  },
  {
    id: "dpd",
    name: "DPD",
    url: (code) => `https://tracking.dpd.de/status/nl_NL/parcel/${code}`,
  },
  {
    id: "gls",
    name: "GLS",
    url: (code) => `https://gls-group.eu/NL/nl/pakket-volgen?match=${code}`,
  },
  {
    id: "ups",
    name: "UPS",
    url: (code) => `https://www.ups.com/track?loc=nl_NL&tracknum=${code}`,
  },
  {
    id: "anders",
    name: "Andere vervoerder",
    // Geen link verzinnen. Wie hier staat plakt de lijn van zijn vervoerder.
    url: () => null,
  },
];

export function isCarrierId(value: unknown): value is CarrierId {
  return (
    typeof value === "string" &&
    CARRIERS.some((carrier) => carrier.id === value)
  );
}

export function carrierName(id: string | null): string | null {
  return CARRIERS.find((carrier) => carrier.id === id)?.name ?? null;
}

/**
 * De naam zoals de klant hem in zijn mail leest, of `null`.
 *
 * "Andere vervoerder" is een keuze in het beheerpaneel en geen vervoerder;
 * die regel in de mail zou de klant niets vertellen. In het paneel zelf staat
 * hij wél, want daar is het de knop die de beheerder aanklikte.
 */
export function customerCarrierName(id: string | null): string | null {
  return id === "anders" ? null : carrierName(id);
}

/** Postcode zoals een vervoerder hem wil: hoofdletters, geen spatie */
export function trackingPostcode(postcode: string): string {
  return postcode.replace(/\s+/g, "").toUpperCase();
}

/**
 * Wat er in de database gaat: óf een hele link, óf een kale code.
 *
 * De lengtegrens is die van de kolom (255). Afkappen doet de database
 * stilletjes — zie `0012_tracking.sql` — dus hier weigeren met een melding,
 * net als bij een te diep kortingspercentage of een bedrag buiten bereik
 * (@docs/DECISIONS.md #14, #20).
 */
export const TRACKING_MAX = 255;

/** Een barcode is cijfers, letters en soms een streepje. Nooit een spatie. */
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{3,63}$/;

export type TrackingInput =
  | { kind: "url"; value: string }
  | { kind: "code"; value: string };

/**
 * Keurt wat de beheerder intypte en zegt wat het is.
 *
 * Geeft een foutmelding terug in plaats van iets te repareren: een code
 * waarvan wij de helft weggooien levert een klant op die een 404 krijgt van
 * zijn vervoerder, en dat merkt niemand hier.
 */
export function parseTracking(
  raw: string,
): { ok: TrackingInput } | { error: string } {
  const value = raw.trim();
  if (!value) return { error: "Vul een track & trace-link of -code in." };
  if (value.length > TRACKING_MAX) {
    return {
      error: `Dit is ${value.length} tekens; er passen er ${TRACKING_MAX} in. Kort de link in of gebruik alleen de code.`,
    };
  }

  if (/^[a-z]+:/i.test(value)) {
    // Iets met een schema ervoor is bedoeld als link. Alleen http en https
    // gaan door: een `javascript:`- of `data:`-lijn in een mail naar een klant
    // is een aanval, niet een vergissing.
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return { error: "Dit lijkt een link maar is er geen. Controleer hem." };
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { error: "Alleen een http- of https-link kan mee in de mail." };
    }
    if (!url.hostname.includes(".")) {
      return { error: "Die link heeft geen geldig webadres." };
    }
    return { ok: { kind: "url", value: url.toString() } };
  }

  // Vervoerders drukken een barcode met spaties af ("3SDFC 1234 567890") en
  // zo typt de beheerder hem ook over. Die spaties zitten niet in de code;
  // ze eruit halen is geen reparatie van een vergissing maar van opmaak.
  const compact = value.replace(/\s+/g, "");
  if (!CODE_PATTERN.test(compact)) {
    return {
      error:
        "Dat is geen geldige code. Een barcode bestaat uit letters en cijfers; plak anders de hele link van de vervoerder.",
    };
  }
  return { ok: { kind: "code", value: compact.toUpperCase() } };
}

/**
 * De link die de klant in zijn mail krijgt, of `null` als er geen te maken is.
 *
 * Staat er een hele link in de database, dan is dát de link — ook als de
 * vervoerder iets anders zegt. Wat de beheerder plakte komt rechtstreeks van
 * de vervoerder en weet meer dan ons sjabloon.
 */
export function trackingUrl(options: {
  code: string;
  carrier: string | null;
  address: TrackingAddress;
}): string | null {
  const parsed = parseTracking(options.code);
  if ("error" in parsed) return null;
  if (parsed.ok.kind === "url") return parsed.ok.value;

  const carrier = CARRIERS.find((entry) => entry.id === options.carrier);
  if (!carrier) return null;
  return carrier.url(encodeURIComponent(parsed.ok.value), {
    postcode: trackingPostcode(options.address.postcode),
    country: options.address.country.toUpperCase() || "NL",
  });
}

/**
 * Wat de klant als code te lezen krijgt.
 *
 * Bij een geplakte link is dat niets: een URL van tachtig tekens in beeld is
 * geen informatie, daar staat de knop voor.
 */
export function trackingLabel(code: string): string | null {
  const parsed = parseTracking(code);
  if ("error" in parsed) return null;
  return parsed.ok.kind === "code" ? parsed.ok.value : null;
}
