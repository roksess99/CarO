# Openstaande beslissingen — CarO

Zolang een beslissing hier op OPEN staat: **niet gokken, vragen.**

---

## 1. Onderdelen-catalogus API — VASTGESTELD → Tyre24/ALZURA

Besloten 2026-08-06: **Tyre24 / ALZURA REST API v1.3** (zie docs/api/TYRE24.md en
docs/api/tyre24-products-v13.yaml). Marketplace met groothandels, inclusief
TecDoc-data (voertuig-koppeling) en bestellen via de API (dropship mogelijk).

**Afgerond 2026-08-07** — de adapter draait op de live API:
- [x] API-token geregeld → `TYRE24_API_TOKEN`
- [x] NL base path geverifieerd: `/nl/nl/rest/v13/products`
- [x] `productAreaId` bepaald via `GET /areas` — zie beslissing #7 hieronder

---

## 7. Welk assortiment verkopen we? — OPEN — blokkerend voor de inhoud van de shop

Gemeten op het echte account (docs/api/TYRE24.md): **er is geen area met nieuwe
auto-onderdelen.** Beschikbaar is:

| Optie | Wat | Voordeel | Nadeel |
|---|---|---|---|
| **Banden** (area 6, NL) | 11 categorieën, 1.567 items in Auto/SUV, 191 merken | Direct werkend op het NL-platform, nieuw product, goede marges | De shop heet "CarO Onderdelen" en is als onderdelenshop opgezet |
| **Gebruikte onderdelen** (area 10, DE) | 31 categorieën met OEN-nummers en foto's | Echte auto-onderdelen, past bij het merkverhaal | Tweedehands (andere garantie/herroeping), Duitse categorienamen, `stock: 1` per artikel |
| **Beide** | Banden + gebruikte onderdelen | Breedste aanbod | Twee areas betekent twee provider-instanties en gemengde UX |
| **Nieuwe onderdelen** | area 3 (`oe`) laten activeren, of andere leverancier | Wat oorspronkelijk bedoeld was | Vereist actie van Tyre24 of een tweede leverancier |

**Nu ingesteld**: `TYRE24_PRODUCT_AREA_ID=6` (banden), zodat de shop met echte
data werkt. Dit is een **tijdelijke keuze om te kunnen bouwen**, geen besluit.

### Vastgesteld 2026-08-07: alleen auto's en tweewielers

CarO verkoopt uitsluitend voor personenauto's en tweewielers. Geen vrachtwagens,
landbouw, grondverzet of industrie. Afgedwongen in
`src/lib/catalog/assortment.ts` als **allowlist** — nieuwe categorieën uit de API
verschijnen dus niet automatisch in de shop.

| Verkopen we | Niet |
|---|---|
| Auto / SUV, Offroad, Transporter, Tweewieler, Quad / ATV, Kleine banden | Vrachtwagen, Landbouw, Grondverzet / MPT, Industrie, Overige |

"Overige" staat erbuiten omdat onbekend is wat erin zit. Wil je die erbij: eerst
de inhoud bekijken, dan toevoegen aan de allowlist.

Het filter zit in de provider (`fetchCategories` én `toPart`), zodat uitgesloten
categorieën ook niet via een directe URL bereikbaar zijn.

**Uitgezocht 2026-08-07 — nieuwe onderdelen bestaan wél**: area 3 heet
"Original-Ersatzteile" en levert echte artikelen (bewijs in docs/api/TYRE24.md).
Drie concrete blokkades, alle drie bij Tyre24:

1. **Area 3 is niet actief op het NL-platform** (wel op DE, deels AT).
2. **Zoeken kan alleen op OE-nummer** (`searchPrefix: "OEN"`,
   `searchableByCategory: false`) — de huidige categorie-navigatie werkt hier
   dus niet. Onderdelen vragen een zoek-gedreven winkelmodel.
3. **`agreementNeeded: true`** — B2B-overeenkomst per groothandel vereist
   voordat je kunt bestellen.

**Actie bij Tyre24**: (a) area 3 activeren op NL, (b) documentatie van de
TecDoc-voertuigzoek-API opvragen — die ontbreekt in de swagger en is de
ontbrekende schakel voor zowel onderdelen-navigatie als beslissing #6,
(c) uitzoeken welke overeenkomsten nodig zijn.

---

De adapter staat achter `src/lib/catalog/provider.ts`; zonder token valt hij terug
op de mock. Geen enkele andere plek in de code weet waar de data vandaan komt.

---

## 5. Prijsstrategie — VASTGESTELD 2026-08-07

**Btw**: de klant heeft bevestigd dat de API-bedragen **exclusief btw** zijn.
Wij tellen er 21% bij op. Daarmee is dit punt niet langer blokkerend.

**Marge**: gemeten over 100 artikelen per familie ligt de adviesverkoopprijs
(`evp`) structureel boven de inkoopprijs (`ek`), en élk artikel heeft er een:

| Familie | Opslag evp t.o.v. ek (mediaan) | p25 – p75 |
|---|---|---|
| Banden | +66% | 64% – 69% |
| Velgen | +71% | 69% – 77% |
| Gebruikte onderdelen | +85% | 81% – 86% |
| Toebehoren | +395% | kleine artikelen, inkoop ~€1 |

**Gekozen regel**: we volgen de adviesprijs en zetten daar géén eigen opslag
bovenop. Die prijs is marktconform én levert al 66–85% brutomarge; er nog een
marge bovenop doen zou ons boven de markt prijzen. Als vangnet geldt een
**ondergrens van 25% op de inkoopprijs** (`CARO_MIN_MARGIN_PERCENT`), voor het
geval een adviesprijs ontbreekt of te dicht op de inkoop ligt.

Implementatie: `src/lib/pricing.ts`.

---

## 8. Verzendkosten — VASTGESTELD 2026-08-07

| Wat | Waarde |
|---|---|
| Verzendkosten | **€ 7,45** |
| Gratis vanaf | **€ 100** |

Onderbouwing: onderzocht bij bekende NL/EU onderdelenshops — Winparts € 6,95,
Autodoc € 9,95 (gratis vanaf € 120). Gemiddelde € 8,45, wij gaan daar € 1
onder zitten. Tyre24 rekent óns € 6,90 per zending (gratis boven € 60
inkoopwaarde), dus het tarief dekt de kosten.

Implementatie: `src/lib/shipping.ts`. Zichtbaar in winkelwagen en checkout,
met "nog € X tot gratis verzending".

**Nog te doen bij livegang**: verzendkosten voor België/EU en eventuele
toeslagen voor pallets (banden/velgen kunnen als pallet verzonden worden —
de API heeft daar een `isPalletDelivery`-vlag voor die we nog niet gebruiken).

---

## 6. Fitment-koppeling: kenteken → passende onderdelen — OPEN — blokkerend voor de kernbelofte

De kentekenzoeker (overheid.io/RDW, docs/api/OVERHEID-IO.md) levert merk, model,
motorgegevens en bouwjaar. Dat is **geen** koppeling naar passende onderdelen.

Om "past op jouw auto" echt waar te maken is een brug nodig van RDW-voertuig
naar TecDoc-voertuig-id. Opties:

| Optie | Voordeel | Nadeel |
|---|---|---|
| **Tyre24 TecDoc-velden** (`tecDocData`, `linkedTargetId`, `showTecDocVehicleSearch`) | Zit al in de API die we gebruiken | Onduidelijk of er een RDW→TecDoc-mapping bestaat; token nodig om uit te zoeken |
| **Tyre24 Alloys carID-flow** (merk → model → type) | Gedocumenteerd en werkend | Handmatige keuze door de klant, geen automatische match op kenteken; geldt voor velgen |
| **Losse TecDoc-licentie** met kenteken-lookup | Meest compleet | Kosten en contract |

**Actie zodra het Tyre24-token er is**: uitzoeken of `/items` te filteren is op
een TecDoc-voertuig-id, en of dat id uit RDW-gegevens (merk + type + variant +
uitvoering) te herleiden is.

**Tot dat vaststaat**: de gekozen auto wordt bewaard en getoond, met een
eerlijke melding dat filteren nog niet werkt. Niet doen alsof het al kan.

### Deelbesluit 2026-08-11: auto kiezen zonder kenteken — VASTGESTELD

De klant kan zijn auto nu ook opgeven via merk → model → bouwjaar, uit een
catalogus geoogst uit RDW open data (docs/api/VOERTUIGCATALOGUS.md). Dat is
dezelfde bron als de kentekenzoeker, dus beide routes leveren identieke merk-
en modelteksten op.

Twee commerciële voertuig-API's zijn hiervoor gemeten en afgevallen omdat het
Noord-Amerikaanse databases zijn: **carapi.dev** (advertentiefeed, 100
requests/maand gratis, geen foto's, geen NL-kenteken→VIN) en **carapi.app**
(echte catalogus, maar zonder Peugeot, Renault, Citroën, Opel, Škoda, SEAT en
Dacia). Bewijs staat in docs/api/VOERTUIGCATALOGUS.md.

**Dit lost #6 niet op.** De catalogus zegt wélke auto de klant heeft, niet
welke onderdelen erop passen. Ook bandenmaat zit er niet in: RDW open data
heeft die niet — gecontroleerd, de enige band-datasets gaan over rupsbanden.

**Autofoto's blijven onmogelijk** met de onderzochte bronnen: er is geen route
van een Nederlands kenteken naar een VIN, en de foto's van carapi.dev zijn
opnames van individuele advertentievoertuigen, niet van het model.

---

## 9. Beeldrechten categoriefoto's — OPEN — blokkerend voor livegang

Het categorieraster op de homepage draait op foto's in `public/categorieen/`.
De zes die er nu staan zijn aangeleverd als `istockphoto-{id}-612x612.jpg` —
dat is het **gratis previewformaat** van iStock, bedoeld om te bladeren, niet
voor publicatie. Getty/iStock treedt hier actief tegen op.

**Vóór livegang**: vervangen door gelicentieerde versies, of door beeld van
Pexels, Unsplash of Pixabay (die staan commercieel gebruik toe). De code
verandert niet mee; het zijn alleen bestanden. Noteer de herkomst per foto in
`public/categorieen/BRONNEN.md`.

Zes van de twaalf tegels hebben nog geen foto: elektrisch, vering/demping,
carrosserie, uitlaat, koeling/airco en gereedschap. Een tegel toevoegen is één
regel in `src/lib/catalog/category-tiles.ts` plus een bestand.

---

## 2. Hosting — OPEN

Vercel (simpelst voor Next.js) vs. een EU-VPS. Let op AVG: klantdata bij voorkeur in de EU.

## 3. Bedrijfsvorm en betaalaccount — OPEN

Mollie vereist een KvK-inschrijving en zakelijke rekening. Dit blokkeert de betaal-integratie,
niet de rest van de bouw. Bouw checkout eerst tegen Mollie test mode.

## 4. Voorraadbeheer — OPEN, richting bekend

Tyre24 maakt dropshipping mogelijk: voorraad live opvragen (`stock` per item,
`/distributors` per artikel) en inkooporders via `POST /order`. Definitieve keuze
(alles dropship, of deels eigen voorraad) staat nog open, maar de API dekt beide.

---

## Vastgesteld

| Datum | Beslissing | Reden |
|---|---|---|
| 2026-08-06 | Tyre24/ALZURA als catalogus- en inkoop-API | Swagger-docs beschikbaar, TecDoc-data inbegrepen, dropship via API mogelijk |
| 2026-08-06 | Velgen komen in het assortiment | Tyre24 Alloys-API dekt matching (carID-flow) én 3D-beelden; zelfde leverancier en token. Eigen fase, na fase 3 |
| — | Next.js + TypeScript + Tailwind | Grootste community, snelste iteratie met een agent, sterke SEO-ondersteuning |
| — | PostgreSQL + Prisma | Type-safe, migraties, past bij bestaande SQL-kennis |
| — | Mollie boven Stripe | iDEAL is ~60% van NL online betalingen; Mollie is hier de standaard |
| — | Prijzen in eurocenten (integer) | Voorkomt afrondingsfouten |
