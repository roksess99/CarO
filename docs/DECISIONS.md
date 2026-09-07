# Openstaande beslissingen — CarO

Zolang een beslissing hier op OPEN staat: **niet gokken, vragen.**

---

## 1. Onderdelen-catalogus API — VASTGESTELD → Tyre24/ALZURA

Besloten 2026-08-06: **Tyre24 / ALZURA**. Sinds 2026-09-06 zijn dat twee API's
van dezelfde leverancier, elk met een eigen token:

| API | Families | Documentatie |
|---|---|---|
| Products v1.3 | banden, velgen, toebehoren | docs/api/TYRE24.md |
| Wearparts v1.6 | onderdelen, kenteken → auto | docs/api/WEARPARTS.md |

Beide zijn marketplaces met groothandels; bestellen via de API (dropship) kan
bij allebei.

**Afgerond 2026-08-07** — de adapter draait op de live API:
- [x] API-token geregeld → `TYRE24_API_TOKEN`
- [x] NL base path geverifieerd: `/nl/nl/rest/v13/products`
- [x] `productAreaId` bepaald via `GET /areas` — zie beslissing #7 hieronder

---

## 7. Welk assortiment verkopen we? — GROTENDEELS OPGELOST 2026-09-06

**Onderdelen draaien niet langer op product area 3.** Die area kon alleen
exacte OE-nummers zoeken en was niet actief op het NL-platform; de
Wearparts-API v1.6 kan wél bladeren én zoeken op naam, in het Nederlands.
Zie docs/api/WEARPARTS.md.

| Familie | Bron |
|---|---|
| Onderdelen | Wearparts v1.6, `TYRE24_WEARPARTS_TOKEN` |
| Banden, velgen, toebehoren | Products v1.3, `TYRE24_API_TOKEN` |

De drie blokkades die hieronder bij area 3 staan (niet actief op nl, alleen
OE-zoeken, `agreementNeeded`) gelden daarmee niet meer voor de catalogus. Voor
het plaatsen van bestellingen is de overeenkomstenvraag nog wel open — dat is
fase 4.

### Oorspronkelijke analyse (2026-08-07)

Gemeten op het echte account (docs/api/TYRE24.md): **er is geen area met nieuwe
auto-onderdelen.** Beschikbaar is:

| Optie | Wat | Voordeel | Nadeel |
|---|---|---|---|
| **Banden** (area 6, NL) | 11 categorieën, 1.567 items in Auto/SUV, 191 merken | Direct werkend op het NL-platform, nieuw product, goede marges | De shop heet "CarO Onderdelen" en is als onderdelenshop opgezet |
| **Gebruikte onderdelen** (area 10, DE) | 31 categorieën met OEN-nummers en foto's | Echte auto-onderdelen, past bij het merkverhaal | Tweedehands (andere garantie/herroeping), Duitse categorienamen, `stock: 1` per artikel |
| **Beide** | Banden + gebruikte onderdelen | Breedste aanbod | Twee areas betekent twee provider-instanties en gemengde UX |
| **Nieuwe onderdelen** | area 3 (`oe`) laten activeren, of andere leverancier | Wat oorspronkelijk bedoeld was | Vereist actie van Tyre24 of een tweede leverancier |

**Achterhaald**: er stond hier een tijdelijke `TYRE24_PRODUCT_AREA_ID`. De
areas staan sinds 2026-08-07 in `src/lib/catalog/families.ts` en onderdelen
komen sinds 2026-09-06 helemaal niet meer uit een productArea.

### Vastgesteld 2026-09-05: toebehoren-categorieën beperkt

Area 1 had geen allowlist en toonde daardoor **"LKW Ausstattung & Zubehör"**
— vrachtwagen, terwijl dat hierboven expliciet is uitgesloten — plus de
werkplaats-, gereedschap- en werkkledingcategorieën, vlak nadat gereedschap uit
het assortiment is gehaald. De lijst staat nu in `assortment.ts`:

| Wel | Niet |
|---|---|
| Wiel- en bandenaccessoires, auto-uitrusting, tweewieler, accu's, verlichting, oliën, autoverzorging, smart repair, bevestiging, schuren/lakken | LKW, Rund um die Werkstatt, Werkzeuge & Maschinen, Arbeitsbekleidung, Arbeitsschutz |

**Let op bij het uitbreiden van de allowlist:** area 1 heeft een categorieboom van drie niveaus. Een artikel draagt zijn blad-categorie ("Reifenreparaturkörper", id 944), niet de hoofdcategorie uit de navigatie. Toetsen op de hoofd-id alleen liet daar élk artikel afvallen — de toebehoren-pagina stond een dag leeg. `allowedCategoryIds()` in de provider loopt de boom af en verzamelt ook alle onderliggende ids.

**Categorienamen worden vertaald.** Tyre24 levert ze in de taal van het
platform (Nederlands voor banden en velgen, Duits voor toebehoren), dus een
Engelse bezoeker las "Rad & Reifenzubehör". De koppeling area+id → vertaalsleutel
staat in `src/lib/catalog/category-labels.ts`, en `localizeCategories()` past
hem toe vlak achter de provider — zo zijn navigatie, kruimelpad, tegels en
koppen overal gelijk.

### Vastgesteld 2026-09-05: welke filters de shop toont

De filterrespons van Tyre24 bevat tientallen groepen per categorie, waarvan het
merendeel onbruikbaar is voor een consument: "DA", "systeem", "RFID",
"aanwijzing" en "Inzet 2" hebben waarden als `1 | 3` — codes zonder betekenis
buiten hun eigen database. Daarom een allowlist per area in
`src/lib/catalog/filter-groups.ts`, in dezelfde geest als het assortimentsfilter.

| Area | Filters |
|---|---|
| 6 banden | merk, laadindex |
| 7 velgen | merk, steekcirkel, velgmaat, ET, max. draagvermogen, wielmontage |
| 1 toebehoren | merk, kleur, materiaal, maat |

Twee dingen die hiermee samenhangen:

- **Filterkoppen worden nu vertaald.** Behalve `manufacturer` gebruikt Tyre24
  de attribuutnáám als sleutel, in de taal van het platform — Nederlands voor
  banden en velgen, Duits voor toebehoren. Een Engelse bezoeker zag dus "Merk"
  en "Velgverbinding". De allowlist koppelt elke groep aan een vertaalsleutel
  onder `filters.labels`; onbekende groepen vallen terug op het API-label.
- **De filterwáárden blijven leveranciertaal.** "kegel", "kugel",
  "anthrazit matt": dat is vrije tekst van de groothandel en niet te vertalen
  zonder een eigen woordenlijst. Bij velgen zijn de waarden gelukkig maten en
  getallen.

Het merkveld bevat ook omschrijvingen in plaats van merken
("STAHLRAD OE QUALITÄT: ALCAR,KPZ,SÜDRAD,MWD"). Die worden eruit gefilterd:
een merknaam bevat geen dubbele punt of opsomming.

### Vastgesteld 2026-09-05: gereedschap en gebruikte onderdelen eruit

Winkelkeuze: CarO verkoopt **geen gereedschap (area 9) en geen gebruikte
onderdelen (area 10)** meer. Beide families zijn uit
`src/lib/catalog/families.ts` verwijderd, met hun tegels en vertalingen. De
URL's geven nu 404.

Er blijven vier families over: onderdelen (3), banden (6), velgen (7) en
toebehoren (1). Dat maakt het assortiment uitsluitend nieuw, wat het verhaal
over garantie en herroeping eenvoudiger houdt — bij tweedehands weegt de staat
waarin verkocht is mee, en dat vroeg om aparte voorwaardenteksten.

Beide areas waren hoe dan ook alleen op het DE-platform gevuld, dus met Duitse
categorienamen. De foto's in `public/categorieen/` voor deze twee zijn blijven
staan maar worden nergens meer gebruikt.

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

## 6. Fitment-koppeling: kenteken → passende onderdelen — OPGELOST 2026-09-06

**De Wearparts-API v1.6 levert de koppeling die hieronder als ontbrekend staat
beschreven.** `GET /vehicleByKey?keySystemType=1` zet een Nederlands kenteken
rechtstreeks om in een TecDoc-voertuig-id; `/category?carId=` geeft de
categorieboom van díe auto en `/articles?filter[carId]=` de onderdelen die
erop passen. Gemeten en werkend, zie docs/api/WEARPARTS.md.

Wat daarmee vervalt:

- de zoekbrug op merk en model voor onderdelen (die blijft voor velgen en
  toebehoren, want die families draaien nog op de Products-API);
- de RDW-omweg als *koppeling*. overheid.io blijft wel de bron voor wat de
  klant ziet — merk, model, brandstof, vermogen, APK — want dat leest
  vertrouwder dan de TecDoc-typenaam;
- de eerlijke melding "filteren werkt nog niet". Die is vervangen door
  `vehicle.fitmentReady`.

De oude analyse hieronder blijft staan als achtergrond bij de keuze.

---

### Oorspronkelijke analyse (2026-08-07) — kenteken → passende onderdelen

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

### Deelbesluit 2026-09-05: zoeken op merk en model — VASTGESTELD

Zolang de TecDoc-koppeling er niet is, voeden we de vrije-tekstzoekfunctie van
Tyre24 met merk en model. Staalvelgen dragen de auto in hun artikelnaam
("SF OPEL CORSA D, 6.0X15 ET39 5/110/65"), dus daar levert dat echte treffers.

De pagina `/nl/mijn-auto` (`/en/my-car`) toont het resultaat per familie, met
een terugvalladder van specifiek naar breed:

| Familie | Niveau | Waarom |
|---|---|---|
| Velgen | merk + model | Naam bevat merk én model |
| Toebehoren | alleen merk | "Autoschlüssel-Hülle für Opel" |
| Banden | geen | Geen voertuigrelatie; maat staat niet in RDW |
| Onderdelen | geen | Area 3 doorzoekt alleen exacte OE-nummers |

Drie dingen die je moet weten voor je dit uitbreidt:

- **De groothandel schrijft merken korter op.** "VOLKSWAGEN GOLF" geeft nul
  treffers, "VW GOLF" wel. De aliassen staan in
  `src/lib/catalog/vehicle-match.ts`; een ontbrekend alias is een stille
  lege pagina.
- **Bouwjaar is een verfijning, geen zeef.** Alleen namen met een leesbare
  periode ("(2011-)", "08.13-") worden erop gefilterd. Een naam als
  "SF VW GOLF VIII" heeft geen jaartal, dus die blijft staan — ook voor een
  Golf 7. Vandaar de disclaimer op de pagina.
- **Dit is geen fitment-garantie** en de UI zegt dat ook. Wordt de echte
  koppeling alsnog geleverd, dan vervangt die deze zoekbrug.

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

Het raster heeft nu vier tegels — één per familie — en alle vier hebben een
foto. De losse categoriefoto's die nergens meer gebruikt werden (filters,
motor, remmen, verlichting, gereedschap, gebruikte onderdelen) zijn
2026-09-07 verwijderd. Een tegel toevoegen is één regel in
`src/lib/catalog/category-tiles.ts` plus een bestand.

---

## 2. Hosting — OPEN

Vercel (simpelst voor Next.js) vs. een EU-VPS. Let op AVG: klantdata bij voorkeur in de EU.

### Environment variables bij een deploy

Gemeten 2026-09-06: een deploy zonder deze variabelen draait gewoon door, maar
op **mockdata** — de site ziet er dan compleet uit terwijl er geen enkel echt
product in staat. Dat kostte een dag zoeken naar een verkeerd vermoeden
("mijn deploy is niet doorgekomen"), dus hier de checklist.

| Variabele | Waarvoor | Zonder |
|---|---|---|
| `TYRE24_API_TOKEN` | Products v1.3: banden, velgen, toebehoren | Hele catalogus valt terug op de mock |
| `TYRE24_WEARPARTS_TOKEN` | Wearparts v1.6: onderdelen, kenteken → auto | Onderdelen leeg, geen fitment |
| `OVERHEID_IO_API_KEY` | RDW-gegevens bij het kenteken | "Tijdelijk niet beschikbaar" |
| `NEXT_PUBLIC_SITE_URL` | Canonical en hreflang | Verkeerde URL's in de SEO-tags |

Optioneel: `CARO_MIN_MARGIN_PERCENT` en `CARO_USE_RECOMMENDED_PRICE` (#5),
`TYRE24_BASE_URL_NL`/`_DE` als noodknop. `TYRE24_ALLOYS_TOKEN` wordt nog
nergens gelezen (fase 6).

Twee dingen die misgaan als je ze niet weet:

- **Zet ze voor Production én Preview.** Anders werkt de hoofdsite wel en elke
  pull-request-preview niet.
- **Een env-wijziging werkt niet door in een bestaande build.** Na het
  toevoegen opnieuw deployen.

De waarden staan in `.env` (gitignored) en in het wachtwoordbeheer van de
eigenaar — bewust niet hier, want dit bestand staat in Git.

## 3. Bedrijfsvorm en betaalaccount — GEDEELTELIJK VASTGESTELD 2026-08-20

De inschrijving is rond. Vastgelegd in `src/lib/company.ts` — één bron voor
de orderbevestiging, de factuur en de footer.

| Gegeven | Waarde |
|---|---|
| Rechtsvorm | Eenmanszaak |
| Handelsnaam | Car Parts A-Z |
| KvK-nummer | 93396252 |
| Vestigingsnummer | 000058945644 |
| Btw-nummer | NL005015784B71 |
| Adres | Gildebongerd 2, 7038 DE Zeddam |

**Nog open, blokkerend voor de betaalkoppeling (fase 5):** zakelijke rekening
(IBAN) en het bedrijfs-e-mailadres. Zolang die ontbreken staat er een
testwaarschuwing onderaan elke gegenereerde orderbevestiging.

**Let op — de shop heet anders dan het bedrijf.** Bij de KvK staat
"Car Parts A-Z"; de webshop heet overal CarO. Een factuur moet de
geregistreerde handelsnaam dragen, dus die staat nu op het document. Wil je
onder CarO factureren, dan moet CarO als (extra) handelsnaam ingeschreven
worden bij de KvK. Dat is een formaliteit, maar wel een die vóór livegang moet.

Bouw de checkout eerst tegen Mollie test mode.

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
| 2026-09-05 | Geen gereedschap en geen gebruikte onderdelen meer | Winkelkeuze; alleen nieuw assortiment houdt garantie- en herroepingsteksten eenduidig. Beide areas waren alleen op DE gevuld |
| 2026-08-20 | Eenmanszaak Car Parts A-Z, KvK 93396252 | Inschrijving rond; deblokkeert de factuurgegevens, niet de betaalkoppeling |
| — | Mollie boven Stripe | iDEAL is ~60% van NL online betalingen; Mollie is hier de standaard |
| — | Prijzen in eurocenten (integer) | Voorkomt afrondingsfouten |
