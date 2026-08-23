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

### Thema — vaste kleuren zijn bijna altijd fout

Gebruik `bg-background`, `bg-surface`, `text-foreground`, `text-muted` en
`border-border`. Een blok met `bg-caro-ink` of `text-white` blijft donker in
lichte modus en leest dan als een fout. Dit is twee keer misgegaan (hero-vlak
en hero-banner).

Drie plekken mogen wél een vaste kleur hebben, met reden:
- de zwevende tabbalk onderaan — die is als donkere app-balk ontworpen;
- de scrim achter een paneel (`bg-caro-ink/70`) — dat is een schaduw;
- de kentekenplaat — geel met blauwe EU-strook is wettelijk vastgelegd.

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
- Elk component dat data laadt heeft `loading.tsx` (skeleton) en `error.tsx`.
- Lege staat is een uitnodiging tot actie, niet alleen "geen resultaten".
- Artikelnummers en prijzen: `font-variant-numeric: tabular-nums` zodat kolommen uitlijnen.

## Toegankelijkheid (WCAG 2.2 AA)

- Contrast minimaal 4,5:1 voor tekst. Check elke nieuwe kleurcombinatie.
- Elke afbeelding heeft `alt`; decoratief krijgt `alt=""`.
- Focusring altijd zichtbaar. Nooit `outline: none` zonder vervanging.
- Formulierfouten in tekst én gekoppeld via `aria-describedby`. Niet alleen kleur.
- Alles bereikbaar met Tab. Respecteer `prefers-reduced-motion`.

## i18n

- next-intl. Routes `/nl/...`, `/en/...` en `/ar/...`, NL is default.
- Geen hardcoded tekst. Alles via `messages/nl.json`, `en.json` en `ar.json`.
- Alle drie de bestanden hebben dezelfde sleutels. Ontbrekende sleutel = build faalt.

### Rechts-naar-links (Arabisch)

- **Nooit `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-` of `text-left`.** Gebruik
  de logische varianten `ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`,
  `text-start`. Die spiegelen mee met `dir`; de fysieke niet.
- `dir` staat op `<html>` via `textDirection()` uit `i18n/routing.ts`.
- Wat níet mag spiegelen krijgt een eigen `dir="ltr"`: de kentekenplaat heeft
  de EU-strook altijd links, ook op een Arabische pagina.
- Prijzen blijven `nl-NL` (`lib/format.ts`): euro-notatie met Latijnse cijfers,
  ook in het Arabisch. Arabisch-Indische cijfers naast een €-teken lezen
  verkeerd en wijken af van de factuur.
- Arabische URL-slugs zijn Latijns (`/ar/tyres`): Arabisch schrift wordt in een
  URL percent-encoded en levert onleesbare links op.

## Performance

- `next/image` met expliciete `width`/`height` tegen layout shift.
- WebP, lazy loading behalve de eerste rij van het grid.
- Geen library groter dan 15kB gzipped zonder te vragen.
- Budget: LCP < 2,5s op 4G, CLS < 0,1.

## SEO

- Eén `<h1>` per pagina.
- `generateMetadata` op elke route: title, description, canonical, `hreflang` nl/en.
- Productpagina's krijgen JSON-LD `Product` met `offers`, `price`, `availability`.
- URL's zijn Nederlandse slugs: `/nl/remmen/remblokken`, niet `/nl/category/123`.
