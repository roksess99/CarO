# Betaalmethode-logo's

Beeldmateriaal van derden voor het blok "Betaalmethoden" in de footer
(`src/components/site-footer.tsx`).

| Bestand | Wat |
|---|---|
| `ideal-wero.svg` | iDEAL | Wero-lockup, geel, horizontaal |
| `mollie-nl.svg` | "Veilige betalingen mogelijk gemaakt door mollie" + Mastercard, Visa, Amex, "+ meer" |
| `mollie-en.svg` | Idem, Engels |

Beide beelden staan **zonder tegel of rand** in de footer: ze dragen hun eigen
achtergrond, en een witte kaart erachter maakte er een sticker in een lijstje
van.

## Eén uitvoering voor beide thema's

Mollie levert het blok in een witte en een zwarte pil. Wij gebruiken overal de
**witte**, en dat pakt in allebei de thema's goed uit:

| Thema | Hoe het staat |
|---|---|
| Licht | De pil lost op in de witte pagina; alleen het slotje, de tekst en de kaartlogo's blijven zichtbaar |
| Donker | Een strak wit vlak op het merk-antraciet |

De zwarte pil is er daarom niet meer. Die zat in donkere modus net náást de
achtergrondkleur (`#0F0B08` tegen `#0E1013`) en gaf een vaag warm
rechthoekje — en omkleuren mag niet van de merkkit.

Dat scheelt meteen een halve download: een tweede afbeelding achter
`dark:hidden` wordt door de browser evengoed opgehaald, en deze badges zijn
35–45 kB per stuk.

iDEAL en Wero leveren sowieso maar één versie: geel, en dat is verplicht.

## Waarom precies deze beelden

`pnpm mollie:check` gaf op de **live** sleutel (2026-09-12):

> iDEAL | Wero, Card, Pay with Klarna, Pay By Bank

De lockup dekt de eerste methode één op één — Mollie levert iDEAL en Wero als
één methode, en dat is precies wat de lockup toont. Het Mollie-blok dekt `Card`
en vangt Klarna en Pay By Bank op met "+ meer". Zo staat er geen methode in
beeld die de klant niet kan kiezen.

De meting van 2026-09-10 noemde ook Riverty, maar die liep op de testsleutel.
Test en live hebben bij Mollie elk hun eigen methodes; op het echte account
staat Riverty niet aan. **Meet dit dus altijd met de sleutel die de winkel
werkelijk gebruikt.**

De varianten met PayPal uit dezelfde kit zijn daarom **niet** overgenomen:
PayPal staat niet op het account en zou een keuze beloven die er niet is.

## Regels bij het vervangen

- **Onbewerkt gebruiken.** Beide merkkits verbieden herkleuren, uitrekken en
  losknippen van onderdelen. Een eigen samenstelling van losse kaartlogo's mag
  dus niet; dit blok wél, want zo levert Mollie het aan. Staat een beeld slecht
  op de achtergrond, pak dan de andere uitvoering uit de kit — kleur nooit
  zelf om, en knip de pil er ook niet af.
- **Verandert het aanbod?** Draai `pnpm mollie:check`, werk
  `src/lib/payment-methods.ts` bij en controleer of dit beeld nog klopt.
  Komt er een methode bij die de klant hier niet ziet staan, haal dan de
  bijbehorende variant uit de Mollie-kit.
- **Amex is niet apart gemeten.** `GET /methods` geeft alleen `Card` terug,
  zonder kaartmerken. Het blok toont Mastercard, Visa én American Express;
  controleer in het Mollie-dashboard of dat laatste echt aanstaat. Zo niet,
  dan heeft de kit een uitvoering zonder.
