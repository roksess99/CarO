# CarO — Onderdelen Webshop

Moderne webshop voor auto-onderdelen en accessoires. Markt: Nederland. UI-taal: Nederlands (primair) en Engels (secundair).

## 🎯 Features

- **Zes productfamilies**: Onderdelen, gebruikte onderdelen, banden, velgen, toebehoren en gereedschap
- **Voertuigidentificatie**: Via kenteken (RDW-integratie) of merk/model/bouwjaar
- **Live zoekopdrachten**: Met suggesties over alle productfamilies
- **Winkelwagen**: Client-side, persistent via cookies/localStorage
- **Multilingaal**: Nederlands en Engels met next-intl
- **Dark Mode**: Thema-keuze met CSS-variabelen
- **Responsive Design**: Volledig optimaal op 375px tot desktop
- **Tyre24/ALZURA API**: Integratie met externe productcatalogus

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Taal**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **Internationalisatie**: next-intl
- **APIs**: 
  - Tyre24/ALZURA v1.3 (productcatalogus)
  - overheid.io (RDW-voertuiggegevens)
  - VOERTUIGCATALOGUS (merk/model-data)
- **Package Manager**: pnpm
- **Validatie**: Zod

## 🚀 Quick Start

### Vereisten
- Node.js 18+
- pnpm

### Installatie
```bash
pnpm install
```

### Development
```bash
pnpm dev
```
Bezoek [http://localhost:3000](http://localhost:3000)

### Production Build
```bash
pnpm build
pnpm start
```

## 📋 Verificatie voor Deployment

Voordat je code committet:

```bash
pnpm typecheck   # TypeScript-validatie
pnpm lint        # ESLint
pnpm build       # Production-build
```

## 📁 Project Structure

```
src/
  ├── app/[locale]/         # Routes en pagina's
  ├── components/           # Herbruikbare UI-componenten
  ├── lib/
  │   ├── catalog/          # Productcatalogus (types, providers)
  │   ├── cart/             # Winkelwagenlogica
  │   ├── vehicle/          # Voertuigidentificatie
  │   └── ...               # Utility-functies
  ├── i18n/                 # Internationalisatieconfiguratie
  └── messages/             # Vertalingen (NL/EN)
docs/                        # API-documentatie en beslissingen
scripts/                     # Eenmalige oogstscripts
public/                      # Statische assets
```

## 🔐 Omgevingsvariabelen

```env
TYRE24_API_TOKEN=<jouw-token>  # Optioneel; fallback op mock-data zonder token
NEXT_PUBLIC_SITE_URL=https://caro.nl
```

## 📝 Git Workflow

- Branch-naamgeving: `feature/<naam>` of `fix/<naam>`
- Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`
- Altijd om toestemming vragen voor commits/pushes
- Nooit `git push --force`

## 📚 Documentatie

- **Huisstijl & Branding**: [docs/BRAND.md](docs/BRAND.md)
- **Architectuurbeslissingen**: [docs/DECISIONS.md](docs/DECISIONS.md)
- **Tyre24 API**: [docs/api/TYRE24.md](docs/api/TYRE24.md)
- **RDW Integratie**: [docs/api/OVERHEID-IO.md](docs/api/OVERHEID-IO.md)
- **Voertuigcatalogus**: [docs/api/VOERTUIGCATALOGUS.md](docs/api/VOERTUIGCATALOGUS.md)

## 🏗 Bouwfasen

| Fase | Onderdeel | Status |
|------|-----------|--------|
| 1 | UI, routing, i18n, thema, componenten (mockdata) | ✅ KLAAR |
| 2 | Winkelwagen (client-side) | ✅ KLAAR |
| 3 | Tyre24-API & voertuigidentificatie | 🔄 ACTIEF |
| 4 | Database (PostgreSQL + Prisma) | ⏳ GEPLAND |
| 5 | Betaling (Mollie, iDEAL) | ⏳ GEPLAND |
| 6 | Velgen (Alloys API) | ⏳ GEPLAND |

## ⚖️ Juridisch (NL)

- Prijzen tonen **inclusief 21% BTW**
- Verzendkosten expliciet vóór checkout
- 14 dagen herroepingsrecht zichtbaar in checkout-flow

## 📞 Code Richtlijnen

- TypeScript strict mode (geen `any`)
- Bestandsnamen: `kebab-case.ts`
- Componenten: `PascalCase`
- Server Components per default; `"use client"` alleen waar nodig
- Bedragen als integer in **eurocenten**
- Comments leggen *waarom* uit, niet *wat*

## 🎨 UI/UX

- **Mobile-first** (375px minimum)
- **Toetsenbordnavigatie** volledig ondersteund
- **Focus-indicatoren** altijd zichtbaar
- **Dark Mode** ondersteund
- **Beeldvullende foto's** in categorieraster

---

Gericht op het Nederlandse markt met strikt assortiment (personen- en tweewielers enkel). Geen vrachtwagens, landbouw of industrie.