// Consumentenprijs uit de B2B-prijzen van Tyre24.
//
// **De twee bedragen van Alzura staan NIET op dezelfde basis.** Vastgesteld
// 2026-09-19 op een schermafdruk van het platform zelf, voor de GOODYEAR UG9+
// 195/65 R15 95T XL:
//
//   Marktplaatsprijs per stuk           € 20,39   ← dit is `ek`
//   "Uw netto EC"                       € 23,38   (inkoop plus vracht)
//   "Je marge is € 11,62 NETTO per stuk"
//   Berekende verkoopprijs, 2 st.       € 76,00 → € 38,00 per stuk
//   Berekende verkoopprijs, 4 st.      € 152,00 → € 38,00 per stuk
//   Onderschrift:                       "Prijs INCL. BTW"
//
// Die € 38,00 is precies wat de API als `evp_3` teruggeeft — onze shop rekende
// er € 45,98 van (38,00 × 1,21), terwijl het platform datzelfde bedrag incl.
// btw noemt. Dat de inkoopprijs klopt is met dezelfde afdruk vast te stellen:
// € 20,39 is exact wat er met 10% opslag uit de shop kwam (27,14 ÷ 1,21 ÷ 1,10).
//
//   `ek`  (inkoopprijs)   → EXCLUSIEF btw, wij tellen er 21% bij
//   `evp` (adviesprijs)   → INCLUSIEF btw, wij tellen er NIETS bij
//
// Dat is ook de gangbare conventie: een inkoopprijs tussen bedrijven is netto,
// een *adviesverkoopprijs* is bedoeld voor de consument en die is in Nederland
// altijd inclusief btw. Zie docs/api/TYRE24.md.
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
// LET OP: die percentages zetten een bruto adviesprijs naast een netto
// inkoopprijs en vallen dus te hoog uit. Netto tegen netto is het ruim een
// vijfde minder — voor banden zo'n +37% in plaats van +66%.
const MIN_MARGIN_PERCENT = 25;

/**
 * Marge die we minimaal op de inkoopprijs willen **als er geen adviesprijs
 * is**; te overrulen via .env.
 *
 * Dit is een noodgreep en geen strategie. Élk gemeten artikel had een
 * adviesprijs, dus in de praktijk komt deze grens alleen in beeld als de
 * leverancier er ooit een vergeet — en dan is inkoop + 25% een verdedigbaarder
 * gok dan de inkoopprijs zelf.
 *
 * Hij geldt niet bovenop een eigen opslag en ook niet bovenop de adviesprijs:
 * in beide gevallen zou hij overrulen wat er bewust is neergezet. Wat er
 * altijd wél geldt is dat we nooit onder de inkoopprijs verkopen.
 */
function minMarginPercent(): number {
  const raw = Number(process.env.CARO_MIN_MARGIN_PERCENT);
  return Number.isFinite(raw) && raw >= 0 ? raw : MIN_MARGIN_PERCENT;
}

/** Of de adviesverkoopprijs van de leverancier gevolgd wordt (default: ja) */
function followsRecommendedPrice(): boolean {
  return process.env.CARO_USE_RECOMMENDED_PRICE !== "false";
}

/** Bedrag exclusief btw → inclusief btw, afgerond op hele centen */
function addVat(netCents: number): number {
  return Math.round((netCents * (100 + VAT_PERCENT)) / 100);
}

/** Btw-deel van een bedrag dat al inclusief btw is */
export function vatPortionCents(grossCents: number): number {
  return grossCents - Math.round((grossCents * 100) / (100 + VAT_PERCENT));
}

export interface PriceInput {
  /** Inkoopprijs van de leverancier, **exclusief** btw */
  purchaseCents: number;
  /** Adviesverkoopprijs van de leverancier, **inclusief** btw */
  recommendedCents?: number | null;
  /**
   * Opslag op de inkoopprijs in procenten, ingesteld door de beheerder.
   * `undefined` betekent: geen regel voor dit artikel, dus de adviesprijs van
   * de leverancier tonen zoals voorheen.
   */
  markupPercent?: number;
}

/** Opslag toepassen op de inkoopprijs, netto (zonder btw) */
function markedUpNet(purchaseCents: number, markupPercent: number): number {
  return Math.round((purchaseCents * (100 + markupPercent)) / 100);
}

/**
 * De consumentenprijs inclusief btw, vóór een eventuele actie.
 *
 * **Alles hier rekent in bruto centen.** Dat moet wel, want de adviesprijs
 * komt al bruto binnen; die eerst naar netto omrekenen en er daarna weer btw
 * bij optellen kost een cent aan afronding, en dan staat er € 37,99 waar de
 * leverancier € 38,00 zegt. De btw wordt er bij het factureren weer uit
 * gehaald met `vatPortionCents()`, en dat is exact.
 *
 * Drie wegen, en welke het wordt hangt er alleen van af wat er ís:
 *
 * 1. **Met een prijsregel** — inkoop + het percentage van de beheerder, en
 *    daar 21% btw overheen. De ondergrens van 25% speelt hier bewust géén rol:
 *    die zou een opslag van 10% naar 25% tillen.
 * 2. **Zonder prijsregel** — de adviesprijs van de leverancier zoals hij
 *    binnenkomt. Geen btw erbij, geen ondergrens eroverheen.
 * 3. **Zonder allebei** — inkoop + de ondergrens + btw.
 *
 * Eén grens geldt in alle drie de gevallen: **nooit onder de inkoopprijs**.
 */
function grossPriceCents({
  purchaseCents,
  recommendedCents,
  markupPercent,
}: PriceInput): number {
  const purchaseGross = addVat(purchaseCents);

  if (markupPercent !== undefined && Number.isFinite(markupPercent)) {
    // Nooit onder de inkoopprijs, ook niet als er 0 (of onzin) is ingevuld
    const marked = addVat(
      markedUpNet(purchaseCents, Math.max(markupPercent, 0)),
    );
    return Math.max(marked, purchaseGross);
  }
  if (followsRecommendedPrice() && recommendedCents) {
    return Math.max(recommendedCents, purchaseGross);
  }
  return addVat(markedUpNet(purchaseCents, minMarginPercent()));
}

/**
 * De harde bodem waar een korting nooit doorheen mag, inclusief btw.
 *
 * Met een eigen opslag is dat de **inkoopprijs**: de beheerder bepaalt zijn
 * marge, en een korting mag die opeten maar niet meer dan dat. Zonder opslag
 * blijft het de ondergrens van 25% — maar nooit hoger dan de prijs zelf, want
 * de adviesprijs kan eronder liggen en dan zou elke korting stil wegvallen.
 */
function discountFloorGross({
  purchaseCents,
  markupPercent,
}: PriceInput): number {
  return markupPercent !== undefined && Number.isFinite(markupPercent)
    ? addVat(purchaseCents)
    : addVat(markedUpNet(purchaseCents, minMarginPercent()));
}

/**
 * Inkoopprijs (excl. btw) en adviesprijs (incl. btw), beide in centen →
 * consumentenprijs in centen inclusief btw. Integer-rekenwerk, nooit floats
 * voor geld.
 */
export function consumerPriceCents(input: PriceInput): number {
  return grossPriceCents(input);
}

/**
 * Consumentenprijs mét een lopende actie erop.
 *
 * **De ondergrens gaat vóór het percentage.** Zet de beheerder 40% op een
 * artikel waar de marge dat niet draagt, dan verkoopt hij met verlies. Dat
 * mag nooit gebeuren, ook niet als de leverancier zijn inkoopprijs verhoogt
 * nadat de actie is aangemaakt. Daarom wordt de korting hier berekend, waar de
 * inkoopprijs nog in beeld is — buiten de adapter is die weg (`Part` draagt
 * hem niet).
 *
 * Wat er terugkomt is wat er werkelijk toegepast is. Ligt dat lager dan
 * gevraagd, dan is de ondergrens geraakt en hoort het beheerpaneel dat te
 * laten zien in plaats van te doen alsof het gelukt is.
 */
export function discountedPriceCents({
  purchaseCents,
  recommendedCents,
  markupPercent,
  percent,
}: PriceInput & {
  /** 0 tot 100; buiten bereik telt als geen korting */
  percent: number;
}): { priceCents: number; discountPercent: number } {
  const input: PriceInput = { purchaseCents, recommendedCents, markupPercent };
  const listCents = grossPriceCents(input);

  if (!Number.isFinite(percent) || percent <= 0 || percent >= 100) {
    return { priceCents: listCents, discountPercent: 0 };
  }

  // Het percentage gaat over het bedrag dat de klant ziet. "20% korting" moet
  // 20% van de getoonde prijs zijn, niet van een nettobedrag dat nergens op de
  // site staat.
  const floorCents = Math.min(discountFloorGross(input), listCents);
  const wantedCents = Math.round((listCents * (100 - percent)) / 100);
  const priceCents = Math.max(wantedCents, floorCents);

  if (priceCents >= listCents) {
    // De ondergrens at de hele korting op; dan is er niets te tonen
    return { priceCents: listCents, discountPercent: 0 };
  }

  // Bewust géén "van"-prijs hier: die mag niet de prijs van vandaag zijn maar
  // de laagste van dertig dagen, en die staat in onze eigen prijsgeschiedenis
  // (lib/prices/history.ts). Dit bestand kent alleen inkoop, advies en opslag.
  return {
    priceCents,
    // Afgerond naar beneden: liever "19%" tonen bij een korting van 19,6% dan
    // een percentage beloven dat de klant niet terugziet in het bedrag.
    discountPercent: Math.floor(((listCents - priceCents) * 100) / listCents),
  };
}
