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

**Actie**: vragen bij Tyre24 of area 3 (`oe`, nieuwe onderdelen) op het
NL-platform geactiveerd kan worden. Dat bepaalt of de shop kan worden wat
CLAUDE.md beschrijft.

---

De adapter staat achter `src/lib/catalog/provider.ts`; zonder token valt hij terug
op de mock. Geen enkele andere plek in de code weet waar de data vandaan komt.

---

## 5. Prijsstrategie — GROTENDEELS OPGELOST, één vraag open

Gemeten 2026-08-07: de API levert per artikel **twee** prijzen — `type: "ek"`
(inkoop) en `type: "evp_3"` (adviesverkoopprijs van de leverancier). Voorbeeld
band: ek 27,63 / evp_3 48,00.

**Gekozen regel** (in `src/lib/pricing.ts`): volg de adviesverkoopprijs als die
er is, anders inkoop + `CARO_MARGIN_PERCENT`. Daarna 21% btw erbovenop. Uit te
zetten met `CARO_USE_RECOMMENDED_PRICE=false`.

**⚠️ Nog te verifiëren bij Tyre24 — blokkerend voor livegang**: zijn de
API-bedragen exclusief btw? B2B-marktplaatsen noteren standaard ex btw en wij
rekenen daarom 21% erbij. Blijken ze al inclusief te zijn, dan staat **elke
prijs in de shop 21% te hoog**.

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
