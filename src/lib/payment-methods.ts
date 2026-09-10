/**
 * Betaalmethodes die de winkel accepteert.
 *
 * GEMETEN 2026-09-10 met `pnpm mollie:check` op het echte account: dit is wat
 * `GET /methods` teruggaf. Zet je in het Mollie-dashboard een methode aan of
 * uit, werk dan deze lijst bij — `pnpm mollie:check` toont de actuele stand.
 *
 * Waarom een vaste lijst en niet elke keer de API bevragen: de footer staat op
 * élke pagina, en dit verandert hooguit een paar keer per jaar. Een call per
 * paginaweergave zou de limiet van de betaaldienst opeten voor een rijtje dat
 * bijna nooit verandert.
 *
 * Bewust geen logo's: dat zijn merkbeelden van derden met eigen
 * gebruiksvoorwaarden. De namen zeggen hetzelfde en kosten geen licentie.
 * Wil je ze wél, dan levert Mollie officiële SVG's mee bij `GET /methods`.
 */
export const PAYMENT_METHODS = [
  "iDEAL",
  "Wero",
  "Creditcard",
  "Klarna",
  "Riverty",
  "Betaal via je bank",
] as const;
