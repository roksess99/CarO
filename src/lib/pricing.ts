// Consumentenprijs uit de B2B-prijzen van Tyre24.
//
// BEVESTIGD door de klant: de API-bedragen zijn EXCLUSIEF btw. Wij rekenen
// er 21% bij, want Nederlandse consumentenprijzen moeten inclusief btw zijn.
const VAT_PERCENT = 21;

// GEMETEN 2026-08-07 over 100 artikelen per familie: de adviesverkoopprijs
// (`evp`) ligt structureel boven de inkoopprijs (`ek`), en élk artikel heeft
// er een.
//
//   Banden                  +66% (p25 64% – p75 69%)
//   Velgen                  +71% (p25 69% – p75 77%)
//   Gebruikte onderdelen    +85% (p25 81% – p75 86%)
//   Toebehoren             +395% — kleine artikelen, inkoop ~€1
//
// Daarom volgen we de adviesprijs in plaats van er een eigen opslag bovenop
// te doen: die prijs is marktconform én levert al 66–85% brutomarge. Een
// eigen marge erbovenop zou ons boven de markt prijzen.
//
// De ondergrens hieronder is een vangnet: mocht een adviesprijs ontbreken of
// te dicht op de inkoop liggen, dan verkopen we nooit onder deze marge.
const MIN_MARGIN_PERCENT = 25;

/** Marge die we minimaal op de inkoopprijs willen; te overrulen via .env */
function minMarginPercent(): number {
  const raw = Number(process.env.CARO_MIN_MARGIN_PERCENT);
  return Number.isFinite(raw) && raw >= 0 ? raw : MIN_MARGIN_PERCENT;
}

/** Of de adviesverkoopprijs van de leverancier gevolgd wordt (default: ja) */
function followsRecommendedPrice(): boolean {
  return process.env.CARO_USE_RECOMMENDED_PRICE !== "false";
}

/** Bedrag in centen + 21% btw, afgerond op hele centen */
function addVat(cents: number): number {
  return Math.round((cents * (100 + VAT_PERCENT)) / 100);
}

/** Btw-deel van een bedrag dat al inclusief btw is */
export function vatPortionCents(grossCents: number): number {
  return grossCents - Math.round((grossCents * 100) / (100 + VAT_PERCENT));
}

/**
 * Inkoop- en adviesprijs (beide excl. btw, in centen) → consumentenprijs in
 * centen inclusief btw. Integer-rekenwerk, nooit floats voor geld.
 */
export function consumerPriceCents({
  purchaseCents,
  recommendedCents,
}: {
  purchaseCents: number;
  recommendedCents?: number | null;
}): number {
  const floorCents = Math.round(
    (purchaseCents * (100 + minMarginPercent())) / 100,
  );
  const netCents =
    followsRecommendedPrice() && recommendedCents
      ? // Adviesprijs volgen, maar nooit onder onze ondergrens
        Math.max(recommendedCents, floorCents)
      : floorCents;
  return addVat(netCents);
}
