# CarO — Onderdelen webshop (NL)

Webshop voor auto-onderdelen. Markt: Nederland. UI-taal: NL primair, EN secundair.
Huisstijl: @docs/BRAND.md — wijk hier nooit vanaf.
Openstaande beslissingen: @docs/DECISIONS.md — niet gokken, vragen.

## Bouwvolgorde — belangrijk

We bouwen frontend-first. Database, externe productcatalogus en betaling komen **aan het eind**.

| Fase | Wat | Status |
|---|---|---|
| 1 | UI, routing, i18n, thema, componenten — op mockdata | ACTIEF |
| 2 | Winkelwagen (client-side, cookie/localStorage) | |
| 3 | Externe onderdelen-API achter de bestaande provider-interface | |
| 4 | Database (PostgreSQL + Prisma): orders, klanten, voorraad | |
| 5 | Betaling (Mollie, iDEAL) | |

**Regels tijdens fase 1 en 2:**
- Bouw geen Prisma-schema, geen API-routes naar een echte catalogus, geen betaalcode.
- Alle productdata komt uit `src/lib/catalog/mock-provider.ts`.
- Componenten importeren **alleen** types uit `src/lib/catalog/types.ts`, nooit uit de mock zelf.
- Het datacontract in `types.ts` is leidend. Past de echte API daar straks niet op,
  dan passen we de adapter aan — nooit de componenten.
- Waar later serverwerk komt (prijsberekening, voorraadcheck, order aanmaken):
  zet een functie in `src/lib/` met een `// TODO fase X` comment, geen halve implementatie.

## Stack

- **Framework**: Next.js 15, App Router, TypeScript strict
- **Styling**: Tailwind CSS v4 met CSS-variabelen uit @docs/BRAND.md
- **i18n**: next-intl
- **Thema**: next-themes, class-based
- **Package manager**: pnpm
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

```
src/
  app/[locale]/          # routes
  components/            # herbruikbare UI
  components/brand/      # logo-componenten
  lib/                   # domeinlogica, geen React
  lib/catalog/           # types.ts (contract) + mock-provider.ts
  lib/cart/              # winkelwagenlogica, framework-onafhankelijk
public/brand/            # logo SVG's
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
