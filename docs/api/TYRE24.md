# Tyre24 / ALZURA REST API — integratienotities

Bronnen (Swagger 2.0, beide versie 1.3, zelfde host en token):
- `tyre24-products-v13.yaml` — **Products**: auto-onderdelen. Fase 3, actief.
- `tyre24-alloys-v13.yaml` — **Alloys**: velgen. Besloten assortiment, aparte fase (zie CLAUDE.md fasetabel).

Dit is de gekozen catalogus-leverancier (docs/DECISIONS.md #1).

## Basisfeiten

| Wat | Waarde |
|---|---|
| Host | `https://tyre24.alzura.com` |
| Base path | `/{land}/{taal}/rest/v13/products` — docs tonen `/de/de/`, voor NL vermoedelijk `/nl/nl/` (**verifiëren zodra token er is**) |
| Auth | Header `X-AUTH-TOKEN: <token>` op elk request |
| Token | Genereren op tyre24.alzura.com → Token Management. **Nog niet geregeld.** Tokens verlopen; daarna opnieuw inloggen/verversen |
| Rate limit | **100 requests/minuut** (`ERR_TOO_MANY_REQUESTS`) — cachen is verplicht, geen client-side calls |
| Formaat | JSON. Let op: veel numerieke velden komen als **string** terug (o.a. prijzen, quantity) |

## Endpoints die wij gebruiken

| Endpoint | Doel | Fase |
|---|---|---|
| `GET /areas` | Product-areas (banden, onderdelen, …) + instellingen per area. Nodig om `productAreaId` te bepalen | 3 |
| `GET /categories?productAreaId=` | Categorieboom (`parentNodeId` voor children, `hideEmpty=true`) | 3 |
| `GET /items?productAreaId=&…` | Producten zoeken: één van `parentNodeId` / `search` / `itemId` is verplicht. Paginatie `page`/`limit`, sortering via `/sorter`, fabrikant-filter | 3 |
| `GET /distributors?productAreaId=&itemId=` | Alle groothandels met prijs en voorraad voor één artikel | 3/4 |
| `GET /order` | Offer-request: goedkoopste aanbieding voor artikel+aantal | 4 |
| `POST /order` | Bestelling plaatsen bij de groothandel (body = response van GET /order + quantity) | 4 |
| `/agreementList`, `/agreementPdfs`, `/newPdfAgreement` | B2B-overeenkomsten retailer↔groothandel; vereist vóór bestellen (`ERR_NO_MATCHING_AGREEMENT`) | 4 |

## Mapping naar ons datacontract (`src/lib/catalog/types.ts`)

`types.ts` blijft leidend; de adapter (`tyre24-provider.ts`) vertaalt.

| `Part`-veld | Tyre24 `Item`-bron | Opmerking |
|---|---|---|
| `id` | `itemId` | als string |
| `slug` | `slugify(name)-{itemId}` | itemId-suffix maakt hem stabiel en terug-parsebaar |
| `name` | `name` | vertaald door de API (taal uit base path) |
| `brand` | `manufacturerName` | |
| `oeNumber` | `identifications.OEN[0]`, anders `manufacturerItemNumber` | |
| `categorySlug` | eerste `categories[]` → `slugify(name)-{categoryId}` | |
| `priceCents` | goedkoopste `distributors[].prices[].prices[areaId].base` → **inkoopprijs** → verkoopprijs via `src/lib/pricing.ts` | prijsstring → centen met stringrekenwerk, nooit floats |
| `availability` | `stock > 0` → `in-stock`; anders `out-of-stock` | `isExpressAvailable` later voor levertijd |
| `imageUrl` | `media[]` met `isDefault`, veld `imageLink` | |

## Belangrijke aandachtspunten

1. **Prijzen zijn B2B-inkoopprijzen.** Consumentenprijs = inkoop + marge + 21% btw.
   Margestrategie is een **open beslissing** (DECISIONS.md #5). Tot die tijd rekent
   `src/lib/pricing.ts` met een expliciete TODO en env-instelling.
   De `evkPrices` (1–5) in sommige responses lijken adviesprijzen — uitzoeken.
2. **Token is een server-secret.** Alle Tyre24-calls lopen server-side door de adapter.
   De browser praat nooit rechtstreeks met Tyre24. Token in `TYRE24_API_TOKEN` (.env, nooit committen).
3. **Rate limit 100/min** — categorieën en zoekresultaten server-side cachen (fetch revalidate).
4. **Foutcodes** komen als `errorMessage: "ERR_*"` in een 200-response óf als HTTP 403
   (`ERR_RESTRICTED_ACCESS`). De adapter behandelt beide.
5. **`productAreaId` is overal verplicht** en nog onbekend — bepalen via `GET /areas`
   zodra het token er is. Tot die tijd in `TYRE24_PRODUCT_AREA_ID` (.env).

## Alloys-API (velgen) — geparkeerd tot een eigen fase

Aparte API naast Products, zelfde token en rate limit. Kernstukken:

| Endpoint | Doel |
|---|---|
| `GET /carBrands` → `/carModels` → `/carTypes` | Voertuigselectie: brandID → modelID → **carID** (+ `threedCarID` voor 3D) |
| `GET /search`, `GET /rimMatchingAlloyRims` | Alleen velgen die op de gekozen auto passen — matching doet Tyre24 |
| `GET /images` | 3D-configurator: 36 rotatiebeelden auto + velg als losse lagen (`scene=1`, `screen=4`) |
| `GET /details`, `/filter`, `/sorter` | Detailinfo en filters |
| `GET/POST /order`, `/distributorList`, `/distributorProfile` | Offer/bestellen bij groothandel, parallel aan Products |

Aandachtspunten voor straks:
- De voertuigselectie (carID-flow) zit in déze API; de Products-API gebruikt TecDoc-data.
  Niet aannemen dat één voertuigkeuze beide dekt — verifiëren zodra het token er is.
- Zelfde B2B-prijsmodel → zelfde margevraag als DECISIONS.md #5.
- Architectuur: eigen adapter naast `tyre24-provider.ts` (het `Part`-contract is op
  onderdelen geschreven; velgen hebben eigen attributen als maat/ET/kleur — contract
  uitbreiden of apart `Rim`-type, beslissen bij de bouw).

## Environment-variabelen

```
TYRE24_API_TOKEN=          # Token Management op tyre24.alzura.com — NOOIT committen
TYRE24_BASE_URL=https://tyre24.alzura.com/nl/nl/rest/v13/products
TYRE24_PRODUCT_AREA_ID=    # via GET /areas bepalen
```

Zonder `TYRE24_API_TOKEN` valt `getCatalogProvider()` terug op de mock — de site blijft
altijd werken in ontwikkeling.
