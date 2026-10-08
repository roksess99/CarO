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
 * **De footer toont deze lijst niet meer als tekst**, maar als de officiële
 * merkbeelden van iDEAL/Wero en Mollie — zie `public/betaalmethodes/LEESMIJ.md`
 * voor welk beeld welke methode dekt en waarom juist die. Deze lijst blijft
 * de gemeten waarheid waar dat beeld aan getoetst wordt, en levert de naam
 * voor het vertrouwensblok bij de bestelknop (`components/trust-badges.tsx`).
 *
 * GEMETEN 2026-09-12 op de **live** sleutel gaf `GET /methods` letterlijk:
 * `iDEAL | Wero, Card, Pay with Klarna, Pay By Bank`. iDEAL en Wero zijn bij
 * Mollie dus **één** methode; hieronder staan ze los omdat de klant ze als
 * twee keuzes kent.
 *
 * **Riverty stond hier tot 2026-09-12 wél in.** Die kwam uit de meting van
 * 2026-09-10, en die liep nog op de testsleutel. Test en live zijn bij Mollie
 * gescheiden werelden met elk hun eigen methodes: op het echte account staat
 * Riverty niet aan. Een methode noemen die de klant op het betaalscherm niet
 * kan kiezen is een loze belofte, dus hij is eruit. Meet dit opnieuw met de
 * live sleutel zodra je in het dashboard iets aan- of uitzet.
 */
export const PAYMENT_METHODS = [
  "iDEAL",
  "Wero",
  "Creditcard",
  "Klarna",
  "Betaal via je bank",
] as const;
