/**
 * Betaalmethodes die de winkel accepteert.
 *
 * Waarom een vaste lijst en niet elke keer de API bevragen: de footer staat op
 * élke pagina, en dit verandert hooguit een paar keer per jaar. Een call per
 * paginaweergave zou de limiet van de betaaldienst opeten voor een rijtje dat
 * bijna nooit verandert.
 *
 * De footer toont dit niet als tekst maar als het officiële merkbeeld van
 * iDEAL/Wero — zie `public/betaalmethodes/LEESMIJ.md`. Deze lijst levert de
 * namen voor het vertrouwensblok bij de bestelknop
 * (`components/trust-badges.tsx`).
 *
 * **NIET GEMETEN — stand 2026-10-09.** Hier stond de uitkomst van
 * `pnpm mollie:check` op het live Mollie-account. Mollie is weg
 * (@docs/DECISIONS.md #30) en het Stripe-account wordt nog geverifieerd, dus
 * dit is op dit moment een **voornemen en geen meting**: het is wat er in het
 * Stripe-dashboard aangezet moet worden, niet wat de klant aantoonbaar kan
 * kiezen.
 *
 * Dat onderscheid is eerder misgegaan. Klarna stond hier maandenlang in omdat
 * een meting op de testsleutel hem meegaf, terwijl hij op het live account
 * niet aanstond — een belofte die de klant op het betaalscherm niet kon
 * waarmaken.
 *
 * GEMETEN 2026-10-09 met de testsleutel gaf `pnpm stripe:check --create`:
 * `card, bancontact, eps, klarna, link, mb_way, amazon_pay, satispay`.
 * **iDEAL zat daar niet bij** — die moet in het Stripe-dashboard aangezet
 * worden (Settings → Payment methods). Die meting is daarom géén reden om deze
 * lijst te wijzigen: hij beschrijft wat er per ongeluk aanstaat, niet wat de
 * winkel aanbiedt. Meet opnieuw zodra iDEAL aanstaat en de verificatie rond is.
 *
 * Wero valt op: Mollie leverde dat samen met iDEAL als één methode, en of Stripe
 * het apart aanbiedt is nog niet vastgesteld — daarom staat hij hieronder niet.
 */
export const PAYMENT_METHODS = [
  "iDEAL",
  "Creditcard",
  "Apple Pay",
  "Google Pay",
] as const;
