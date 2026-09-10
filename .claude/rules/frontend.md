---
paths:
  - "src/app/**/*.{ts,tsx,css}"
  - "src/components/**/*.{ts,tsx}"
  - "messages/*.json"
---

# Frontend regels — CarO

Laadt alleen bij UI-werk. Huisstijl staat volledig in `docs/BRAND.md`.

## Kleur — geen uitzonderingen

```css
--caro-orange: #FF6A13;
--caro-ink:    #0E1013;
--caro-grey:   #767C85;
--caro-zinc:   #F5F6F7;
```

`#FF6A13` haalt 2,87:1 op wit en faalt WCAG AA. Daarom:

- Primaire knop = oranje vlak, **tekst `--caro-ink`**, nooit wit.
- Nooit oranje tekst op een lichte achtergrond. Gebruik `--caro-ink` met oranje onderlijn.
- Oranje op `--caro-ink` mag wel (6,6:1) — dat is het dark-mode accent.
- Alle kleuren via CSS-variabelen, zodat dark mode één plek raakt.
- Secundaire tekst is `text-muted`, niet `text-caro-grey`: het merkgrijs
  haalt 4,21:1 op wit en faalt AA. Zie docs/BRAND.md.

### Thema — vaste kleuren zijn bijna altijd fout

Gebruik `bg-background`, `bg-surface`, `text-foreground`, `text-muted` en
`border-border`. Een blok met `bg-caro-ink` of `text-white` blijft donker in
lichte modus en leest dan als een fout. Dit is twee keer misgegaan (hero-vlak
en hero-banner).

Drie plekken mogen wél een vaste kleur hebben, met reden:
- de zwevende tabbalk onderaan — die is als donkere app-balk ontworpen;
- de scrim achter een paneel (`bg-caro-ink/70`) — dat is een schaduw;
- de kentekenplaat — geel met blauwe EU-strook is wettelijk vastgelegd.

### Uitklappanelen en `overflow-hidden`

Een sectie met `overflow-hidden` knipt élk absoluut gepositioneerd paneel af
dat eruit steekt. De hero had het staan voor zijn achtergrondtekening en sneed
zo 147px van de merkenlijst weg (GEMETEN 2026-09-10) — de lijst leek gewoon
kapot. Zet `overflow-hidden` op het element dat het écht nodig heeft (bij de
hero: de tekening zelf), niet op de sectie eromheen.

### Native formulierelementen

Geef `<select>` nooit `bg-transparent`. De browser rendert het uitklapmenu dan
met zijn eigen lichte achtergrond terwijl de tekstkleur van het donkere thema
wordt geërfd: grijs op wit, onleesbaar. Zet een expliciete `bg-background
text-foreground` op zowel het `<select>` als de `<option>`s — browsers nemen de
kleuren van het select-element niet automatisch over in het popupvenster.

## Logo

- Logo's staan in `public/brand/`, geladen via componenten in `src/components/brand/`.
- Onder 40px: `caro-mark-line.svg`. De volle moer loopt dan dicht.
- Nooit de SVG inline herschrijven of de kanteling van 12° aanpassen.
- Header gebruikt `caro-lockup.svg` (licht) of `caro-lockup-dark.svg` (dark mode).

## Layout

- Mobile first. Breakpoints 375 / 768 / 1280. Max contentbreedte 1280px.
- Spacing alleen via Tailwind-schaal (4/8/12/16/24/32). Geen willekeurige pixels.
- Productgrid: 2 kolommen mobiel, 3 tablet, 4 desktop.

## Data — fase 1 en 2

- Componenten importeren types uit `src/lib/catalog/types.ts`.
- Data komt via `getCatalogProvider()`, nooit rechtstreeks uit de mock.
- Verzin geen extra velden op `Part`. Ontbreekt er iets: eerst `types.ts` aanpassen.
- Prijzen zijn `priceCents` (integer). Formatteren met
  `Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })`.

## Componenten

- Server Component tenzij interactie nodig is.
- Een `loading.tsx` hoort bij de route die écht op data wacht, nooit hoog in
  de boom. Op `/[locale]` betekende hij dat de winkelwagen en de FAQ met een
  productraster-skelet begonnen, én dat Next de HTML met status 200 al had
  verstuurd voordat `notFound()` viel — elke 404 werd zo een "soft 404".
  Statische inhoud (kop, formulier, uitleg) hoort in de eerste HTML; wat de
  leverancier moet leveren zet je in een eigen `<Suspense>`.
- Moet een route een echte 404 kunnen geven, keur de URL dan in een `layout.tsx`
  van datzelfde segment: die staat bóven de Suspense-grens. Alleen synchrone
  keuringen — een API-call daar kost elke geldige pagina zijn snelle start.
- Lege staat is een uitnodiging tot actie, niet alleen "geen resultaten".
- Artikelnummers en prijzen: `font-variant-numeric: tabular-nums` zodat kolommen uitlijnen.

## Toegankelijkheid (WCAG 2.2 AA)

- Contrast minimaal 4,5:1 voor tekst. Check elke nieuwe kleurcombinatie.
- Elke afbeelding heeft `alt`; decoratief krijgt `alt=""`.
- Focusring altijd zichtbaar. Nooit `outline: none` zonder vervanging.
- Formulierfouten in tekst én gekoppeld via `aria-describedby`. Niet alleen kleur.
- Alles bereikbaar met Tab. Respecteer `prefers-reduced-motion`.

## i18n

- next-intl. Routes `/nl/...` en `/en/...`, NL is default.
- Geen hardcoded tekst. Alles via `messages/nl.json` en `en.json`.
- Beide bestanden hebben dezelfde sleutels. Ontbrekende sleutel = build faalt.
- Gebruik logische eigenschappen: `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`,
  `text-start`. Niet omdat er nog een RTL-taal is — Arabisch is 2026-09-08
  verwijderd — maar omdat het niets kost en de deur openhoudt.
- Prijzen blijven `nl-NL` (`lib/format.ts`): euro-notatie, ook op de Engelse
  pagina's. De shop levert alleen in Nederland en de factuur is Nederlands.

## Onderdelencatalogus (Wearparts)

- Een eindgroep toont standaard alleen zijn eigen soort
  (`defaultGenericArticleId` → `filter[genericArticleId]`). Zonder dat komt de
  klant op "Oliefilter" eerst veertien afsluitschroeven tegen.
- Tellen kan alleen op eindgroepen: `/articles` geeft HTTP 500 op een groep
  met subgroepen. Tel dus nooit een hoofdgroep.
- Tellingen zijn een dag gecacht en lopen met zes tegelijk. De leverancier
  staat 100 requests per minuut toe voor de héle winkel.
- Zoeken op naam: geef de gekozen auto mee. Zonder `carId` doorzoekt de API de
  hele catalogus en komen onderdelen boven die niet eens passen.

## Performance

- `next/image` met expliciete `width`/`height` tegen layout shift, en altijd
  `sizes` zodra de foto meeschaalt — zonder dat kiest de browser de grootste
  variant uit de srcset, ook op een telefoon.
- Foto's van de leverancier worden dertig dagen door de optimizer bewaard
  (`minimumCacheTTL` in `next.config.ts`). Hun media-servers zetten korte
  cachetijden; zonder die ondergrens haalt Next dezelfde band telkens opnieuw
  op en zet hem opnieuw om.
- WebP, lazy loading behalve de eerste rij van het grid.
- Geen library groter dan 15kB gzipped zonder te vragen.
- Budget: LCP < 2,5s op 4G, CLS < 0,1.

## SEO

- Eén `<h1>` per pagina.
- `generateMetadata` op elke route: title, description, canonical, `hreflang` nl/en.
- Productpagina's krijgen JSON-LD `Product` met `offers`, `price`, `availability`,
  en lopende tekst uit `lib/catalog/product-description.ts`. Die tekst is
  opgebouwd uit velden die het artikel écht heeft; dezelfde zinnen gaan naar de
  markering, want een andere `description` in JSON-LD dan op de pagina is voor
  Google reden om de markering te negeren.
- **Elke route zet `generateMetadata`, ook als de gegevens uit een andere bron
  komen.** De onderdelencategorieën stonden niet in `provider.getCategories()`
  en vielen daardoor uit op `{}`: geen titel, geen canonical, geen hreflang op
  het grootste deel van de shop. Valt de naam niet op te halen, leid hem dan af
  uit de slug (`groupNameFromSlug`) in plaats van niets terug te geven.
- De canonical draagt geen `?auto=`: dat is de auto van deze bezoeker, niet een
  eigenschap van de pagina.
- Categorie- en productpagina's krijgen daarnaast JSON-LD `BreadcrumbList`,
  met dezelfde stappen als het zichtbare kruimelpad.
- **Geen `aggregateRating` zolang er geen echte beoordelingen zijn.** Cijfers
  verzinnen misleidt de klant en is voor Google een reden om de markering van
  de hele site te negeren. Retourtermijn en verzendtarief mogen wél mee: die
  staan in `offerPolicies()` en komen uit dezelfde bron als de site zelf.
- Markering beschrijft wat er op de pagina staat. `FAQPage` hoort dus bij
  /veelgestelde-vragen, niet bij de vragenblokken op een familiepagina.
- Elke route zet naast `localizedMetadata()` ook `socialMetadata()`: zonder
  Open Graph toont WhatsApp alleen de kale URL.
- Een pagina met alleen een productraster krijgt lopende tekst: een korte
  inleiding onder de `<h1>`, en op familiepagina's een uitleg onderaan.
- Nieuwe route die klanten mogen vinden? Zet hem in `app/sitemap.ts`. Nieuwe
  querystring die varianten van een bestaande pagina maakt? In `app/robots.ts`.
- URL's zijn Nederlands, ook als de leverancier zijn categorie anders noemt:
  de slug staat in `lib/catalog/category-labels.ts`. Verandert er een, zet de
  oude dan in `RENAMED_CATEGORY_SLUGS` — `proxy.ts` maakt er een 308 van.
  Een omleiding vanuit de pagina zelf werkt niet: door `loading.tsx` is de
  HTML dan al onderweg en wordt het een sprong met status 200.
- URL's zijn Nederlandse slugs: `/nl/remmen/remblokken`, niet `/nl/category/123`.
