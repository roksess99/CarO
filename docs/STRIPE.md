# Stripe — integratienotities en wat er nog moet

Gebouwd 2026-10-09, nadat Mollie de aanvraag definitief afwees en diezelfde dag
uit de code ging (@docs/DECISIONS.md #30). **Stripe is nu de enige betaaldienst,
en er kan nog niet betaald worden**: de verificatie loopt. Dat meldt de winkel
zelf — rood in het beheerpaneel, en op het afrekenscherm vóórdat de klant zijn
gegevens invult.

| Wat | Waarde |
|---|---|
| Soort koppeling | Stripe Checkout, **gehost** (de klant gaat naar een pagina van Stripe) |
| Aanroepen | rechtstreeks met `fetch`, geen `stripe`-pakket |
| Endpoints | `POST /v1/checkout/sessions`, `GET /v1/checkout/sessions/:id`, `POST /v1/refunds`, `GET /v1/account` |
| Webhook | `POST /api/stripe/webhook`, ondertekend met `STRIPE_WEBHOOK_SECRET` |
| Bedragen | hele centen, net als overal in deze winkel — Stripe rekent zelf ook in centen |

## Wat er nog moet voordat dit aan kan

1. **Stripe moet het account goedkeuren.** `pnpm stripe:check` zegt of dat zo
   is: `Innen ja` betekent `charges_enabled`, en dat is de enige vraag die telt.
2. **Sleutels in `.env`**: `STRIPE_SECRET_KEY` en `STRIPE_WEBHOOK_SECRET`.
   Beide staan in `.env.example` zonder waarde.
3. **Webhook-eindpunt aanmaken** in het Stripe-dashboard, wijzend naar
   `https://caroparts.nl/api/stripe/webhook`, met deze vier gebeurtenissen:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`.
4. **iDEAL aanzetten** in het dashboard. Zonder iDEAL heeft een Nederlandse
   webshop geen kassa; de winkel vraagt er zelf niet om, de methodes komen uit
   de instellingen van het account.
5. **De migratie draaien**: `pnpm db:migrate --write`. `0011` verbreedt
   `orders.payment_id` van 32 naar 255 tekens — zie hieronder.
6. **Opnieuw bouwen en herstarten** zodra de sleutels erin staan. Een
   env-wijziging werkt niet door in een bestaande build.

Er is geen schakelaar om om te zetten: Stripe is de enige dienst. Wat er wél
blijft hangen zijn **oude bestellingen**. Die dragen een Mollie-kenmerk
(`tr_…`) dat bij Stripe niet bestaat:

| Toestand van zo'n bestelling | Wat er gebeurt |
|---|---|
| `paid` en gemeld | niets — `settleOrder` stopt vóór elke aanroep naar buiten |
| `awaiting_payment` | blijft staan; dat zijn afgebroken afrekeningen |
| retour, terugbetalen | **geweigerd met uitleg**: dat kan alleen nog in het Mollie-dashboard |

## De verbreding van `payment_id` is geen detail

`orders.payment_id` stond op `VARCHAR(32)`. Een Mollie-kenmerk (`tr_…`) past
daar ruim in; een Stripe Checkout Session (`cs_test_…`) is ruim zestig tekens en
past er **niet** in. Dat is precies het soort fout dat pas bij de eerste echte
betaling zichtbaar wordt, en dan is het geld al onderweg.

`db/migrations/0011_payment_id_width.sql` verbreedt de kolom. Bestaande waarden
blijven ongemoeid.

## Drie dingen die Checkout Studio voorschreef en hier anders staan

De tekst die Stripe's Checkout Studio genereert is als aanwijzing gevolgd, niet
letterlijk. Drie afwijkingen, met reden:

### 1. Geen `price`-id's maar het totaalbedrag in één regel

Checkout Studio gaat ervan uit dat je producten als `Price`-objecten in het
Stripe-dashboard zet. Dat kan hier niet: de catalogus telt tienduizenden
artikelen van een groothandel, met een eigen opslag per groep, kortingsregels en
een marge-ondergrens — de prijs van vandaag is een berekening, geen vast object.

De sessie draagt daarom **één regel met `price_data` en het bevroren
totaalbedrag** uit het orderdocument, inclusief verzendkosten en een eventuele
kortingscode. Dat is het bedrag waarop de factuur gebaseerd is, en er is maar
één plek die het uitrekent. De artikelen ziet de klant op het besteloverzicht,
in de bevestigingsmail en op de factuur.

### 2. `ui_mode`, `integration_identifier` en `origin_context` gaan niet mee

Die drie staan wel in de gegenereerde tekst. Ze zijn hier weggelaten omdat ze
niet te controleren waren zonder sleutel, en Stripe een onbekende parameter met
een harde fout afwijst — dan werkt de kassa helemaal niet. `ui_mode` heeft
bovendien twee schrijfwijzen (`hosted` en `hosted_page`) die van de API-versie
afhangen, en gehost is sowieso het standaardgedrag.

**Nakijken zodra er een sandbox-sleutel is**: `pnpm stripe:check --create`. Komt
daar een sessie uit, dan klopt de huidige set. Wil je de drie alsnog meesturen,
voeg ze dan één voor één toe en draai dat commando er telkens achteraan.

### 3. Geen apart `/api/create-checkout-session`-eindpunt

De gegenereerde tekst stelt een eindpunt voor dat regels en bedragen aanneemt.
Dat zou hier een gat openzetten: **een bedrag dat naar een betaaldienst gaat
komt nooit uit de browser** (CLAUDE.md). De betaling wordt aangemaakt in de
bestaande Server Action `components/checkout/actions.ts`, die de prijzen eerst
opnieuw uit de catalogus haalt. Die volgorde blijft zoals hij was.

Om dezelfde reden gaat er **geen klantgegeven** mee naar Stripe: geen naam, geen
adres, geen mailadres, geen artikelen. Alleen het ordernummer en het
toegangsteken, net als bij Mollie.

## Parameters zoals ze nu meegaan

In `src/lib/payments/stripe-provider.ts`, functie `createPayment`.

| Parameter | Waarde | Waar vandaan |
|---|---|---|
| `mode` | `payment` | eenmalige betaling, geen abonnement |
| `line_items[0].price_data` | `eur`, totaalbedrag in centen | orderdocument |
| `success_url` / `cancel_url` | de statuspagina met `?ref=` en `&t=` | één URL voor beide uitkomsten |
| `client_reference_id` | ordernummer | terugvinden in het dashboard |
| `metadata` | `reference`, `token` | meer niet |
| `locale` | `nl` of `en` | de taal van de bezoeker |
| `billing_address_collection` | `auto` | Checkout Studio |
| `phone_number_collection.enabled` | `false` | Checkout Studio |
| `automatic_tax.enabled` | `false` | Checkout Studio — wij rekenen zelf 21% |
| `allow_promotion_codes` | `false` | Checkout Studio — de winkel heeft eigen codes |
| `submit_type` | `auto` | Checkout Studio |

`payment_method_collection` gaat niet mee: dat hoort bij abonnementen.

## Hoe het loopt

1. De klant drukt op betalen. De Server Action haalt prijzen en voorraad
   opnieuw op, bevriest het orderdocument en slaat de bestelling op met status
   `awaiting_payment`.
2. `createPayment` maakt een Checkout-sessie en geeft `session.url`. De klant
   gaat daarheen.
3. Stripe meldt de uitkomst op `/api/stripe/webhook`. Dat bericht is
   **ondertekend**; de handtekening wordt gecontroleerd met `timingSafeEqual` en
   berichten ouder dan vijf minuten worden geweigerd.
4. Daarna haalt de winkel de status alsnog **zelf** op bij Stripe. De inhoud van
   een bericht is nooit de bron van waarheid over geld.
5. `lib/orders/settle.ts` doet de rest: bedrag vergelijken, factuurnummer
   uitgeven, mails versturen. Daar is niets aan veranderd.

**De val bij Stripe:** een sessie met `status: "complete"` is níét hetzelfde als
betaald. Bij een methode die na de terugkeer nog verwerkt wordt staat er
`payment_status: "unpaid"`. `toStatus()` kijkt daarom naar allebei.

## Wat er gemeten is — 2026-10-09

| Wat | Uitkomst |
|---|---|
| Testsleutel | werkt |
| `charges_enabled` | **false**, verificatie loopt |
| Sessie aanmaken met die sleutel | **lukt** — testmodus trekt zich niets aan van die vlag |
| Sessiekenmerk | 66 tekens (vandaar migratie `0011`) |
| `payment_method_types` | `card, bancontact, eps, klarna, link, mb_way, amazon_pay, satispay` |

**iDEAL ontbreekt in die lijst.** Zet hem aan onder Settings → Payment methods;
mogelijk kan dat pas als de verificatie rond is. Zonder iDEAL heeft een
Nederlandse webshop geen kassa. `klarna` en `link` staan er juist wél en zijn
nooit gevraagd — die kun je in hetzelfde scherm uitzetten.

Omdat testmodus die vlag negeert, is `ready` in de gezondheidscontrole
`live ? charges_enabled : true`. Op een live sleutel verandert er niets: daar is
`charges_enabled` wél de vraag of er geld binnenkomt.

## Testen

Met een `sk_test_`-sleutel gaat er geen geld heen en weer.

```bash
pnpm stripe:check            # sleutel, charges_enabled, openstaande vragen
pnpm stripe:check --create   # maakt een sessie en toont de betaal-URL
```

Testkaart `4242 4242 4242 4242`, elke toekomstige vervaldatum, elke CVC. iDEAL
in testmodus laat je zelf kiezen of de betaling slaagt of mislukt.

Webhooks lokaal: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
Dat commando drukt een eigen `whsec_` af die in `.env` moet. Zonder webhook
werkt de afhandeling trouwens ook — de statuspagina doet dezelfde controle.

**Let op bij een testbestelling:** zodra een betaling op `paid` komt, krijgt de
bestelling een factuurnummer, en die reeks moet aaneengesloten blijven
(@docs/DECISIONS.md #12). Een testbestelling die tot betaling komt, kost dus een
factuurnummer dat je daarna met de hand moet opruimen.

## Wat dit niet doet

- **Geen Stripe Tax.** De winkel rekent zelf 21% btw en toont prijzen inclusief;
  Stripe Tax zou een tweede partij over hetzelfde bedrag laten beslissen, kost
  een opslag per transactie en lost een probleem op dat deze winkel niet heeft
  (verkoop buiten Nederland boven de OSS-drempel).
- **Geen methodes uitlezen.** De winkel kijkt alleen of het account betalingen
  aanneemt (`charges_enabled`), niet welke methodes er los aanstaan. Welke dat
  zijn, geeft `pnpm stripe:check --create` via `payment_method_types`.
- **Geen tweede kenmerk in de database.** Terugbetalen gaat bij Stripe op de
  betaling (`pi_…`) en niet op de sessie (`cs_…`). `createRefund` haalt dat
  kenmerk op het moment zelf op: één extra aanroep bij een handeling die een
  paar keer per week voorkomt, in plaats van een kolom erbij in `orders`.
- **Geen Stripe-badge in de footer.** Het Mollie-blok is weg; er staat alleen
  nog het iDEAL/Wero-merkbeeld. Een "Powered by Stripe"-badge kan erbij zodra
  het officiële bestand in `public/betaalmethodes/` staat — natekenen mag van
  geen enkele merkkit.
- **`lib/payment-methods.ts` is nog niet gemeten.** Die lijst is nu een
  voornemen: wat er in het Stripe-dashboard aangezet moet worden. Meet hem met
  `pnpm stripe:check --create` zodra het account goedgekeurd is, en werk hem
  bij.
