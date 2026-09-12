# CarO — Onderdelen Webshop

Webshop voor auto-onderdelen, banden, velgen en toebehoren. Markt: Nederland.
UI-taal: Nederlands (primair) en Engels (secundair).

Draait live op [caroparts.nl](https://caroparts.nl). Handelsnaam bij de KvK is
**Car Parts A-Z**; de winkel heet CarO.

## Wat de shop doet

- **Vier productfamilies**: onderdelen, banden, velgen en toebehoren.
  Gereedschap en gebruikte onderdelen zijn 2026-09-05 uit het assortiment
  gehaald; alleen personenauto's en tweewielers, geen vrachtwagen of landbouw.
- **Voertuigidentificatie**: kenteken of merk → model → uitvoering. Beide
  leveren een TecDoc-voertuig-id, en daarmee tonen we **alleen onderdelen die
  op die auto passen** — inclusief een ja/nee-badge op de productpagina.
- **Maatkiezers** voor banden (breedte/hoogte/diameter/seizoen) en velgen
  (diameter, breedte, steekcirkel).
- **Live zoeken** met suggesties over alle families.
- **Winkelwagen** in localStorage; bedragen worden bij het afrekenen opnieuw
  uit de catalogus gehaald, nooit uit de browser overgenomen.
- **Betalen via Mollie** (iDEAL). Na een bevestigde betaling gaan er twee mails
  uit met dezelfde PDF: een opgemaakte bevestiging naar de klant en een
  werkbriefje met artikelnummers naar de beheerder, die met de hand inkoopt.
- **Adres automatisch invullen** uit postcode en huisnummer.
- **Tweetalig** (next-intl), **dark mode**, en responsive vanaf 375px.

## Tech stack

- **Framework**: Next.js 16 (App Router), React 19
- **Taal**: TypeScript strict
- **Styling**: Tailwind CSS v4 met CSS-variabelen uit `docs/BRAND.md`
- **i18n**: next-intl
- **Validatie**: Zod, aan elke buitenrand
- **Package manager**: pnpm 11
- **Externe diensten**:
  | Dienst | Waarvoor | Documentatie |
  |---|---|---|
  | Tyre24/ALZURA Products v1.3 | banden, velgen, toebehoren | `docs/api/TYRE24.md` |
  | Tyre24/ALZURA Wearparts v1.6 | onderdelen, kenteken → auto | `docs/api/WEARPARTS.md` |
  | overheid.io | RDW-voertuiggegevens | `docs/api/OVERHEID-IO.md` |
  | Mollie | betalingen | `docs/DECISIONS.md` #10 |
  | gratis-postcodedata.nl | straat en plaats bij een postcode | `docs/api/POSTCODE.md` |
  | SMTP (Hostinger) | contactformulier en orderbevestiging | `src/lib/mail.ts` |

Er is nog **geen database**: bestellingen staan als JSON in `.data/orders/`
(`docs/DECISIONS.md` #10). Voeg geen libraries toe zonder te vragen.

## Aan de slag

Vereist: Node.js 20.9+ en pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

**Zonder tokens draait de site op mockdata** en ziet hij er compleet uit
terwijl er geen enkel echt product in staat. Kopieer daarom `.env.example` naar
`.env`; dat bestand is de checklist, met per variabele wat er zonder misgaat.

| Script | Wat |
|---|---|
| `pnpm dev` | Ontwikkelserver |
| `pnpm build` | Productiebuild — moet slagen vóór elke commit |
| `pnpm start` | Productieserver |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm mail:check` | Test de SMTP-instellingen los van de site (`--send` stuurt een testbericht) |
| `pnpm mollie:check` | Toont of de sleutel test of live is, en welke betaalmethodes aanstaan |

Voor een commit: `pnpm typecheck && pnpm lint && pnpm build`.

## Omgevingsvariabelen

De volledige lijst met uitleg staat in `.env.example`. Kort:

| Variabele | Zonder |
|---|---|
| `TYRE24_API_TOKEN` | banden, velgen en toebehoren vallen terug op de mock |
| `TYRE24_WEARPARTS_TOKEN` | onderdelen leeg, geen fitment, geen kentekenzoeker |
| `OVERHEID_IO_API_KEY` | kenteken geeft "tijdelijk niet beschikbaar" |
| `NEXT_PUBLIC_SITE_URL` | verkeerde canonical- en hreflang-tags |
| `SMTP_HOST/PORT/USER/PASSWORD` | geen mail, en bestellen wordt geweigerd |
| `MOLLIE_API_KEY` | checkout meldt dat betalen niet kan |
| `ORDER_ADMIN_EMAIL` | de inkoopmail gaat naar het adres uit `src/lib/company.ts` |
| `ORDER_DATA_DIR` | bestellingen komen in `<project>/.data/orders` te staan |

Twee valkuilen: zet ze in **élke** omgeving die je draait (ook preview), en
**bouw opnieuw na een wijziging** — een bestaande build pikt ze niet op.

## Structuur

```
src/
  app/[locale]/          # routes; [family]/[category]/[product]
  app/api/               # Mollie-webhook
  components/            # UI, per domein gegroepeerd
  lib/
    address/             # postcode → straat en plaats
    cart/                # winkelwagenlogica, framework-onafhankelijk
    catalog/             # types.ts is het contract; providers erachter
    checkout/            # validatie, opslag, order-PDF
    mollie/              # betaling aanmaken en status ophalen
    orders/              # opslaan, afhandelen, mailen
    vehicle/             # kenteken en autokiezer
  i18n/                  # routing en request-configuratie
messages/                # nl.json en en.json — zelfde sleutels, anders faalt de build
docs/                    # beslissingen, huisstijl, API-notities
public/                  # logo's, categoriefoto's, betaalmerken
scripts/                 # controlescripts (mail, Mollie)
```

Domeinlogica hoort in `src/lib/`, nooit in een component. Productdata komt
uitsluitend uit `src/lib/catalog/`.

## Documentatie

| Bestand | Waarover |
|---|---|
| `CLAUDE.md` | Werkafspraken, wat de shop nu doet, codeconventies |
| `docs/DECISIONS.md` | Openstaande en vastgelegde keuzes — **niet gokken, vragen** |
| `docs/BRAND.md` | Huisstijl; leidend voor alle UI |
| `docs/PRIVACY.md` | Wat de shop in de browser opslaat, en hoe dat gecontroleerd is |
| `docs/api/*.md` | Per externe dienst: wat gemeten is en waar de valkuilen zitten |

## Bouwfasen

| Fase | Onderdeel | Status |
|---|---|---|
| 1 | UI, routing, i18n, thema, componenten | ✅ klaar |
| 2 | Winkelwagen | ✅ klaar |
| 3 | Tyre24-catalogus (Products + Wearparts) | ✅ klaar |
| 3b | Voertuigidentificatie en fitment | ✅ klaar |
| 4 | Database (PostgreSQL + Prisma) en inkoop via de API | ⏳ orders als JSON, inkoop met de hand |
| 5 | Betaling (Mollie, iDEAL) | ✅ klaar |
| 6 | Velgen via de Alloys-API (3D-beelden, carID-matching) | ⏳ gepland |

## Juridisch (NL)

- Prijzen **inclusief 21% btw**; bedragen als integer in eurocenten.
- Verzendkosten € 7,45, gratis vanaf € 100, expliciet vóór de laatste stap.
- 14 dagen herroepingsrecht zichtbaar in de checkout.
- Het kenmerk op de orderbevestiging is **geen factuurnummer**: dat vraagt een
  oplopende reeks en dus de database van fase 4.
- Een kenteken is een persoonsgegeven: nooit in een URL, nooit in een logregel.

## Git-workflow

- Branches `feature/<naam>` of `fix/<naam>`. Nooit direct op `main`.
- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`.
- Altijd toestemming vragen voor commit of push. Nooit `git push --force`.
