# Tyre24 / ALZURA REST API — integratienotities

Bronnen (Swagger 2.0, beide versie 1.3, zelfde host en token):
- `tyre24-products-v13.yaml` — **Products**: auto-onderdelen. Fase 3, actief.
- `tyre24-alloys-v13.yaml` — **Alloys**: velgen. Besloten assortiment, aparte fase (zie CLAUDE.md fasetabel).

Dit is de gekozen catalogus-leverancier (docs/DECISIONS.md #1).

## Basisfeiten

| Wat | Waarde |
|---|---|
| Host | `https://tyre24.alzura.com` |
| Base path | `/nl/nl/rest/v13/products` — **geverifieerd 2026-08-07**: geeft Nederlandse categorie- en area-namen. `/de/de/` werkt ook maar geeft Duitse namen (en andere areas, zie hieronder) |
| Auth | Header `X-AUTH-TOKEN: <token>` op elk request |
| Token | Genereren op tyre24.alzura.com → Token Management. **Nog niet geregeld.** Tokens verlopen; daarna opnieuw inloggen/verversen |
| Rate limit | **100 requests/minuut** (`ERR_TOO_MANY_REQUESTS`) — cachen is verplicht, geen client-side calls |
| Formaat | JSON. Let op: veel numerieke velden komen als **string** terug (o.a. prijzen, quantity) |

## Wat dit account écht kan (gemeten 2026-08-07 via `GET /areas` + `/categories`)

Dit is de belangrijkste bevinding: **er is geen area met nieuwe auto-onderdelen.**

| id | afk | Naam | NL-platform | DE-platform |
|---|---|---|---|---|
| 6 | `ty` | **Banden** | ✅ 11 categorieën, 1.567 items in Auto/SUV, 191 merken | ✅ |
| 7 | `sr` | Stalen velgen | ✅ 1 categorie | ✅ |
| 5 | `sv` | Services | ✅ 1 categorie ("Gegevens & analyses") | ✅ |
| 1 | `ac` | Toebehoor / Zubehör | ❌ leeg | ✅ "Rad & Reifenzubehör" |
| 10 | `up` | **Gebruikte onderdelen** | ❌ leeg | ✅ **31 categorieën** (Bremsanlage, Filter, Elektrik, Lenkung…), 19.122 items in Bremsanlage alleen |
| 3 | `oe` | OE | ❌ `ERR_B2B_PRODUCTAREA_INACTIVE` | ⚠️ actief, maar `ERROR_SEARCH_BY_CATEGORY_DISALBED` en `search` geeft 0 resultaten |
| 4 | `fl` | — | ❌ inactief | ❌ leeg |
| 8 | `aw` | Lichtmetalen wielen | ❌ leeg | ❌ leeg |
| 9 | `to` | Tools | ❌ leeg | ❌ leeg |

### Nieuwe onderdelen: area 3 "Original-Ersatzteile" (onderzocht 2026-08-07)

Dit is de area die je wilt voor **nieuwe** onderdelen. Hij bestaat en werkt —
op het Duitse platform. Volledig record uit `GET /areas`:

| Veld | Waarde | Betekenis |
|---|---|---|
| `areaStatus[0].name` | **Original-Ersatzteile** | Nieuwe originele onderdelen |
| `active` | `true` | Bestaat en is in gebruik |
| `searchPrefix` | **`"OEN"`** | Zoeken gaat op **OE-nummer**, niet op productnaam |
| `searchableByCategory` | **`false`** | **Geen categoriebrowsing mogelijk** |
| `showTecDocVehicleSearch` | `true` | Voertuigzoeken via TecDoc wordt ondersteund |
| `agreementNeeded` | **`true`** | B2B-overeenkomst met de groothandel vereist vóór bestellen |

Bewijs dat er data in zit — zoeken op OE-nummer `06A115561B`:

```
VOLKSWAGEN | OELFILTER | stock=9  | ek=10.01 evp_3=19.00
VOLKSWAGEN | OELFILTER | stock=10 | ek=14.80 evp_3=26.00
```

Zoeken op een productnaam ("bremsbelag", "ölfilter") geeft **0 resultaten** —
dat verklaart waarom een eerdere poging niets vond. Het is een OEN-zoekmachine.

**Beschikbaarheid per landplatform** (zelfde token, zelfde OEN):

| Platform | Resultaat |
|---|---|
| `de/de` | ✅ werkt, levert artikelen |
| `at/de` | ⚠️ area actief, maar 0 resultaten voor dit account |
| `nl/nl`, `be/nl`, `fr/fr` | ❌ `ERR_B2B_PRODUCTAREA_INACTIVE` |

**Geen voertuig-endpoints in deze API.** `/carBrands`, `/carModels`, `/carTypes`,
`/vehicles`, `/articles`, `/tecdoc` geven allemaal HTTP 400 op de Products-API.
Toch staan er in de swagger ongebruikte TecDoc-definities (`assemblyGroup`,
`CategoryBySearchString`, `ArticlesDirectSearch`, `vehicleIdentification`) die
bij géén enkel gedocumenteerd endpoint horen. Sterke aanwijzing dat er een
**aparte onderdelen-/TecDoc-API bestaat waarvan wij de documentatie niet hebben**.

**Wat je aan Tyre24 moet vragen:**
1. **Activeer productarea 3 ("Original-Ersatzteile") op het NL-platform.** Zonder
   dat kun je geen nieuwe onderdelen verkopen aan Nederlandse klanten.
2. **Documentatie van de TecDoc-voertuigzoek-API.** Zonder categoriebrowsing is
   dat de enige manier om onderdelen vindbaar te maken (en het is meteen de
   ontbrekende schakel voor de kentekenzoeker — zie DECISIONS.md #6).
3. **Welke overeenkomsten nodig zijn** (`agreementNeeded: true`) en hoe je die
   afsluit via `/agreementList` en `/newPdfAgreement`.

⚠️ **Gevolg voor de shop-UI**: area 3 kan niet met de huidige
categorie-navigatie werken. Onderdelen vragen een ander winkelmodel: klant
voert kenteken of OE-nummer in → passende artikelen. De categoriebrowsing die
we nu hebben werkt alleen voor banden (area 6) en gebruikte onderdelen (area 10).

Gevolgen:
- **Banden** is de enige goed gevulde area op het NL-platform.
- **Gebruikte onderdelen** (area 10, DE-platform) is de enige bron van echte
  auto-onderdelen: met OEN-nummers, automerk als `manufacturerName` en foto's.
  Let op: `stock: 1` per artikel — elk exemplaar is uniek en na verkoop weg.
- Wil je **nieuwe** onderdelen verkopen, dan moet er iets bij: area 3 (`oe`)
  laten activeren door Tyre24, of een andere leverancier.

## Gemeten datastructuur (belangrijk, wijkt af van de swagger)

1. **Prijzen staan per `type` in meerdere blokken per distributeur:**
   - `type: "ek"` = inkoopprijs (Einkaufspreis)
   - `type: "evp_3"` = **adviesverkoopprijs** van de leverancier
   - Voorbeeld band: `ek 27.63` / `evp_3 48.00`
   - De sleutel binnen `prices` is **`"1"`**, *niet* de productAreaId.
   - ⚠️ **Vermoedelijk exclusief btw** (B2B-marktplaats), maar de API zegt het
     niet. Zie docs/DECISIONS.md #5 — navragen bij Tyre24 vóór livegang.
2. **Productfoto's werken (nog) niet — `imageLink` is een sjabloon.**
   Gemeten 2026-08-07: **alle** areas leveren URL's met twee `%s`-placeholders,
   niet alleen banden:
   - banden: `https://media3.tyre-shopping.com/images/tyre/26064-PTY-%s-%s-br1.jpg`
   - gebruikte onderdelen: `…/3947354-X-%s-%s-br1.jpeg`

   Wat we hebben geprobeerd: `%s-%s` vervangen door breedte-hoogte
   (`200-200`, `400-400`, `800-600`, `1-1`, `0-0`, …). De server antwoordt dan
   **HTTP 500 met steeds exact dezelfde 12.240 bytes**, een generieke
   vervangfoto van 300×225 — ongeacht de gevraagde maat. De URL met de
   placeholders er nog in geeft HTTP 400. Het echte substitutieformaat staat
   niet in de swagger.

   **Actie: navragen bij Tyre24 waar `%s-%s` voor staat.** Tot die tijd
   filtert de adapter deze URL's weg en toont de UI een eigen merkplaceholder —
   beter dan op elk product dezelfde generieke foto of een gebroken plaatje.
3. **Het `manufacturer`-filter wil een base64-`identifier`**, niet de merknaam:
   `"NjE3fkFMVEVOWk8"` = `617~ALTENZO`. Die identifiers komen uit het
   `filter.manufacturer.filter`-blok in de `/items`-response.
4. `/items` vereist altijd `parentNodeId`, `search` of `itemId` — er is geen
   "toon alles". Het antwoord bevat ook `resCount`, `pageCount` en een
   `filter`-blok dat we voor de merkchips gebruiken.

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
