# Wat de shop opslaat

Onderbouwing bij `/nl/privacy` (`src/app/[locale]/privacy/page.tsx`). De
tabellen op die pagina zijn voor de bezoeker; dit bestand zegt hoe ze
gecontroleerd zijn, zodat niemand ze uit het hoofd hoeft bij te werken.

Het gaat om twee verschillende vragen, en die worden makkelijk door elkaar
gehaald:

1. **Wat komt er op het apparaat van de bezoeker?** Dat bepaalt of er een
   toestemmingsbanner moet komen (Telecommunicatiewet art. 11.7a).
2. **Wat bewaren wij op onze eigen server?** Dat bepaalt wat er in de
   privacyverklaring moet staan (AVG): welke gegevens, waarvoor, hoe lang.

## Op het apparaat van de bezoeker

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

## Op onze eigen server

Vastgesteld 2026-09-17 door `db/migrations/` langs te lopen op kolommen die
een persoon aanwijzen. De verhuizing van JSON-bestanden naar MySQL
(@docs/DECISIONS.md #13) veranderde juridisch niets — dezelfde gegevens,
hetzelfde doel — maar er kwam één ding bij dat er eerder niet was.

| Tabel | Persoonsgegeven | Grondslag | Bewaartermijn |
|---|---|---|---|
| `orders` | `email`, `first_name`, `last_name`, `phone`, `street`, `city`, postcode, huisnummer | Uitvoering van de overeenkomst (art. 6 lid 1 sub b AVG) | 7 jaar — een bestelling is ook een boekstuk |
| `order_lines` | wat er besteld is | idem | 7 jaar |
| `invoices` | bedragen, btw, koppeling aan de bestelling | Wettelijke plicht (art. 6 lid 1 sub c) | 7 jaar, fiscale bewaarplicht |
| `discount_code_uses` | **`email_key`: het mailadres in kleine letters, niet gehasht** | Gerechtvaardigd belang: "één keer per klant" is niet af te dwingen zonder het adres | Zolang de code bestaat, daarna hoogstens een jaar |
| `reviews` | de naam die de klant zelf koos, zijn tekst, en **`email_key`: het mailadres waar de uitnodiging heen ging** | Gerechtvaardigd belang: beoordelingen tonen, en weten wie om verwijdering vraagt | Zolang de beoordeling op de site staat |
| `review_products` | welk artikel welk cijfer kreeg | idem | idem |
| `admins`, `admin_sessions`, `admin_invites`, `audit_log` | mailadres van de beheerder | Noodzakelijk voor de toegangsbeveiliging | Zolang het account bestaat |

`price_history` en `job_runs` bevatten geen persoonsgegevens: artikel-ids,
datums en bedragen.

**`discount_code_uses.email_key` is het nieuwe stuk.** Het staat daar los van
de bestelling, dus het blijft ook staan als een bestelling ooit verwijderd
wordt — en dat is precies de bedoeling, anders is de code opnieuw te
gebruiken. Daarom staat het als eigen regel in de tabel op de pagina.

**`reviews` draagt sinds 2026-09-19 ook een mailadres.** Om twee redenen die
allebei nodig zijn: de uitnodiging mag maar één keer verstuurd worden, en als
iemand vraagt zijn beoordeling te verwijderen moeten we weten welke van hem
is. Anders dan bij een kortingscode verdwijnt deze rij wél met de bestelling
(`ON DELETE CASCADE`): een beoordeling zónder de bestelling erachter kan niet
meer als geverifieerde aankoop gelden, en dan hoort hij ook niet meer op de
site te staan.

**Geen mailinglijst.** Er is geen tabel met adressen voor marketing en die
komt er ook niet zonder dat #15 opnieuw bekeken wordt: verzamelen voor een
doel dat je nog niet hebt mag niet. De pagina zegt dat expliciet
(`privacy.noMarketing`), zodat het een belofte is en geen omissie.

**De beoordelingsmail is geen reclame.** Het is één bericht over een
bestelling die de klant net heeft ontvangen, dus het valt onder de
klantrelatie — geen toestemming vooraf nodig. Wat er wél bij hoort en er ook
in staat: er gaat er precies één per bestelling uit, en wie hem niet wil mailt
terug. Een uitschrijflink zou hier misleidend zijn, want er is geen lijst om
je voor uit te schrijven.

## Geen toestemmingsbanner nodig, ook nu de database er is

Dit is 2026-09-17 nagelopen omdat de vraag terecht opkwam: als we mailadressen
in een database bewaren, hebben we dan een cookiebanner nodig?

**Nee.** De toestemmingsplicht van art. 11.7a Tw gaat uitsluitend over het
plaatsen van of toegang krijgen tot gegevens **op de randapparatuur van de
gebruiker** — cookies, localStorage, sessionStorage, fingerprinting. Wat een
server in zijn eigen database zet valt er niet onder; dat is een AVG-vraag, en
het antwoord daarop is de tabel hierboven plus de privacyverklaring.

De lijst met browseropslag is sinds 2026-09-12 niet veranderd: nog steeds
dezelfde vijf, en alle vijf zijn óf noodzakelijk om de winkel te laten werken
(winkelwagen, bezorggegevens) óf het gevolg van een keuze die de bezoeker zelf
maakt (taal, thema, zijn auto). Daarvoor geldt de uitzondering in artikel
11.7a lid 3 Telecommunicatiewet. Dezelfde waarschuwing staat boven
`STORAGE_ITEMS` in de pagina zelf.

**De banner komt er alsnog** zodra er iets bijkomt dat geen van beide is:
analytics, een advertentiepixel, een ingesloten YouTube-speler, een chatwidget
van een derde. Dan is een banner **mét voorafgaande blokkering** verplicht —
weigeren moet net zo makkelijk zijn als accepteren, en er mag niets laden
voordat er geklikt is.

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

Verandert er iets aan de **browseropslag**, dan moeten drie plekken mee:

1. `STORAGE_ITEMS` in `src/app/[locale]/privacy/page.tsx`
2. `privacy.items.<sleutel>` in `messages/nl.json` én `messages/en.json`
3. dit bestand

Komt er een **kolom of tabel met persoonsgegevens** bij in `db/migrations/`,
dan net zo:

1. `SERVER_ITEMS` in diezelfde pagina
2. `privacy.server.<sleutel>` in beide messagebestanden
3. de tabel "Op onze eigen server" hierboven

En werk `privacy.lastUpdated` bij — in beide talen. Een verklaring met een
oude datum eronder is erger dan geen datum.

Komt er een partij bij die gegevens van ons ontvangt, dan hoort die ook in de
lijst "Partijen die gegevens van ons ontvangen" op de pagina. Mollie stond daar
een maand lang niet in omdat de verklaring van vóór de betaalkoppeling dateerde;
dat is 2026-09-12 rechtgezet.
