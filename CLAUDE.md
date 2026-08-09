# CarO — Onderdelen webshop (NL)

Webshop voor auto-onderdelen. Markt: Nederland. UI-taal: NL primair, EN secundair.

**Assortiment: alleen personenauto's en tweewielers.** Geen vrachtwagens,
landbouw, grondverzet of industrie. Afgedwongen als allowlist in
`src/lib/catalog/assortment.ts` — zie @docs/DECISIONS.md #7.

**Twee productfamilies: onderdelen en banden.** Dat onderscheid loopt door de
hele site: eigen navigatie-ingang, eigen URL-tak, eigen sectie op de homepage
en zichtbaar in het kruimelpad. Elke familie hangt aan een eigen Tyre24
productArea (`src/lib/catalog/families.ts`). Een familie zonder bron toont een
eerlijke lege staat, geen verzonnen producten.
Huisstijl: @docs/BRAND.md — wijk hier nooit vanaf.
Openstaande beslissingen: @docs/DECISIONS.md — niet gokken, vragen.

## Bouwvolgorde — belangrijk

We bouwen frontend-first. Database, externe productcatalogus en betaling komen **aan het eind**.

| Fase | Wat | Status |
|---|---|---|
| 1 | UI, routing, i18n, thema, componenten — op mockdata | KLAAR |
| 2 | Winkelwagen (client-side, cookie/localStorage) | KLAAR |
| 3 | Tyre24/ALZURA-API achter de provider-interface (docs/api/TYRE24.md) | ACTIEF |
| 4 | Database (PostgreSQL + Prisma): orders, klanten; inkoop via Tyre24 POST /order | |
| 5 | Betaling (Mollie, iDEAL) | |
| 6 | Velgen: Tyre24 Alloys-API — voertuigselectie (carID), matching, 3D-beelden | |

**Regels tijdens fase 3:**
- Het datacontract in `types.ts` is leidend. Past de echte API daar niet op,
  dan passen we de **adapter** aan — nooit de componenten.
- Componenten importeren **alleen** types uit `src/lib/catalog/types.ts`.
- Alle Tyre24-calls lopen **server-side** door `tyre24-provider.ts`; de browser
  praat nooit rechtstreeks met Tyre24 (token is een secret, rate limit 100/min).
- `TYRE24_API_TOKEN` ontbreekt nog → `getCatalogProvider()` valt terug op de mock.
  De site moet altijd zonder token blijven werken.
- Nog geen Prisma-schema en geen betaalcode. Order plaatsen (Tyre24 POST /order) is fase 4.
- Waar later serverwerk komt (ordercreatie, voorraadreservering):
  zet een functie in `src/lib/` met een `// TODO fase X` comment, geen halve implementatie.

## Stack

- **Framework**: Next.js 16, App Router, TypeScript strict
- **Styling**: Tailwind CSS v4 met CSS-variabelen uit @docs/BRAND.md
- **i18n**: next-intl
- **Thema**: class-based dark mode, eigen implementatie (init-script in de
  layout + `theme-toggle.tsx`). next-themes is verwijderd: verlaten package,
  gaf een React 19-warning door zijn client-side geïnjecteerde script.
- **Package manager**: pnpm
- **Catalogus**: Tyre24/ALZURA REST API v1.3 — zie @docs/api/TYRE24.md.
  Zod valideert alle API-responses aan de rand, daarna is alles getypeerd.
- **Kentekenzoeker**: overheid.io (RDW-voertuiggegevens) — zie @docs/api/OVERHEID-IO.md.
  Een kenteken is persoonsgegeven: nooit in een URL, nooit in een logregel.
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
  lib/                   # domeinlogica, geen React
  lib/catalog/           # types.ts (contract) + mock-provider.ts + tyre24-provider.ts
  lib/cart/              # winkelwagenlogica, framework-onafhankelijk
public/brand/            # logo SVG's
docs/api/                # Tyre24 swagger + integratienotities
messages/nl.json, en.json
```

- Domeinlogica in `src/lib/`, nooit in een component.
- Één plek waar productdata vandaan komt: `src/lib/catalog/`. Nergens anders.

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
