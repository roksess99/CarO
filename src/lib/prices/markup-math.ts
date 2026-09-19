/**
 * Het rekenwerk rond de prijsopslag, zónder database eromheen.
 *
 * Apart van `markup.ts` om precies één reden, en die is al eens duur geweest:
 * het formulier in het beheerpaneel is een client component, en `markup.ts`
 * importeert `lib/db/client.ts`. Eén import trok daarmee de MySQL-driver de
 * browserbundel in en de hele pagina viel om met "Can't resolve 'net'".
 * Hetzelfde gebeurde eerder met `discounts/codes.ts` → `code-base.ts`.
 *
 * Alles hier is pure rekenkunde op getallen. Komt er iets bij dat de database
 * nodig heeft, dan hoort het in `markup.ts`.
 */

/**
 * Hoeveel korting er maximaal op een artikel met deze opslag past.
 *
 * Bij 10% opslag is de verkoopprijs inkoop × 1,10; een korting mag die nooit
 * onder de inkoopprijs brengen. 1 − 1/1,10 = 9,09%, dus negen procent past
 * nog net. Naar beneden afgerond, want het paneel moet een getal noemen dat
 * gegarandeerd werkt.
 */
export function maxDiscountPercent(markupPercent: number): number {
  if (!Number.isFinite(markupPercent) || markupPercent <= 0) return 0;
  return Math.floor((markupPercent / (100 + markupPercent)) * 100);
}
