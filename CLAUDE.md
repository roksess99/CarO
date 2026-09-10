# CarO — Onderdelen webshop (NL)

Webshop voor auto-onderdelen. Markt: Nederland. UI-taal: NL primair, EN secundair.
Arabisch is 2026-09-08 verwijderd (winkelkeuze).

**Assortiment: alleen personenauto's en tweewielers.** Geen vrachtwagens,
landbouw, grondverzet of industrie. Afgedwongen als allowlist in
`src/lib/catalog/assortment.ts` — zie @docs/DECISIONS.md #7.

**Vier productfamilies**: onderdelen, banden, velgen en toebehoren.
Gebruikte onderdelen en gereedschap zijn 2026-09-05 uit het assortiment gehaald
(winkelkeuze, zie @docs/DECISIONS.md #7). Elke familie hangt aan één Tyre24 productArea
(`src/lib/catalog/families.ts`) en loopt door de hele site: eigen URL-tak,
eigen kolom in het assortimentsmenu en zichtbaar in het kruimelpad. Een familie
zonder aanbod toont een eerlijke lege staat, geen verzonnen producten.
Huisstijl: @docs/BRAND.md — wijk hier nooit vanaf.
Openstaande beslissingen: @docs/DECISIONS.md — niet gokken, vragen.

## Bouwvolgorde — belangrijk

We bouwen frontend-first. Database, externe productcatalogus en betaling komen **aan het eind**.

| Fase | Wat | Status |
|---|---|---|
| 1 | UI, routing, i18n, thema, componenten — op mockdata | KLAAR |
| 2 | Winkelwagen (client-side, cookie/localStorage) | KLAAR |
| 3 | Tyre24/ALZURA-API's achter de provider-interface (Products v1.3 + Wearparts v1.6) | KLAAR |
| 3b | Voertuigidentificatie: kenteken → TecDoc, autokiezer op merk/model/uitvoering | KLAAR |
| 4 | Database (PostgreSQL + Prisma) en inkoop via Tyre24 POST /order | Orders leven nu als JSON-bestand; inkoop gaat met de hand (@docs/DECISIONS.md #10) |
| 5 | Betaling (Mollie, iDEAL) | KLAAR |
| 6 | Velgen: Tyre24 Alloys-API — voertuigselectie (carID), matching, 3D-beelden | |

**Regels tijdens fase 3:**
- Het datacontract in `types.ts` is leidend. Past de echte API daar niet op,
  dan passen we de **adapter** aan — nooit de componenten.
- Componenten importeren **alleen** types uit `src/lib/catalog/types.ts`.
- Alle Tyre24-calls lopen **server-side** door `tyre24-provider.ts`; de browser
  praat nooit rechtstreeks met Tyre24 (token is een secret, rate limit 100/min).
- Zonder `TYRE24_API_TOKEN` valt `getCatalogProvider()` terug op de mock.
  De site moet altijd zonder token blijven werken.
- Nog geen Prisma-schema, en inkoop bij de groothandel (Tyre24 POST /order) blijft handwerk. Die call is fase 4 en mag nooit "even ter controle" gedraaid worden: hij plaatst een echte, factureerbare bestelling.
- Waar later serverwerk komt (ordercreatie, voorraadreservering):
  zet een functie in `src/lib/` met een `// TODO fase X` comment, geen halve implementatie.

## Wat de shop nu doet

Stand 2026-09-07. Handig bij het oppakken van werk; niet uitputtend.

| Onderdeel | Waar | Bijzonderheid |
|---|---|---|
| Hero in twee kolommen | `components/home/hero.tsx` | Links kentekenzoeker **én** merk/model-kiezer zichtbaar (geen tabs), rechts een banner met echte voorwaarden — geen verzonnen acties. Het linkerpaneel is de primaire actie: oranje bovenrand, plaat over de volle breedte (64px hoog) met de knop eronder, dan een "of"-scheiding en pas daarna de kiezer. De banner heeft daarom een omlijnde knop, geen tweede oranje vlak |
| Categorieraster | `components/home/category-grid.tsx` | Tegels uit `lib/catalog/category-tiles.ts`, foto's beeldvullend bijgesneden |
| Header | `components/site-header.tsx` | Rij 1: logo, voertuigknop, zoekbalk, taal, thema, wagen. Rij 2: de vier families |
| Zoeken met suggesties | `components/search/` | Server Action, vanaf 3 tekens met 350 ms debounce; toont thumbnail, merk en prijs. Elke aanroep raakt vier families |
| Voertuig opgeven | `components/vehicle/` | Kenteken of merk/model/uitvoering; beide leveren een TecDoc-`carId` en dus passende onderdelen. De kiezer toont **één veld tegelijk**: de volgende stap verschijnt pas als de vorige beantwoord is (`vehicle-picker.tsx`). Drie grijze keuzelijsten naast elkaar lazen als een formulier en trokken de aandacht weg bij de kentekenzoeker |
| Mobiele navigatie | `components/bottom-nav.tsx` | Zwevende tabbalk; assortiment en autokiezer openen als paneel vanaf de onderkant |
| Voertuigbalk | `components/vehicle/vehicle-bar.tsx` | Mobiel, in de sticky header boven de zoekbalk: merk, model en motorregel van de gekozen auto. Tikken opent de autokiezer |
| Categorierijen | `components/catalog/group-list.tsx` | Onderdelen per assemblagegroep, één rij per groep met het pictogram van de leverancier én het aantal artikelen. Alleen hoofdgroepen hébben een pictogram; zonder valt de beeldkolom weg |
| Platte categorieboom | `lib/catalog/wearparts-provider.ts` | `partLeafGroups()` slaat tussenniveaus over en verbergt lege takken: van vier klikken naar twee. Tellen kan alleen op eindgroepen — een groep met subgroepen geeft HTTP 500 |
| Olie en Filters | `lib/catalog/quick-links.ts`, `components/catalog/actions.ts` | Twee uitklapmenu's naast de vier families, met dezelfde opbouw. De hoofdgroep staat vast, de subgroepen komen per auto uit een Server Action — ze verschillen per voertuig. Mobiel staan ze als directe link bovenaan het assortimentspaneel |
| Soort boven toebehoren | `wearparts.ts` → `genericArticleId` | Een eindgroep toont standaard alleen waar hij over gaat. "Oliefilter" bevat 125 artikelen waarvan 65 filters; de rest waren afsluitschroeven en afdichtringen, die bovenaan stonden. `defaultGenericArticleId` van de groep filtert; "alles tonen" haalt het filter eraf |
| Bandenmaatkiezer | `components/tyres/tyre-size-picker.tsx` | Breedte/hoogte/diameter + seizoen als GET-formulier; maat in de URL. Zoeklogica in `lib/catalog/tyre-size.ts` |
| Contact | `app/[locale]/contact/page.tsx`, `components/contact/` | Gegevens en formulier naast elkaar. Het formulier gaat via een Server Action naar `info@caroparts.nl` (SMTP, `lib/mail.ts`); het adres staat er ook als gewone mailto-link naast. Honeypot tegen bots, vijf berichten per uur per afzender. `pnpm mail:check` test de SMTP-instellingen los van de site. Zonder de vier `SMTP_*`-variabelen meldt het formulier eerlijk dat het niet lukt — nooit een valse "verzonden" |
| Veelgestelde vragen | `app/[locale]/faq/page.tsx`, `components/faq-list.tsx` | Negen vragen in drie blokken, met `FAQPage`-markering. Elke familiepagina heeft er drie eigen onderaan, als gewone tekst |
| Categorieslugs | `lib/catalog/category-labels.ts` | Nederlandse slug per categorie, bevroren lijst. De leverancier schrijft toebehoren in het Duits; oude URL's krijgen een 308 via `proxy.ts` |
| Sitemap en robots | `app/sitemap.ts`, `app/robots.ts` | Home, families, categorieën en de statische pagina's, in twee talen met `hreflang`. Producten staan er bewust niet in |
| Deelkaart | `app/[locale]/opengraph-image.tsx` | Open Graph-beeld voor WhatsApp en social. Productpagina's zetten hun eigen foto; de rest krijgt deze merkkaart |
| Gestructureerde data | `components/json-ld.tsx`, `lib/site.ts` | `Product` op de productpagina, `BreadcrumbList` op categorie en product — ook op de onderdelencategorie. Open Graph via `socialMetadata()` |
| Productomschrijving | `lib/catalog/product-description.ts` | Drie tot vier zinnen uit de eigen velden van het artikel (merk, soort, eerste twee attributen, OE-nummer, verzending). Dezelfde tekst staat op de pagina én in de JSON-LD. Geen verkooppraat: elke zin die geen veld heeft valt weg |
| Laadschermen | `loading.tsx` per route, `<Suspense>` in de pagina | **Geen** `loading.tsx` op `/[locale]`: die liet elke pagina — ook de winkelwagen en de FAQ — met een productraster-skelet beginnen, en maakte van elke 404 een status 200. Kop, formulier en uitlegtekst staan nu meteen in de HTML; alleen wat de leverancier moet leveren streamt na |
| Echte 404 | `[family]/layout.tsx`, `[family]/[category]/layout.tsx` | Een layout staat bóven de Suspense-grens en kan de status dus nog zetten. Gekeurd wordt alleen wat synchroon kan: de familieslug, en bij onderdelen of de categorieslug een id draagt. Een onbekende categorie bij banden vraagt een API-call en blijft daarom 200 |
| Bestellen en betalen | `components/checkout/`, `lib/mollie/`, `lib/orders/` | De klant betaalt via Mollie. Bedragen worden bij het starten van de betaling **opnieuw uitgerekend** uit de catalogus — de wagen staat in localStorage en is aanpasbaar. Bevestiging komt van de webhook, nooit van de terugkeer in de browser |
| Na de betaling | `lib/orders/settle.ts`, `lib/orders/notify.ts` | Eén afhandeling voor webhook én terugkeerpagina, met `notifiedAt` tegen dubbele mail. Twee mails met dezelfde PDF: bevestiging naar de klant, werkbriefje met artikelnummers naar de beheerder, die met de hand inkoopt |
| Orderopslag | `lib/orders/store.ts` | JSON per bestelling in `.data/orders/`, gitignored. Kan omdat de winkel bij Hostinger draait en dus een blijvende schijf heeft; `ORDER_DATA_DIR` hoort buiten de projectmap (@docs/DECISIONS.md #10) |
| Productkaart | `components/product-card.tsx` | Kaal gehouden: beeld, naam, artikelnummer, voorraadbadge, prijs, twee icoonknoppen |

**Fitment werkt** sinds 2026-09-06: een kenteken gaat via de Wearparts-API naar
een TecDoc-voertuig-id, en daarmee toont `/nl/onderdelen?auto=<carId>` alleen
onderdelen die op die auto passen — zie @docs/api/WEARPARTS.md en
@docs/DECISIONS.md #6. `/nl/mijn-auto` blijft de zoekbrug op merk en model voor
velgen en toebehoren.

## Stack

- **Framework**: Next.js 16, App Router, TypeScript strict
- **Styling**: Tailwind CSS v4 met CSS-variabelen uit @docs/BRAND.md
- **i18n**: next-intl
- **Thema**: class-based dark mode, eigen implementatie (init-script in de
  layout + `theme-toggle.tsx`). next-themes is verwijderd: verlaten package,
  gaf een React 19-warning door zijn client-side geïnjecteerde script.
- **Package manager**: pnpm
- **Catalogus**: twee API's van dezelfde leverancier, met **elk een eigen token**.
  Banden, velgen en toebehoren komen uit **Products v1.3** (@docs/api/TYRE24.md,
  `TYRE24_API_TOKEN`); onderdelen uit **Wearparts v1.6** (@docs/api/WEARPARTS.md,
  `TYRE24_WEARPARTS_TOKEN`). Zod valideert alle API-responses aan de rand.
  Onderdelen hangen aan een gekozen auto: bladeren vereist een `carId`, zoeken
  op naam niet.
- **Kentekenzoeker**: overheid.io (RDW-voertuiggegevens) — zie @docs/api/OVERHEID-IO.md.
  Een kenteken is persoonsgegeven: nooit in een URL, nooit in een logregel.
- **Autokiezer zonder kenteken**: merk → model → uitvoering uit de
  Wearparts-boom, per stap opgehaald met een Server Action. Levert een
  `carId`, net als de kentekenzoeker. De eerder geoogste RDW-catalogus is
  2026-09-07 verwijderd: die gaf alleen merknamen en liep dus dood
  (@docs/api/VOERTUIGCATALOGUS.md beschrijft nog wel waarom RDW destijds
  boven de commerciële voertuig-API's won).
- Later: PostgreSQL + Prisma (fase 4), Mollie (fase 5)

Voeg geen libraries toe zonder te vragen. Geen state-manager, geen UI-kit.

## Commands

```bash
pnpm dev          # http://localhost:3000
pnpm build        # moet slagen voor elke commit
pnpm lint
pnpm typecheck    # tsc --noEmit
pnpm test
```

Draai `pnpm typecheck && pnpm lint` voordat je zegt dat werk af is.

## Structuur

URL-structuur (drie niveaus, taalafhankelijke familieslug):

```
/nl/banden                              /en/tyres
/nl/banden/auto-suv-1                   /en/tyres/auto-suv-1
/nl/banden/auto-suv-1/<product>-<id>    /en/tyres/auto-suv-1/<product>-<id>
/nl/onderdelen                          /en/parts
```

```
src/
  app/[locale]/          # routes
  app/[locale]/[family]/ # familie > categorie > product
  components/            # herbruikbare UI
  components/brand/      # logo-componenten
  components/cart/       # winkelwagenknoppen en -weergave
  components/checkout/   # klantgegevens en besteloverzicht
  components/home/       # hero, achtergrondtekening, categorieraster
  components/search/     # zoekveld met live suggesties (Server Action)
  components/vehicle/    # kentekenzoeker, autokiezer, kentekenplaat
  lib/                   # domeinlogica, geen React
  lib/catalog/           # types.ts (contract) + mock-provider.ts + tyre24-provider.ts
  lib/cart/              # winkelwagenlogica, framework-onafhankelijk
  lib/vehicle/           # RDW-adapter + geoogste merk/model-catalogus
public/brand/            # logo SVG's
public/categorieen/      # foto's voor het categorieraster (zie LEESMIJ.md)
docs/api/                # Tyre24 swagger + integratienotities
messages/nl.json, en.json
```

- Domeinlogica in `src/lib/`, nooit in een component.
- Één plek waar productdata vandaan komt: `src/lib/catalog/`. Nergens anders.
- Basis-URL en canonical/hreflang komen uit `src/lib/site.ts`. Nooit een
  domeinnaam hardcoden in een pagina — dat stond eerder zevenmaal gekopieerd
  met een localhost-fallback en verwees de hele site naar een dev-machine.

## Codeconventies

- TypeScript strict. Geen `any`. Geen `@ts-ignore` zonder uitleg op dezelfde regel.
- Bestandsnamen `kebab-case.ts`. Componenten exporteren `PascalCase`.
- Server Component is de default. `"use client"` alleen bij state, effects of browser-API's.
- Zod voor externe input: formulieren, API-responses, route params.
- **Bedragen als integer in eurocenten.** Nooit floats voor geld.
- Comments leggen *waarom* uit, niet *wat*.
- UI-teksten Nederlands, code en variabelen Engels.

## Geld en juridisch (NL) — ook in fase 1 al zichtbaar

- Prijzen tonen **inclusief 21% BTW**. Verplicht voor consumenten.
- Verzendkosten expliciet vóór de laatste checkoutstap.
- 14 dagen herroepingsrecht zichtbaar in de checkout-flow.
- **Een bedrag dat naar een betaaldienst gaat komt nooit uit de browser.**
  De winkelwagen leeft in localStorage; prijs en aantal worden server-side
  opnieuw uit de catalogus gehaald voordat er een betaling wordt aangemaakt.
- Het kenmerk op de orderbevestiging is géén factuurnummer: dat vraagt een
  oplopende reeks en dus de database van fase 4.

## Git-workflow

- Branches: `feature/<naam>`, `fix/<naam>`. Nooit direct op `main`.
- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`.
- **Vraag altijd toestemming voor commit of push. Wacht op "GO".**
- Nooit `git push --force`.

## Werkwijze

- Taak raakt meer dan één bestand: eerst een plan, dan code.
- Keuze staat niet in dit bestand: vraag het.
- Klopt een aanname hier niet meer: zeg het en werk dit bestand bij.

## Definition of done

1. Typecheck en lint slagen
2. Werkt op 375px en desktop
3. Toetsenbordnavigatie werkt, focus zichtbaar
4. NL en EN teksten aanwezig in `messages/`
5. Geen nieuwe console errors

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
