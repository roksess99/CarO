# Betaalmethode-logo's

Beeldmateriaal van derden voor het blok "Betaalmethoden" in de footer
(`src/components/site-footer.tsx`).

| Bestand | Wat |
|---|---|
| `ideal-wero.svg` | iDEAL | Wero-lockup, geel, horizontaal |

Het beeld staat **zonder tegel of rand** in de footer: het draagt zijn eigen
gele achtergrond, en een witte kaart erachter maakte er een sticker in een
lijstje van. iDEAL en Wero leveren maar één versie — geel, en dat is verplicht.

## Het Mollie-blok is weg — 2026-10-09

Hier stonden ook `mollie-nl.svg` en `mollie-en.svg`: de pil met "Veilige
betalingen mogelijk gemaakt door mollie" en de kaartlogo's. Die bestanden zijn
verwijderd toen Mollie uit de winkel ging (@docs/DECISIONS.md #30).

**Het logo van een betaaldienst die je niet gebruikt mag niet in je footer
staan.** Niet omdat het lelijk is, maar omdat het een onwaarheid is tegenover
de klant: het blok zei dat Mollie de betaling afhandelt, en dat is niet meer zo.

Wat daar nu niet staat en er wel zou kunnen komen: de **"Powered by
Stripe"-badge**. Die is er pas als het officiële bestand uit Stripe's merkkit in
deze map staat. Zelf natekenen of uit een screenshot halen mag van geen enkele
merkkit — en van deze ook niet.

## Welke beelden er horen te staan

De methodes die de winkel noemt staan in `src/lib/payment-methods.ts`. Dat is op
dit moment een **voornemen en geen meting**: het Stripe-account wordt nog
geverifieerd.

Zodra dat rond is, meet je het zo:

```bash
pnpm stripe:check --create
```

Dat drukt `payment_method_types` van een echte Checkout-sessie af. Dát is wat de
klant werkelijk kan kiezen, en daar hoort het beeld bij te kloppen.

**Meet altijd met de sleutel die de winkel werkelijk gebruikt.** Bij Mollie
ging dat een keer mis: de meting van 2026-09-10 noemde Riverty, maar die liep op
de testsleutel en op het live account stond Riverty niet aan. Test en live zijn
bij elke betaaldienst gescheiden werelden.

## Regels bij het vervangen

- **Onbewerkt gebruiken.** Merkkits verbieden herkleuren, uitrekken en
  losknippen van onderdelen. Een eigen samenstelling van losse kaartlogo's mag
  dus niet. Staat een beeld slecht op de achtergrond, pak dan een andere
  uitvoering uit de kit — kleur nooit zelf om.
- **Verandert het aanbod?** Meet opnieuw, werk `src/lib/payment-methods.ts` bij
  en controleer of het beeld nog klopt. Komt er een methode bij die de klant
  hier niet ziet staan, haal dan de bijbehorende variant uit de kit.
- **Beloof niets wat er niet is.** Een kaartmerk of een methode in beeld die de
  klant op het betaalscherm niet kan kiezen, is een loze belofte.
