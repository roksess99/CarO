# Tyre24 / ALZURA Wearparts REST API v1.6 — integratienotities

Bron: `REST API Version 1.6 Wearparts` (swagger 2.0), aangeleverd 2026-09-06.
**Aparte API en apart token** naast de Products-API v1.3 (docs/api/TYRE24.md).

| Wat | Waarde |
|---|---|
| Host | `https://tyre24.alzura.com` |
| Base path | `/nl/nl/rest/V16/wearparts` — **NL-platform werkt en geeft Nederlandse categorienamen** |
| Auth | Header `X-AUTH-TOKEN`, eigen token → `TYRE24_WEARPARTS_TOKEN` |
| Rate limit | 100 requests/minuut (`ERR_TOO_MANY_REQUESTS`), net als de Products-API |

## Wat dit oplost

Deze API levert precies wat de Products-API v1.3 niet kon (DECISIONS #6 en #7):
een voertuigkoppeling, een bladerbare categorieboom en onderdelen zoeken op naam.

### Kenteken → voertuig — GEMETEN 2026-09-06

`GET /vehicleByKey?keySystemType=1&keySystemNumber=<kenteken>`
(`keySystemType` 1 = **dutch NumberPlate**; de lijst kent er ruim twintig,
waaronder Duitse KBA en Franse TypeMine.)

| Kenteken | Antwoord |
|---|---|
| `RZ874H` | carId 140906 — "MCLAREN 720S 4.0" |
| `RZ-874-H` | zelfde resultaat; streepjes maken niet uit |
| `XN331L` | carId 128136 — "CITROËN C3 AIRCROSS II (2R_, 2C_) 1.2 PureTech 110" |
| `84HKG6` | carId 26605 — "CHEVROLET AVEO / KALOS Hatchback (T250, T255) 1.2" |

Dit is de brug die tot nu toe ontbrak: van een Nederlands kenteken rechtstreeks
naar een TecDoc-voertuig-id, inclusief motorvariant. **Geen RDW-omweg nodig.**

### Categorieboom per auto — GEMETEN

`GET /category?carId=128136` → **692 groepen**, met Nederlandse namen én een
`icon`-URL per groep: Remsysteem, Filter, Carrosserie, Elektrische systemen,
Airconditioning, Wielophanging, Koelsysteem, Aandrijfassen…

`GET /category?carId=…&parentNodeId=552` geeft de subgroepen (Remschijf,
Remblokken, ABS-wielsensoren, Hoofdremcilinder…).

Hiermee is het visuele mega-menu met iconen mogelijk — de iconen komen van de
leverancier, we hoeven ze niet zelf te tekenen.

### Zoeken op naam — GEMETEN

`GET /categoryBySearchString?carId=…&searchPattern=remschijf` → 10 groepen.
Nederlands werkt, Duits niet ("Bremsscheibe" → 0) — de taal volgt het platform.

`GET /articles?search=…` werkt **ook zonder auto**:

| Zoekterm | Treffers |
|---|---|
| `remschijf` | 7.127 |
| `oliefilter` | 5.375 |
| `BOSCH` | 6.413 |
| `OEN06A115561B` | 81 (de Products-API gaf er 2) |
| `EAN5907714119569` | 1 |

Prefixen: `OEN`, `EAN`, `TNS` (handelsnummer), `AID`, `ID`. Zonder prefix zoekt
hij over meerdere velden tegelijk.

### Artikelen per auto + categorie — GEMETEN

`GET /articles?filter[carId]=128136&filter[category]=<nodeId>&limit=…&page=…`
→ 286 remschijven die op díe Citroën passen.

Elk artikel geeft `articleName`, `brandName`, `eanNumber`, `genericArticleId`,
`quality`, `attr`, `docu` en een `offerList` per verkoper:

```json
{ "price": 0.78, "retailPrice": 5, "stock": 106,
  "sellerId": 204672, "sellerName": "Auto-Kfz-Teile" }
```

`price` is de inkoopprijs en `retailPrice` de adviesprijs — dezelfde opzet als
`ek`/`evp` in de Products-API, dus `src/lib/pricing.ts` past er zonder wijziging
op. Sorteren kan via `/sorters` (prijs, relevantie, topseller, merk, naam) en
filteren via `/filterList`.

### Verder beschikbaar

- `/manufacturers` (469 op nl), `/modelSeries`, `/vehicles` — de auto kiezen
  zonder kenteken, nu uit TecDoc zelf in plaats van uit onze RDW-oogst
- `/vehiclesByCarIds` — meerdere auto's in één call
- `/distributorList` — alle groothandels met prijs en voorraad per artikel
- `GET/POST /order` — bestellen, met dezelfde foutcodes als de Products-API

## Wat dit betekent voor de shop

De familie "onderdelen" hoeft niet langer op product area 3 (`oe`) te draaien.
Die area is alleen op exact OE-nummer doorzoekbaar en niet actief op het
NL-platform; deze API is dat allebei wél. Banden, velgen en toebehoren blijven
op de Products-API v1.3.

### Productfotos — GEMETEN

Elk artikel draagt een kant-en-klare URL in `image` (en dezelfde in `images` en `document[].docUrl`), op **cdn01.alzura.com**. Geen plaatshouders zoals de `%s` van de Products-API, dus rechtstreeks bruikbaar. Die host staat daarom in `next.config.ts` bij `remotePatterns`.

Er is ook een `manufacturerImage` — het merklogo, niet het product.

### Artikelnamen en talen — GEMETEN 2026-09-07

De naam zit in twee velden: `articleName` is de soortnaam ("Sneeuwketting") en `articleAddName` de productlijn ("PROTRAC 4FUN"). Los van elkaar heten tientallen artikelen in een categorie hetzelfde; wij plakken ze aan elkaar. Wat ze écht onderscheidt staat in `attr`, met een door de leverancier vertaald label:

```json
{ "71": { "translation": "Bandenmaat", "value": "155/80-15", "unit": "" },
  "212": { "translation": "Gewicht [kg]", "value": "3.92", "unit": "kg" } }
```

Het eerste attribuut is in de praktijk de maat of uitvoering; dat tonen we als variant op de productkaart.

**Talen: er is geen Engels platform.** Gemeten op hetzelfde artikel:

| Platform | Naam |
|---|---|
| `nl/nl`, `be/nl` | Sneeuwketting |
| `de/de` | Schneekette |
| `fr/fr` | Chaîne à neige |
| `es/es` | Cadena para la nieve |
| `it/it` | Catena da neve |
| `pl/pl` | werkt (JSON) |
| `en/en`, `gb/en`, `uk/en`, `nl/en` | geen API — geven een HTML-pagina terug |

De shop spreekt NL en EN; de API dekt daarvan alleen NL. Voor Engelse bezoekers blijven artikelnamen en attribuutlabels dus Nederlands. Dat is niet met een woordenlijst op te lossen: het gaat om miljoenen vrije-tekstvelden van honderden fabrikanten.

### Autokiezer zonder kenteken — GEMETEN 2026-09-07

Drie stappen: `/manufacturers` → `/modelSeries?manufacturerId=` → `/vehicles?manufacturerId=&modelId=`. Pas de laatste stap levert een `carId`, en dus fitment.

De derde stap was eerder het bouwjaar (uit onze RDW-oogst). Dat is niet genoeg: een VW Polo 6 heeft tientallen uitvoeringen, en `1.0 TSI 70 kW` heeft andere remmen dan `1.0 TSI 85 kW`. Nu kiest de klant de uitvoering, met brandstof, vermogen en bouwperiode in het label.

**Let op de merknamen.** TecDoc schrijft `VW`, niet `Volkswagen`. De merkenlijst komt daarom uit deze API en niet meer uit de RDW-oogst — anders zoekt de klant een merk dat de modellenstap niet kent. `src/lib/vehicle/makes.ts` valt terug op de oude lijst als de API wegvalt.

## Aandachtspunten

- **Twee tokens, twee API's.** Verwar ze niet: dit token werkt niet op
  `/rest/v13/products` en andersom.
- **`ERR_RESTRICTED_ACCESS`** is het antwoord als een endpoint niet voor dit
  account is vrijgegeven. Tot nu toe kwam die nergens voor.
- **Kenteken blijft persoonsgegeven.** De lookup gaat server-side, het kenteken
  nooit in een URL of logregel — zelfde regel als bij overheid.io.
- De `articleId` is geen getal maar een string (`"R-D0578"`), en `id` is een
  hex-achtige sleutel. Niet als integer parsen.
