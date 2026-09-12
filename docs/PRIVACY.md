# Wat de shop opslaat in de browser

Onderbouwing bij `/nl/privacy` (`src/app/[locale]/privacy/page.tsx`). De tabel
op die pagina is voor de bezoeker; dit bestand zegt hoe hij gecontroleerd is,
zodat niemand hem uit het hoofd hoeft bij te werken.

## De volledige lijst

Vastgesteld 2026-09-12 door de code af te zoeken op élke schrijver
(`localStorage`, `sessionStorage`, `document.cookie`) — een statische controle
dekt meer dan rondklikken, want een sleutel die alleen bij afrekenen ontstaat
mis je met bladeren.

| Sleutel | Soort | Geschreven door |
|---|---|---|
| `NEXT_LOCALE` | cookie | next-intl bij het wisselen van taal (`localeCookie`, `sameSite: lax`) |
| `caro-cart` | localStorage | `src/lib/cart/storage.ts` |
| `caro-checkout` | localStorage | `src/lib/checkout/storage.ts` |
| `caro-vehicle` | localStorage | `src/components/vehicle/use-vehicle.ts` |
| `theme` | localStorage | `src/components/theme-toggle.tsx` (en het init-script in de layout) |

`sessionStorage` wordt nergens gebruikt, en de shop schrijft zelf geen enkele
cookie: `NEXT_LOCALE` komt uit next-intl.

## Waarom er geen toestemmingsbanner staat

Alle vijf zijn óf noodzakelijk om de winkel te laten werken (winkelwagen,
bezorggegevens), óf het gevolg van een keuze die de bezoeker zelf maakt (taal,
thema, zijn auto). Daarvoor geldt de uitzondering in artikel 11.7a lid 3
Telecommunicatiewet en is geen toestemming nodig.

**Komt er ooit iets bij dat dat níet is** — analytics, een advertentiepixel, een
ingesloten YouTube-speler — dan is een banner mét voorafgaande blokkering wél
verplicht. Dat staat ook als waarschuwing boven `STORAGE_ITEMS` in de pagina.

## Geen derden in de browser

De site laadt geen lettertypen, scripts of trackers van externe servers.
Nagelopen in het netwerkpaneel: de lettertypen staan onder `_next/static/media/`
(zelf gehost), en productfoto's van de leverancier lopen door de
beeldoptimalisatie van Next (`/_next/image?url=…`) en dus over ons eigen domein.
De browser van de bezoeker praat met niemand anders dan met ons.

Twee uitzonderingen die de bezoeker zelf in gang zet:

- **Mollie** — de klant gaat naar het betaalscherm van Mollie en is dan op hun
  domein. Wat hij daar invult (rekening- of kaartnummer) komt nooit in onze
  winkel; wij sturen alleen het bedrag en ons ordernummer mee.
- **Het adres opzoeken** en **het kenteken opzoeken** gaan via onze server, niet
  vanuit de browser. Zie docs/api/POSTCODE.md en docs/api/OVERHEID-IO.md.

## Bijwerken

Verandert er iets aan de opslag, dan moeten drie plekken mee:

1. `STORAGE_ITEMS` in `src/app/[locale]/privacy/page.tsx`
2. `privacy.items.<sleutel>` in `messages/nl.json` én `messages/en.json`
3. dit bestand

Komt er een partij bij die gegevens van ons ontvangt, dan hoort die ook in de
lijst "Partijen die gegevens van ons ontvangen" op de pagina. Mollie stond daar
een maand lang niet in omdat de verklaring van vóór de betaalkoppeling dateerde;
dat is 2026-09-12 rechtgezet.
