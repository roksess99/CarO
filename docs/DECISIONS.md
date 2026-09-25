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

### Vastgesteld 2026-09-11: geen filters op eigenschap bij onderdelen

De Wearparts-API kan het wél — `/articles` geeft facetten per eigenschap en
`filter[attr_100]=Vooras` werkt (meetreeks in @docs/api/WEARPARTS.md). Het
heeft een dag in de shop gestaan en is er bewust uit gehaald:

- de koppen zijn leveranciersjargon ("Schokdemper bevestigingstype: Oog
  bovenaan"), een keuze voor een monteur en niet voor wie een onderdeel voor
  zijn eigen auto zoekt — en de lijst past sowieso al op die auto;
- filteren verbergt artikelen die wél passen. Van 261 remblokken hebben er
  116 een `Inbouwplaats`; filteren op "Vooras" toont er 82 en laat de 145
  zonder waarde weg. Dat is ontbrekende fabrikantsdata, maar het leest als
  "meer is er niet".

**De eigenschappen blijven bij de artikelgegevens op de productpagina staan.**
Vergelijken kan dus nog steeds, voorselecteren niet.

### Uitzondering 2026-09-17: motorolie krijgt wél drie filters

De eigenaar vroeg om filters op **inhoud, merk en viscositeit** bij motorolie.
Dat botst met de regel hierboven, dus eerst gemeten of de twee bezwaren daar
ook gelden — vier auto's, 57 tot 389 flessen per auto:

| Filter | Bron | Dekking |
|---|---|---|
| Merk | `brandName` | 100% |
| Inhoud | `attr_423` "Inhoud [liter]" | 100% |
| Viscositeit | `attr_2467` + `attr_1054` | 99% |

**Geen van beide bezwaren houdt hier stand.** Het tweede (filteren verbergt
artikelen zonder waarde) verdwijnt bij honderd procent dekking. Het eerste
(leveranciersjargon) ook: 1 liter, 5W-30 en het merk staan letterlijk op de
fles die de klant in zijn hand heeft. En de nood is groter dan elders —
zonder filter liggen er 389 flessen door elkaar, van 1 liter tot een vat van
208 liter, en dan is er niet in te winkelen.

De regel blijft dus staan; motorolie is een gemeten uitzondering. Wil je er
een groep bij zetten, dan is de volgorde: eerst de dekking meten, dan pas het
id in `FILTERABLE_GROUPS` (`src/lib/catalog/part-filters.ts`).

**Het filteren gebeurt in de shop, niet bij de leverancier**, en dat is geen
luiheid. Viscositeit zit onder twee attribuut-ids waarvan er één niet in de
facetten voorkomt; filteren via de API laat die artikelen stil vallen (op één
auto 21 van de 297). Bijkomend voordeel: één ongefilterde vraag bedient élke
filtercombinatie, dus het kost geen extra verzoeken en de aantallen achter de
opties kloppen. Meetreeks in @docs/api/WEARPARTS.md.

### TERUGGEDRAAID 2026-09-21: filters bij onderdelen komen terug

De eigenaar kreeg de melding dat er op `/nl/onderdelen/oliefilter-543` en
`/nl/onderdelen/remschijf-569` geen filters meer stonden, en vroeg om merk en
passing (vooras/achteras) terug — **overal waar het kan**, niet alleen bij
motorolie. Dat draait de keuze van 2026-09-11 hierboven terug.

**Welke filters verschijnen bepaalt nu de data, niet een lijst met groep-ids.**
Een allowlist werkt niet: elk artikeltype heeft eigen attributen. De regels
staan in `usable()` in `src/lib/catalog/part-filters.ts`:

| Regel | Waarom |
|---|---|
| dekking ≥ 35% | Onder die grens is het leveranciersadministratie |
| alleen tekstwaarden | Getallen zijn maatvoering en horen bij de artikelgegevens |
| 2 tot 8 waarden | Eén optie filtert niets; meer is een lijst, geen keuze |
| merk en de bekende filters: geen bovengrens | Zie hieronder |

GEMETEN 2026-09-21 op carId 128598, en de grens valt precies in het gat:

| Remschijf (192 artikelen) | Dekking | Waarden | |
|---|---|---|---|
| Remschijftype | 100% | 5 | wel |
| Oppervlakte | 73% | 5 | wel |
| **Inbouwplaats** | **43%** | Vooras / Achteras | **wel** |
| Controleteken | 31% | 18 | niet |
| Remschijfdikte, Hoogte, Gewicht | 100–28% | getallen | niet |

**Het bezwaar van 2026-09-11 is niet verdwenen, het is zichtbaar gemaakt.**
Van 192 remschijven dragen er 82 een `Inbouwplaats`; wie op "Vooras" filtert
ziet er 42 en mist de 110 waarvoor de fabrikant het veld leeg liet. Elke
filtergroep telt nu hoeveel artikelen de eigenschap **niet** hebben
(`missingCount`) en het paneel zegt dat eronder: *"110 artikelen hebben dit
niet ingevuld en vallen weg als je hier filtert."* Verbergen doen we nog
steeds — anders filtert het filter niet — maar niet meer stilletjes.

Twee dingen die bij het bouwen bleken en allebei een regressie waren:

- **Merk viel weg.** GEMETEN: 124 oliefilters van 77 merken, 192 remschijven
  van 67 merken. Met een bovengrens van acht (en ook van veertig) verdween
  juist het filter waar de eigenaar als eerste om vroeg. Merk is geen
  eigenschap maar een naam en heeft daarom géén bovengrens — bij banden staan
  er 191 in de lijst.
- **"Inhoud" bij motorolie viel weg**, want die heeft elf waarden (1 tot 208
  liter). De filters die we bij naam kennen (viscositeit, inhoud) vallen nu
  ook buiten de bovengrens.

**Wat het kost, en wat dat weer oplost.** Elke onderdelencategorie haalt nu
300 artikelen op in plaats van 20, want zonder de hele lijst kloppen de
aantallen achter de filteropties niet. GEMETEN in het serverlog: zo'n antwoord
is 2,4 MB (motorolie) tot 4,0 MB (remblokken) — en **Next weigert alles boven
2 MB** ("items over 2MB can not be cached"). Elke paginaweergave haalde de
categorie dus opnieuw op, en juist filteren maakt veel weergaves: elke klik op
een optie is een nieuwe pagina.

Daarom houdt `wearparts-provider.ts` die lijsten vijf minuten in het geheugen
van de server, hoogstens drie categorieën tegelijk. GEMETEN op een koud
gestarte server: vier weergaven van dezelfde categorie met verschillende
filters kostten **één** call (5,8 s koud, daarna 0,7–1,0 s).

---

### GEVONDEN 2026-09-25: een groep-id van de leverancier is geen sleutel

De eigenaar meldde vier dingen die op één oorzaak bleken te staan: in "meest
gezocht" stond een tegel **"Onderdelen 81"** waar de accu hoorde, bougie en
schokdemper heetten "Ontstekingsspoel- /eenheid" en "Vering", er stonden
tegels `Filter` en `smeermiddelen` die naar een tussenscherm leiden in plaats
van naar artikelen, en de knoppen **Olie** en **Filters** in de header gaven
op zijn auto **pagina niet gevonden**.

`src/lib/catalog/quick-links.ts` hield elf `assemblyGroupNodeId`s vast, met de
aantekening dat die op drie auto's gemeten en identiek waren. Dat laatste
klopt nog steeds — het zijn dezelfde nummers voor elke auto — maar **ze wijzen
niet meer naar wat er stond**. GEMETEN 2026-09-25, tien van de elf zitten er
één naast:

| In de lijst | Wat daar vandaag staat | Waar de groep nu staat |
|---|---|---|
| 543 Oliefilter | `Filter` (hoofdgroep) | 544 |
| 544 Luchtfilter | `Oliefilter` | 545 |
| 546 Interieurfilter | `Brandstoffilter` | 547 |
| 568 Remblok | `Schijfrem` (hoofdgroep) | 569 |
| 569 Remschijf | `Remblok` | 570 |
| 1371 motorolie | `smeermiddelen` (hoofdgroep) | 1372 |
| 653 Batterij Accu | `Onderdelen` | 654 |
| 947 Wisserblad / Rubber | `Wisserbladen / Toebehoren` (hoofdgroep) | 948 |
| 634 Bougie | `Ontstekingsspoel- /eenheid` | 635 |
| 774 Schokdempers | `Vering` | 775 |
| 269 Distributieriem | `Distributieriem` | 269 — de enige die klopt |

**Waarom niemand het zag.** De boom staat een dag in de cache. Op een auto die
al eens bezocht was stond de oude nummering er nog en klopte het scherm; op
een verse auto sloeg alles één op. Zelfde carId (115566), zelfde sessie, twee
verschillende antwoorden — de pagina las de gecachte boom, de controle een
verse.

Dit is het gevaarlijke soort fout: er gaat niets stuk, er komt geen
foutmelding, de tegel wijst gewoon naar een ander onderdeel. Alleen de
hoofdgroepen vielen op, want die hebben geen telling en leiden naar een
tussenscherm.

**De regel die eruit volgt: een nummer van de leverancier is een verwijzing,
geen sleutel.** De rij wordt nu op naam opgezocht in de boom die we tóch al
ophalen (`POPULAR_PART_GROUPS`), dus het kost geen verzoek extra en hij kan
niet meer stilletjes verschuiven. Hetzelfde geldt voor de hoofdgroepen achter
Olie en Filters.

**Let op het verschil met `src/lib/admin/part-kinds.ts`.** Díe nummers zijn
`genericArticleId`s — het soort artikel, niet de plek in de boom — en die zijn
wél stabiel. De prijsregels en de kortingen op soort onderdeel (#14, #17)
raakt dit dus niet.

Meegenomen, want het was dezelfde rij: de vier filtersoorten en de drie
vloeistoffen staan er nu los in, op verzoek van de eigenaar. Op een VW Polo 6
zijn dat dertien tegels (oliefilter, luchtfilter, brandstoffilter,
interieurfilter, remblok, remschijf, motorolie, remvloeistof, koelvloeistof,
accu, wisserblad, bougie, schokdemper) en geen enkele leidt nog naar een
tussenscherm.

### Vastgesteld 2026-09-17: een productgroep is een link, geen menu

Banden, velgen en toebehoren klapten op drie plekken uit naar hun
categorieën: de tegels op de homepage, de knoppen in de headerrij en de
lade onderaan op mobiel. Winkelkeuze van de eigenaar: **weg ermee**, een klik
opent meteen de familiepagina — zoals Onderdelen dat altijd al deed.

Dat kost niets, want de categorieën stáán op die pagina als filterrij, met de
producten er meteen onder. Het paneel zette de klant voor een tweede keuze
terwijl hij er al één had gemaakt.

Twee dingen die eraan vastzitten:

- **Olie en Filters blijven wél menu's.** Hun subgroepen hangen aan de
  gekozen auto (een Citroën C3 heeft er zeven onder `Filter`, een McLaren
  720S twee) en bestaan niet als pagina; er valt dus niets om naar door te
  linken.
- **Het scheelt vier categorielijsten per paginaweergave.** De layout haalde
  ze voor élke pagina op, alleen om die panelen te kunnen vullen. Dat is er
  nu uit — de homepage is de drukste pagina van de winkel.

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

**Btw**: `ek` (inkoop) is **exclusief** btw, `evp` (advies) is **inclusief**
btw. Wij tellen 21% op bij wat uit de inkoopprijs volgt, en laten de
adviesprijs ongemoeid.

**RECHTGEZET 2026-09-19.** Hier stond sinds 2026-08-07 dat allebei exclusief
btw waren en dat de klant dat bevestigd had. Dat klopte maar half, en de
eigenaar ving het zelf: *"wil je bij Alzura controleren of hun prijzen al
incl. btw zijn? anders doen we 2 keer btw."* De shop telde er inderdaad
nogmaals 21% bij op, dus elke prijs zonder prijsregel stond 21% te hoog.

Bewijs is een schermafdruk van het platform met de prijsdetails open: "Uw
netto EC € 23,38" en "marge € 11,62 **netto**" aan de inkoopkant, en aan de
verkoopkant "€ 76,00 voor 2 stuks / € 152,00 voor 4 stuks" onder het
onderschrift **"Prijs incl. BTW"**. Die € 38,00 per stuk is precies wat de API
als `evp_3` teruggeeft en waar onze shop € 45,98 van maakte. Het artikel is
herkenbaar aan de inkoopprijs van € 20,39 — exact het bedrag dat met 10%
opslag uit de shop kwam. Meetreeks in docs/api/TYRE24.md.

Een marktvergelijking leek het eerder nog de andere kant op te wijzen (onze
€ 45,98 tegen € 47 bij de goedkoopste Nederlandse concurrent), maar die test
kan de twee gevallen niet scheiden: € 38,00 is óók een normale winkelprijs.
**Een plausibiliteitstoets is geen meting** — dat is de les die hier hoort.

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

**ACHTERHAALD 2026-09-19 zodra de eigenaar een prijsregel instelt — zie #17.**
Hij bepaalt de opslag op de inkoopprijs nu zelf, per groep. De regel hierboven
blijft wél het gedrag zolang er voor een artikel géén regel staat, en de
meting van 66–85% blijft de maatstaf waar zijn percentage tegen afgezet
wordt.

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

### Deelbesluit 2026-09-17: de autokiezer staat nu óók op /mijn-auto

De eigenaar merkte op dat er bij het zelf kiezen van een auto nergens een
auto-id in de URL verscheen, en vroeg of merk en model niet via ALZURA
opgehaald konden worden.

**Dat gebeurde al.** De kiezer in de hero loopt sinds 2026-09-07 door dezelfde
TecDoc-boom als de kentekenzoeker (`/manufacturers` → `/modelSeries` →
`/vehicles`) en levert een echte `carId` — nagekeken in de browser: na een
keuze staat er `/nl/onderdelen?auto=115566` in de links.

**Waar het wél misging: `/nl/mijn-auto`.** Die pagina is de landingsplek van
de merkenlijst in de voettekst (`?merk=Audi`) en had helemaal geen kiezer. Wie
daar binnenkwam kreeg alleen een zoekopdracht op naam — geen `carId`, dus geen
passendheidscontrole en niets in de URL waar de onderdelencatalogus iets mee
kan. Een doodlopende weg, precies de klacht.

De kentekenzoeker én de merk/model/uitvoering-kiezer staan er nu bovenaan. De
tekstzoekresultaten blijven eronder staan voor velgen en toebehoren: die
families draaien op de Products-API en kennen geen `carId`.

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

## 9. Beeldrechten categoriefoto's — OPEN — de winkel is inmiddels live

Het categorieraster op de homepage draait op foto's in `public/categorieen/`.
Ze zijn aangeleverd als `istockphoto-{id}-612x612.jpg` — het **gratis
previewformaat** van iStock, bedoeld om te bladeren, niet voor publicatie.
Getty/iStock treedt hier actief tegen op.

De bestanden zijn inmiddels hernoemd naar `banden.jpg` en dergelijke, dus aan
de naam is de herkomst niet meer te zien. Aan de afmetingen wél — GEMETEN
2026-09-12:

| Bestand | Formaat |
|---|---|
| `banden.jpg` | 612 × 408 |
| `onderdelen.jpg` | 612 × 398 |
| `toebehoren.jpg` | 612 × 408 |
| `velgen.jpg` | 452 × 445 (bijgesneden) |

Drie van de vier zijn nog exact 612 px breed. Dat is het previewformaat, dus
het probleem staat er nog.

**Dit stond hier als "vóór livegang" en dat moment is gepasseerd**: de winkel
draait sinds 2026-09-10 op caroparts.nl, met deze previews op de homepage. Het
is daarmee geen openstaande voorbereiding meer maar een lopend risico, en het
is het enige punt in dit bestand dat geld kan kosten zonder dat er iets stuk
gaat.

Vervangen door gelicentieerde versies, of door beeld van Pexels, Unsplash of
Pixabay (die staan commercieel gebruik toe). De code verandert niet mee; het
zijn alleen vier bestanden. Noteer de herkomst per foto in
`public/categorieen/BRONNEN.md`.

Het raster heeft nu vier tegels — één per familie — en alle vier hebben een
foto. De losse categoriefoto's die nergens meer gebruikt werden (filters,
motor, remmen, verlichting, gereedschap, gebruikte onderdelen) zijn
2026-09-07 verwijderd. Een tegel toevoegen is één regel in
`src/lib/catalog/category-tiles.ts` plus een bestand.

### Beeld bij de onderdeelgroepen: eigen tekeningen — VASTGESTELD 2026-09-17

De eigenaar vroeg om een foto per categorie in de rij "meest gezocht". Die
bestaat niet: GEMETEN 2026-09-07 en opnieuw 2026-09-17 dragen **alleen de 33
hoofdgroepen** een `icon` van de leverancier; eindgroepen als Oliefilter,
Remblok, motorolie en Accu geen enkele.

Elf foto's inkopen zou elf licenties vragen, en dit punt staat hierboven juist
open omdat er al een licentieprobleem ligt. Daarom **lijntekeningen in
`currentColor`** (`src/components/catalog/group-icon.tsx`): eigen werk, dus
geen rechtenvraag, één bestand voor beide thema's, en leesbaar op de 24 pixels
die zo'n rij ervoor heeft — een foto van een remblok is op dat formaat een
grijze vlek. Een groep zonder tekening valt terug op de moer uit het
merkteken, zodat de rijen uitgelijnd blijven.

Wil de eigenaar er alsnog foto's in, dan is dat één map met bestanden en één
component; de keuze hierboven over beeldrechten geldt dan onverkort.

---

## 2. Hosting — VASTGESTELD 2026-09-10: Hostinger

De winkel draait bij Hostinger, waar ook de mailbox `info@caroparts.nl` staat.
Daarmee vervalt de afweging Vercel versus VPS, en dat heeft één concreet
gevolg: **er is een schijf die blijft bestaan.** De orderopslag (#10) kan
daardoor blijven zoals hij is; op Vercel had er eerst een database onder
gemoeten.

Nog uit te zoeken bij de eerste echte deploy: bewaart het platform bestanden
die de app zelf wegschrijft over een nieuwe deploy heen? Bij een VPS wel, bij
een beheerd Node-pakket wordt de projectmap vaak vervangen. Zet
`ORDER_DATA_DIR` daarom op een pad **buiten** de projectmap — bijvoorbeeld
`/home/<gebruiker>/caro-orders` — dan staat het antwoord op die vraag los van
de bestellingen.

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
| `SMTP_*` (vier) | Contactformulier en orderbevestiging | Geen mail, en bestellen wordt geweigerd |
| `MOLLIE_API_KEY` | Betalingen (#10) | Checkout meldt dat betalen niet kan |
| `ORDER_ADMIN_EMAIL` | Waar de inkoopmail heen gaat | Valt terug op het adres in `src/lib/company.ts` |
| `ORDER_DATA_DIR` | Waar bestellingen bewaard worden | Komt in `<project>/.data/orders` — een nieuwe deploy neemt ze mee in de opruiming (#10) |

Optioneel: `CARO_MIN_MARGIN_PERCENT` en `CARO_USE_RECOMMENDED_PRICE` (#5),
`TYRE24_BASE_URL_NL`/`_DE` als noodknop. `TYRE24_ALLOYS_TOKEN` wordt nog
nergens gelezen (fase 6).

Het automatisch invullen van het adres (#11) heeft **geen** variabele: die
dienst vraagt geen sleutel. Valt hij weg, dan vult de klant straat en plaats
zelf in en gaat de bestelling gewoon door.

Twee dingen die misgaan als je ze niet weet:

- **Zet ze in élke omgeving die je draait**, niet alleen in productie. Een
  test- of previewomgeving zonder tokens draait op mockdata en ziet er
  compleet uit.
- **Een env-wijziging werkt niet door in een bestaande build.** Na het
  toevoegen opnieuw bouwen en herstarten.

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

**Bedrijfs-e-mailadres vastgesteld 2026-09-09: `info@caroparts.nl`.** Dat is
tegelijk de mailbox waar het contactformulier op uitkomt (`src/lib/mail.ts`,
vier `SMTP_*`-variabelen in `.env`).

**Bewust géén telefoonnummer.** Art. 6:230m BW vraagt om een doeltreffend
communicatiemiddel, niet om een telefoonlijn; het e-mailadres plus het
contactformulier voldoen daaraan. Een nummer publiceren dat niet wordt
opgenomen is slechter dan geen nummer. Komt er later wel een, dan is het één
veld in `src/lib/company.ts` en één rij in `components/company-details.tsx`.

**Zakelijke rekening ingevuld 2026-09-10:** `NL37 KNAB 0775 4708 80`, staat in
`src/lib/company.ts` en daarmee op de orderbevestiging. Mollie bleek hem niet
nodig te hebben — die rekening zit in hun eigen onboarding. Wat een échte
factuur nu nog mist is alleen het oplopende factuurnummer (#10).

De melding "een paar gegevens ontbreken nog" en de testwaarschuwing op de
orderbevestiging zijn 2026-09-09 weggehaald. Ze keken naar élke placeholder in
`COMPANY`, terwijl alles wat een klant te zien krijgt inmiddels bekend is; het
enige ontbrekende veld staat nergens in de winkel. Ontbreekt een waarde toch,
dan valt die regel gewoon weg (`companyValue()`) in plaats van dat er
"volgt nog" komt te staan.

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

### Bestellen is technisch vrij — GEMETEN 2026-09-10

De overeenkomstenvraag die hierboven bij #7 als open stond, is beantwoord:
`agreementNeeded` staat alleen op `true` bij area 3, die we niet gebruiken.
Voor banden, velgen, toebehoren én onderdelen geeft `GET /order` een complete
offerte terug op het echte account (bewijs in TYRE24.md en WEARPARTS.md).
`POST /order` is bewust nooit aangeroepen: dat plaatst een echte bestelling.

### Annuleren kan tien minuten — bedrijfsrisico

De ALZURA API-B2B (docs/api/ALZURA-B2B.md) laat een inkooporder alleen binnen
**tien minuten** annuleren, en alleen als de groothandel dat toestaat. Onze
klant heeft **veertien dagen** bedenktijd.

Zegt een klant op dag drie af, dan zit de inkoop er al. Dat wordt dan een
retour bij de groothandel, onder díens voorwaarden — met mogelijk
retourkosten of een artikel dat helemaal niet retour mag. Dat verschil is voor
onze rekening.

Twee dingen om vóór livegang te beslissen:

1. Wachten we met inkopen tot de bedenktijd voorbij is? Dat kan niet: dan duurt
   levering meer dan twee weken.
2. Nemen we het verschil voor lief, of beperken we het assortiment tot
   artikelen die de groothandel wél terugneemt? Dat laatste vraagt gegevens die
   we nu niet hebben.

Voorlopig: de eigenaar bestelt met de hand in, dus hij ziet elk geval
afzonderlijk. Zodra dat geautomatiseerd wordt is dit een blokkade.

---

## 10. Betaling en orderopslag — VASTGESTELD 2026-09-10

De klant bestelt en betaalt via Mollie. Is de betaling bevestigd, dan gaan er
twee mails uit met dezelfde PDF: één naar de klant als bevestiging en één naar
de beheerder. **De beheerder koopt de artikelen met de hand in bij de
groothandel.** Dat is bewust: bij dit volume ziet hij elke bestelling langs,
en dat is precies wat besluit #4 vraagt zolang de annuleertermijn van tien
minuten tegenover veertien dagen bedenktijd staat. Wordt het drukker, dan gaat
de inkoop alsnog via `POST /order` — de gegevens die daarvoor nodig zijn
(artikel-id en familie per regel) worden nu al bij de bestelling bewaard.

### Mollie zonder eigen client-library

`@mollie/api-client` is niet toegevoegd. Er worden drie dingen gedaan —
betaling aanmaken, status opvragen, webhook afhandelen — en dat past in
`src/lib/mollie/client.ts` met `fetch`. Eén bestand vervangen is genoeg als dat
ooit anders moet.

### De terugkeer van de klant is geen bewijs van betaling

De `redirectUrl` van Mollie wordt ook geopend door een klant die het
betaalscherm afbreekt, en de URL is te typen. Alleen de **webhook** telt, en
zelfs die draagt niets meer dan een betaal-id: de status wordt altijd bij
Mollie opgehaald met onze eigen sleutel.

De terugkeerpagina roept dezelfde afhandeling aan als de webhook
(`lib/orders/settle.ts`), om twee redenen: de klant ziet meteen de juiste
status, en op een ontwikkelmachine kan Mollie geen webhook bezorgen — localhost
is niet publiek bereikbaar. Dubbele bevestigingsmails worden voorkomen door
`notifiedAt` op de bestelling plus een slot per proces.

### Orders als JSON-bestand — bewust tijdelijk

Bestellingen staan als JSON in `.data/orders/` (`src/lib/orders/store.ts`), niet
in PostgreSQL. Wat de opslag moet kunnen is een bestelling terugvinden als
Mollie zich meldt en onthouden dat de mails eruit zijn; een ORM met migraties
voegt daar bij dit volume niets aan toe.

**Dit werkt alleen op één server met een schijf die blijft bestaan.** Dat is
sinds 2026-09-10 het geval: de winkel draait bij Hostinger (#2). Op een
serverless platform als Vercel was het bestandssysteem per aanroep leeg geweest
en was de bestelling tussen het aanmaken en de webhook verdwenen.

Twee dingen om bij de deploy op te letten:

- Zet `ORDER_DATA_DIR` op een pad **buiten** de projectmap, zodat een nieuwe
  deploy de bestellingen niet meeneemt in de opruiming.
- Die map hoort in de back-up. Er staan NAW-gegevens in en het is de enige
  plek waar een bestelling volledig staat.

Moet het later toch een database worden, dan raakt dat alleen `store.ts`: de
rest van de code praat uitsluitend met `saveOrder`, `readOrder` en
`updateOrder`.

**Dat moment is in zicht.** Het beheerpaneel (#12) vraagt een factuurnummer, een
teller op kortingscodes en een mailinglijst, en die drie hebben alle drie iets
nodig wat een bestand niet kan: een transactie. Zie #13.

De map bevat NAW-gegevens en staat daarom in `.gitignore`, buiten `public/`.

### Wat nog niet klopt voor de boekhouding

Het kenmerk op de PDF (`CARO-20260910-4K2P`) is géén factuurnummer. Een
NL-factuur vraagt een aaneengesloten oplopende reeks, en die ontstaat pas in
een database. Zolang dat er niet is heet het document "orderbevestiging" en
niet "factuur". Ook de IBAN in `src/lib/company.ts` staat nog op een
plaatshouder; die regel valt daardoor van het document af.

---

## 11. Adres automatisch invullen — VASTGESTELD 2026-09-12

De klant typt postcode en huisnummer; straat en plaats worden opgezocht bij
**gratis-postcodedata.nl** (BAG-data van het Kadaster, CC0). Geen registratie,
geen sleutel, geen contract — meetreeks en valkuilen in docs/api/POSTCODE.md.

Drie dingen die bij die keuze horen:

- **Het is een gemak, geen voorwaarde.** Gratis dienst zonder uptimegarantie,
  dus elke fout eindigt in "niet gevonden" en dan vult de klant de twee velden
  gewoon zelf. Een checkout die vastloopt omdat een adressendienst offline is,
  is erger dan een checkout zonder automatisch invullen.
- **De vraag loopt via onze server**, niet vanuit de browser. Anders geeft de
  klant zijn IP-adres én zijn adres af aan een partij waar hij niets mee te
  maken heeft. Zelfde regel als bij het kenteken.
- **Er komt een partij bij die gegevens ontvangt**, dus de privacyverklaring
  moest mee. Daarbij bleek Mollie er nooit in te hebben gestaan — die pagina
  dateerde van vóór de betaalkoppeling. Beide staan er nu in.

Alleen Nederland. Het land ligt in de checkout vast op NL, dus dat valt nu
samen; komt er een tweede land bij, dan moet de opzoekactie overgeslagen worden
in plaats van een foutmelding te tonen.

---

## 12. Beheerpaneel — GEDEELTELIJK VASTGESTELD 2026-09-14

De eigenaar wil een afgeschermd paneel waarin hij vijf dingen kan: het aantal
bestellingen zien, de facturatie bekijken, artikelen in de korting zetten met
een eigen percentage, kortingscodes maken met een minimum bestedingsbedrag, en
met één klik een aanbiedingsmail sturen aan zijn klanten.

**Beslist 2026-09-14 door de eigenaar:**

| Vraag | Antwoord |
|---|---|
| Inloggen | Een **eigen inlogpagina**, geen browserpopup |
| Facturatie | **Allebei**: een factuurdocument per bestelling én een omzetoverzicht |
| Opslag | Er komt een database (#13) |
| Kortingen | Zie #14 — vier keuzes gemaakt |
| Reclamemail | **Geparkeerd** (#15) |
| Tweestapsverificatie | Nog open — de eigenaar vroeg wat het kost; antwoord staat hieronder |

Eén ding vooraf, want het scheelt een verkeerde verwachting: **vier van de vijf
kunnen vandaag niet gebouwd worden zonder eerst iets anders op te lossen.**

| Wens | Wat het nodig heeft | Kan dat nu? |
|---|---|---|
| Aantal orders zien | een lijstfunctie over `.data/orders` + een inlog | **ja**, zodra er een inlog is |
| Facturatie bekijken | doorlopend factuurnummer, zeven jaar bewaren | nee — een nummerreeks vraagt een transactie (#13) |
| Artikel in de korting | kortingsregel per artikel, marge-ondergrens, 30-dagenprijs | nee — vraagt opslag én prijsgeschiedenis (#14) |
| Kortingscode | code met teller, server-side gekeurd | nee — de teller vraagt een transactie (#13) |
| Mailadressen + aanbiedingsmail | toestemming, uitschrijflink, aparte verzenddienst | nee — en dit raakt de bezorging van de orderbevestiging (#15) |

### Toegang: dit is de eerste inlog van de hele winkel

Er zit nu **nergens** authenticatie in de code. Het paneel is dus niet "een
pagina erbij" maar een nieuw stuk beveiliging, en het kan straks prijzen
veranderen en alle klanten mailen. Fout hierin is duurder dan waar ook.

| Optie | Voordeel | Nadeel |
|---|---|---|
| **GEKOZEN — eigen inlogpagina + ondertekende cookie** | Klein en te overzien: één wachtwoordhash in `.env`, `timingSafeEqual`, HttpOnly-cookie. Geen library. Een echte pagina in de huisstijl, met uitloggen | Zelf bouwen aan beveiliging; sessies intrekken en wachtwoord herstellen moeten we zelf bedenken |
| Auth-library (Auth.js, better-auth) | Doordacht, meer gebruikers en 2FA later makkelijk | Een library erbij, en dat vraagt toestemming (CLAUDE.md). Zwaar voor één gebruiker |
| HTTP Basic bij de hostingpartij | Kost geen regel code | Lelijke browserpopup, geen uitloggen, wachtwoord bij elke aanvraag mee |

Wat er hoe dan ook bij hoort: `noindex` en uit `app/sitemap.ts`, **buiten**
`[locale]` (een beheerpaneel hoeft niet tweetalig), een limiet op
inlogpogingen, en het wachtwoord alleen als hash in `.env` — nooit in de repo.

### Tweestapsverificatie: kost geen geld, wel werk

De eigenaar vroeg of 2FA geld kost. Dat hangt van de vorm af:

| Vorm | Kosten | Oordeel |
|---|---|---|
| **Code uit een app** (Google Authenticator, Authy, 1Password) | **€ 0** — het is een open standaard (TOTP, RFC 6238), en de rekensom staat in Node zelf (`node:crypto`, HMAC-SHA1). Geen dienst, geen abonnement, geen account | Dit is wat we zouden bouwen |
| Code per sms | Per bericht, via een sms-dienst | Onnodig, en sms is de zwakste van de drie |
| Passkey / vingerafdruk | € 0, maar een zwaardere bouw (WebAuthn) | Later, als er meer gebruikers komen |

Wat het wél kost is werk: een geheim aanmaken, dat één keer tonen zodat je het
in je telefoon zet, en bij het inloggen zes cijfers extra controleren. Plus
**herstelcodes**, want een verloren telefoon zonder herstelcode sluit je
permanent buiten je eigen winkel.

**Advies: doen.** Dit scherm kan prijzen veranderen en straks de klantenlijst
raken; een uitgelekt wachtwoord is dan genoeg om schade aan te richten.

### Waar het paneel niet over gaat

Inkopen bij de groothandel blijft handwerk (#4). `POST /order` plaatst een
echte, factureerbare bestelling en hoort niet achter een knop in een paneel dat
verder over kortingen gaat.

### Facturatie: allebei — VASTGESTELD 2026-09-14

Het worden twee schermen, want het zijn twee verschillende dingen:

1. **Per bestelling een factuurdocument** dat je kunt openen en opsturen. Het
   ontbrekende stuk is het doorlopende factuurnummer (#10 noemt dat al); daarmee
   gaat het document van "orderbevestiging" naar "factuur".
2. **Een omzetoverzicht** voor de boekhouding: wat is er deze maand
   binnengekomen, hoeveel btw zit erin, wat is er per bestelling verkocht.

Twee dingen die bij keuze 1 horen en die je niet terug kunt draaien:

- **Een factuurnummer is voor altijd.** Zodra er een factuur met nummer 1 de
  deur uit is, moet de reeks aaneengesloten blijven — ook als een bestelling
  later geannuleerd wordt. Een geannuleerde factuur verdwijnt niet, die krijgt
  een creditfactuur met een eigen nummer.
- **Zeven jaar bewaren** (fiscale bewaarplicht). Dat is meteen het antwoord op
  een vraag die nog nergens beantwoord was: hoe lang bewaren we bestellingen?
  Voor de factuurgegevens is dat dus zeven jaar, en niet korter.

De bestellingen die er nu al liggen krijgen géén factuurnummer met terugwerkende
kracht. De reeks begint bij de eerste bestelling ná de invoering; alles daarvóór
houdt zijn kenmerk `CARO-…` en blijft een orderbevestiging.

---

## 19. Rollen in het beheerpaneel — VASTGESTELD 2026-09-21

Tot nu toe gaf elke uitnodiging volledige toegang. De eigenaar wil dat kunnen
beperken: *"voor boekhouder alleen toegang tot omzet data en facturatie, een
marketing medewerker krijgt alleen toegang tot beoordelingen."*

**Drie vaste rollen, geen vinkjes per persoon.** Ook zijn keuze. Vinkjes
klinken flexibeler maar leveren combinaties op die niemand nodig heeft en die
niemand test — "mag prijzen wijzigen maar geen facturen zien" is geen functie,
dat is een ongeluk.

| | Eigenaar | Boekhouder | Marketing |
|---|---|---|---|
| Bestellingen + klantgegevens | ✓ | | |
| Facturen en omzet | ✓ | ✓ | |
| Prijzen | ✓ | | |
| Kortingen en kortingscodes | ✓ | | ✓ |
| Beoordelingen | ✓ | | ✓ |
| Beheerders | ✓ | | |

De matrix staat op één plek: `src/lib/admin/roles.ts`. Dat bestand praat geen
database aan, zodat ook een client component hem mag importeren (#17).

### Drie dingen die niet onderhandelbaar zijn

1. **Prijzen en Beheerders blijven bij de eigenaar.** Het eerste zet in één
   formulier de verkoopprijs van de hele winkel om; het tweede kan rechten
   uitdelen en daarmee élk ander recht.
2. **De laatste eigenaar blijft staan.** `setAdminRole()` en `disableAdmin()`
   weigeren allebei zodra het de laatste actieve eigenaar zou zijn. Zonder dat
   kan de eigenaar zichzelf tot boekhouder maken en is het paneel alleen nog
   met toegang tot de database te repareren.
3. **De rol zit op de rij, niet in de sessie.** `currentAdmin()` leest de
   beheerder elke keer opnieuw, dus een gewijzigde rol geldt meteen — ook in
   een tabblad dat al open stond.

### Waar klantgegevens heen mogen (AVG)

Gekozen: *alleen wie het nodig heeft*. De bestellijst met naam, adres en
mailadres is voor de eigenaar. De boekhouder ziet die gegevens alsnog — ze
staan op de factuur — maar via zijn eigen scherm en met een grondslag erachter.
Marketing ziet ze nergens.

Dat is ook in de code zo: het dashboard **haalt** de bestellingen niet op voor
wie ze niet mag zien. Afschermen in de weergave en niet ophalen zijn twee
verschillende dingen.

### Twee gaten die bij het testen bovenkwamen

**De factuur-PDF toetste alleen of je ingelogd was.** `/beheer/facturen/
<nummer>/pdf` is een route handler zonder layout eromheen, en factuurnummers
lopen op (`2026-0001`). Een marketingmedewerker had de hele klantenlijst
kunnen binnenhalen door te tellen, terwijl hij de facturenpagina niet eens mag
openen. Nu 403.

**`findAdminById()` haalde de nieuwe kolom niet op.** De SELECT noemt zijn
kolommen met de hand, en `queryOne<AdminRow>` is een cast en geen controle —
dus TypeScript zweeg. Iedereen werd stilletjes marketing, ook de eigenaar.
GEMETEN: boekhouder en marketing gaven exact dezelfde antwoorden op alle zeven
schermen. De terugval op de minste rechten was goed gekozen (fail closed), maar
hij was stil; hij logt nu een fout.

### Hoe het getest is

Twee tijdelijke sessies rechtstreeks in de database gezet (geen wachtwoorden),
alle schermen opgevraagd, daarna de rijen weer verwijderd:

| Pad | Boekhouder | Marketing |
|---|---|---|
| `/beheer` | 200 | 200 |
| `/beheer/facturen` | 200 | 307 |
| `/beheer/prijzen` | 307 | 307 |
| `/beheer/kortingen` | 307 | 200 |
| `/beheer/kortingscodes` | 307 | 200 |
| `/beheer/beoordelingen` | 307 | 200 |
| `/beheer/beheerders` | 307 | 307 |
| factuur-PDF | 200 | **403** |

Plus een telling over élke Server Action onder `/beheer`: alle acties die een
controle nodig hebben, hebben er één. De vier zonder controle zijn inloggen,
uitloggen, de eerste beheerder aanmaken en een uitnodiging accepteren — die
draaien per definitie vóór er een sessie is.

---

## 13. Opslag: MySQL — VASTGESTELD 2026-09-16

Tot nu toe stonden bestellingen als JSON-bestand en was dat verdedigbaar (#10):
wat de opslag moest kunnen was een bestelling terugvinden en onthouden dat de
mail eruit was. Dat argument houdt geen stand meer zodra het paneel erbij komt.
Drie dingen uit #12 vragen iets wat een bestand niet kan:

- **Een factuurnummerreeks moet aaneengesloten en uniek zijn.** Twee
  bestellingen tegelijk mogen nooit hetzelfde nummer krijgen, en er mag geen gat
  vallen. `store.ts` zegt zelf al: "dit is geen slot".
- **De teller van een kortingscode** ("nog vijftig keer geldig") heeft precies
  hetzelfde probleem, met geld eraan vast.
- **De mailinglijst** moet doorzoekbaar zijn en per adres onthouden of iemand
  zich heeft uitgeschreven. Dat mag geen map met bestandjes worden waar één
  mislukte schrijfactie een uitschrijving laat verdwijnen — dat is een
  AVG-overtreding, geen bugje.

Fase 4 stond al in CLAUDE.md als "PostgreSQL + Prisma". Dat is nooit tegen een
alternatief afgewogen; het volume-argument uit #10 geldt nog steeds.

**BESLOTEN 2026-09-14: er komt een database.** Welke, dat hangt aan één ding dat
we nog niet weten — zie de blokkade hieronder.

Het pakket is **Unlimited Web Hosting** van Hostinger, dus gedeelde hosting en
geen eigen server. In het paneel staan **Supabase** en **MongoDB Atlas** als
koppeling. Dat verandert de keuzelijst:

| Optie | Voordeel | Nadeel |
|---|---|---|
| **GEKOZEN — MySQL** (zit bij het pakket) | Zit er al bij, geen extra dienst, geen derde partij. InnoDB geeft transacties, en dat is het enige wat we misten | Ouder gereedschap dan Postgres |
| Supabase (gehoste PostgreSQL) | Echte Postgres, precies wat fase 4 bedoelde | Aanmaken lukte niet (`Unrecognized client_id`). En het zet klantgegevens bij een derde: EU-regio, verwerkersovereenkomst, privacyverklaring bijwerken |
| SQLite (bestand naast de bestellingen) | Geen tweede dienst, geen wachtwoorden, geen netwerk. Snelst | Staat of valt met een schijf die een deploy overleeft — en dat weten we niet |
| MongoDB Atlas | — | **Afgeraden.** Een documentdatabase voor bedragen, factuurreeksen en tellers vraagt om precies de problemen die we juist willen oplossen. Orders, regels en codes zijn tabellen met verbanden; dat is een SQL-vorm |

### De blokkade: blijft de schijf bestaan over een deploy heen?

Dit stond al als vraag in #2 en is nooit beantwoord. Het is nu dringend, en om
twee redenen tegelijk:

1. Het bepaalt of SQLite kan.
2. **Het raakt de bestellingen die er nu al liggen.** Die staan als JSON-bestand
   in `.data/orders`. Wordt de projectmap bij een deploy vervangen, dan zijn ze
   weg — met NAW-gegevens en al, en dat is de enige plek waar een bestelling
   volledig staat. `ORDER_DATA_DIR` op een pad búiten de projectmap zetten is
   daar de afspraak voor (#10), en het is het controleren waard of dat er ook
   echt staat.

**Uit te zoeken**: staat `ORDER_DATA_DIR` op de server ingevuld, en overleeft
een bestand op dat pad een nieuwe deploy?

### VASTGESTELD 2026-09-16: MySQL bij Hostinger

Supabase is geprobeerd en strandde op `{"message":"Unrecognized client_id"}` bij
het aanmaken van een project. Niet verder uitgezocht, want de hostingpartij
biedt zelf een MySQL-database aan en die is er meteen.

**Dat is geen concessie.** Alles wat deze wensen vragen kan MySQL met InnoDB:
transacties, een unieke sleutel voor "deze code is al door dit adres gebruikt",
en een aaneengesloten factuurreeks. Bovendien vervalt er een partij: geen
gegevens bij een derde, dus ook geen verwerkersovereenkomst en geen extra regel
in de privacyverklaring.

Twee dingen om bij het bouwen niet te vergeten:

- **Gebruik geen `AUTO_INCREMENT` voor het factuurnummer.** Die laat gaten
  vallen zodra een transactie terugdraait, en een factuurreeks moet
  aaneengesloten zijn. Het nummer komt uit een tellerrij die met
  `SELECT … FOR UPDATE` binnen de transactie wordt opgehoogd.
- **De winkel verbindt via `localhost`, niet via Remote MySQL.** De app draait
  op hetzelfde Hostinger-account als de database; dan hoeft er niets over het
  internet. Remote MySQL is er voor verbindingen van búiten (een laptop, een
  andere server) en vraagt om een IP-adres op de witte lijst.

  **Zet daar nooit `%` neer.** Dat betekent "vanaf elk IP-adres ter wereld" en
  zet je database met alleen een wachtwoord ervoor op het open internet. Voor
  ontwikkelen zet je tijdelijk je eigen IP op de lijst, of je draait een MySQL
  op je eigen machine.

### Twee dingen die bij het bouwen misgingen — GEVONDEN 2026-09-20

**`next build` mag de database nooit nódig hebben.** De eigenaar wisselde van
wifi, zijn IP stond niet meer op de witte lijst, en de build viel om met
`Error occurred prerendering page "/en"`. Alle databaselezers van de winkel
vingen dat netjes af — behalve het gemiddelde van de beoordelingen, en dat
strookje staat op de homepage, die wordt voorgerenderd. Één uitzondering daar
nekt dus de hele build. `publishedReviews()` en `reviewSummary()` vangen hem
nu af, net als de kortingsregels: geen database betekent geen beoordelingen,
geen kapotte winkel.

De regel die eruit volgt: **elke lezer die op een voorgerenderde pagina
terechtkomt valt terug op leeg.** Schrijvers niet — die horen luid te falen.

**Een verbinding op afstand gaat altijd over IPv4.** In hetzelfde logboek stond
dezelfde laptop één keer als `77.173.210.20` en één keer als
`2a02:a46e:...`: Node koos per verbinding tussen het A- en het AAAA-record.
De witte lijst van Remote MySQL kent alleen IPv4, dus dat tweede adres kan er
nooit op staan — en de "Access denied" kwam en ging daardoor willekeurig.
`src/lib/db/client.ts` en `scripts/check-db.mjs` dwingen nu `family: 4` af
zodra de host niet `localhost` is. Op de server zelf verandert er niets.

De vraag over de schijf hierboven blijft staan, maar hij blokkeert niets meer:
de bestellingen verhuizen naar de database en die staat niet in de projectmap.

### Hoe dan ook

De bestaande bestellingen moeten mee: `.data/orders/*.json` inlezen en
wegschrijven. Dat is een eenmalig script, geen handwerk.

En de opzet van `store.ts` blijft: alle databasecode achter functies, zodat de
rest van de winkel niet weet waar de gegevens staan. Dan is wisselen van
Supabase naar SQLite (of andersom) een migratie en geen herbouw.

---

## 14. Kortingen en kortingscodes — GROTENDEELS VASTGESTELD 2026-09-14

### Waar een korting toegepast moet worden

Niet in de componenten. Prijzen komen bij elke paginaweergave vers uit de
catalogus en worden in `src/lib/pricing.ts` berekend; een korting die alleen op
de productpagina staat maar niet in het bedrag dat naar Mollie gaat, is een
prijsfout die geld kost.

**De korting hoort in de adapter, vlak achter `consumerPriceCents()`.** Daar is
de inkoopprijs nog in beeld — `Part` draagt alleen `priceCents` en verder niets
over inkoop, dus buiten de adapter is de ondergrens niet meer te berekenen. Eén
plek aanpassen dekt dan meteen de productkaart, de productpagina, de
zoekfunctie, de winkelwagen én het orderdocument.

`Part` heeft er een veld bij nodig voor de oude prijs (de doorgestreepte
"van"-prijs). Dat is een wijziging in `src/lib/catalog/types.ts` — de route die
CLAUDE.md daarvoor voorschrijft, niet een los veld erbij verzinnen.

### Twee dingen die geld of een boete kosten als ze fout gaan

**De ondergrens mag niet doorbroken worden. BESLIST: weigeren.**
`consumerPriceCents()` garandeert nu minimaal 25% marge op de inkoopprijs. Zet
de eigenaar er 40% korting op een artikel waar de adviesprijs toevallig dicht op
de inkoop ligt, dan verkoopt hij met verlies zonder dat iets hem tegenhoudt.

Het paneel **weigert** zo'n percentage en zegt erbij wat er wél kan ("maximaal
18% op dit artikel"). Bewust niet stilletjes afkappen: dan staat er 40% in het
paneel terwijl de klant 18% ziet, en dat verschil merk je pas als je je omzet
narekent.

Let op het gevolg voor een korting op een hele categorie: bij honderd artikelen
tegelijk zullen er altijd een paar onder de grens vallen. Het paneel moet die
dus kunnen aanwijzen ("94 artikelen aangepast, 6 overgeslagen omdat de marge te
krap is") en niet de hele actie weigeren.

**"Van € 100 voor € 80" mag niet zomaar. BESLIST: we houden prijsgeschiedenis
bij.** Sinds de Omnibus-richtlijn (in NL het Besluit prijsaanduiding producten,
de ACM handhaaft erop) moet bij een aangekondigde prijsverlaging de **laagste
prijs van de afgelopen dertig dagen** vermeld worden — niet de prijs van
gisteren. Onze prijzen volgen een leveranciersfeed die beweegt, dus die laagste
prijs weten we alleen als we hem bijhouden.

Wat dat concreet betekent:

- Eén keer per dag de prijs per artikel wegschrijven, met datum. Alleen van
  artikelen die we tonen, niet van de hele catalogus — dat zijn er miljoenen.
- De doorgestreepte prijs op de kaart is dan **de laagste prijs van de
  afgelopen dertig dagen**, niet de adviesprijs van vandaag. Dat is precies
  waar de wet om vraagt en het is ook het eerlijkste getal.
- **De eerste dertig dagen na invoering is er nog geen geschiedenis.** Tot die
  gevuld is tonen we geen doorgestreepte prijs, alleen de nieuwe. Anders staat
  er een "van"-prijs die we niet kunnen onderbouwen.

### Wat die prijsgeschiedenis kost — GEMETEN 2026-09-16

De eigenaar vroeg of dit niet te veel opslag en te veel API-verzoeken kost.
Twee metingen op het echte account, en de uitkomst is geruststellend zolang we
één regel aanhouden.

**Een API-verzoek draagt honderden prijzen tegelijk.** Gemeten op remblokken
voor carId 128136 (groep 568):

| `limit` | Teruggekregen | Tijd |
|---|---|---|
| 100 | 100 van 261 | 1,1 s |
| 300 | **261 van 261** | 2,4 s |
| 500 | 261 (alles) | 1,0 s |
| 1000 | 261 (alles) | 1,3 s |

Er zit geen plafond op dat we raken: een hele categorie komt in één verzoek
binnen. Een actie van vijfhonderd artikelen kost dus een handvol verzoeken per
dag, niet vijfhonderd — op een limiet van 100 per minuut voor de hele winkel.

**Eén artikel per verzoek opvragen kan níet gebundeld worden.** Ook gemeten:

| Zoekopdracht | `numFound` |
|---|---|
| `search=ID<a>` | 1 |
| `search=ID<a>,ID<b>,ID<c>` (komma) | **0** |
| `search=ID<a> ID<b> ID<c>` (spatie) | **0** |

De dagelijkse opfrisbeurt moet dus **per categorie** lopen, met een hoge
`limit`, en niet artikel voor artikel. Dat scheelt een factor honderd.

**De opslag is verwaarloosbaar.** Een regel is een artikel-id, een datum en een
bedrag: ruim honderd bytes met index en al.

| Wat | Rekensom | Opslag |
|---|---|---|
| 500 artikelen in de aanbieding, 40 dagen bewaard | 20.000 regels | ~2 MB |
| 5.000 artikelen, 40 dagen | 200.000 regels | ~20 MB |
| De zes bestellingen die er nu liggen | gemeten: 2.086 bytes per stuk | 1.000 bestellingen ≈ 2 MB |

Dat blijft ook zo: regels ouder dan veertig dagen gaan weg, want we hebben er
dertig nodig. Het groeit dus niet door. Ter vergelijking: de gratis laag van
Supabase is een halve gigabyte (controleer dat zelf even, tarieven veranderen).

**De regel die dit alles draagt: nooit de hele catalogus opslaan.** De
leverancier heeft er miljoenen; `remschijf` alleen al geeft 7.127 treffers.
Bijhouden doen we uitsluitend voor artikelen die in een actie zitten of er kort
geleden in zaten. De wet vraagt de dertigdagenprijs alleen bij een *aangekondigde
verlaging* — geen actie, geen verplichting, dus ook geen reden om iets te bewaren.

Nog zuiniger kan: **alleen wegschrijven als de prijs verandert.** De
leveranciersprijzen bewegen niet elke dag, dus dat scheelt het merendeel van de
regels zonder dat het antwoord verandert.

### En de gewone bezoeker? Die kost geen extra verzoek

Belangrijk om apart te noemen, want het is de helft van de zorg: **een korting
tonen kost geen enkele API-call extra.** De kortingsregels staan in ónze
database, niet bij de leverancier. De productpagina haalt het artikel toch al
op; er gaat alleen een percentage overheen.

Die regels zijn bovendien klein en veranderen zelden, dus ze passen in het
geheugen van de server met een verversing van een minuut. Dat maakt ook het
lezen uit de database bijna gratis.

Eén vormkeuze die daarbij hoort: een kortingsregel moet een **categorie** kunnen
aanwijzen, niet alleen losse artikelen. "15% op alle remschijven" is dan één
regel in plaats van tweehonderd.

### Waar de klant de aanbiedingen ziet — VASTGESTELD 2026-09-16

De afgeprijsde artikelen komen in de **bannerkolom van de hero**, rechts naast
het zoekpaneel, als een blok dat vanzelf doorschuift. Met de productfoto's van
de leverancier; die komen al mee met het artikel.

Die plek stond er eigenlijk al voor klaar. In `components/home/hero.tsx` staat
sinds de bouw:

> "Geen fotobanner met aanbiedingen zoals de concurrent: wij hebben nog geen
> acties, en een verzonnen korting tonen zou misleidend zijn. Dit blok verkoopt
> wat wél waar is."

Die reden vervalt zodra er echte kortingen zijn. Wat er stond blijft dus geen
principe, het was een plaatshouder.

**Zonder lopende actie blijft de banner zoals hij nu is.** Geen lege carrousel
en geen "binnenkort aanbiedingen": dan is het blok met de drie voordelen nog
steeds het eerlijkste wat we kunnen tonen.

Vier dingen die eraan vastzitten:

- **De drie voordelen mogen niet verdwijnen.** "Gratis verzending vanaf € 100"
  en "14 dagen bedenktijd" zijn precies de zinnen die twijfelaars overhalen, en
  de verzendgrens is ook een verkoopargument op zichzelf. Ze verhuizen naar een
  smalle strook onder de hero, niet naar de prullenbak.
- **Vanzelf doorschuiven vraagt een pauzeknop.** WCAG 2.2 (succescriterium
  2.2.2) eist dat bewegende inhoud die langer dan vijf seconden doorloopt te
  stoppen is. Daar hoort ook bij: stilstaan zodra de muis erop staat of iemand
  er met het toetsenbord in komt, en helemaal niet bewegen bij
  `prefers-reduced-motion` — die regel staat al in `.claude/rules/frontend.md`.
- **Dit is het grootste beeld van de pagina en dus de LCP.** Het eerste artikel
  moet in de HTML staan die de server stuurt, niet pas door JavaScript worden
  opgehaald, met `priority`, vaste afmetingen en een `sizes`. Anders ruilen we
  omzet uit aanbiedingen in tegen een tragere homepage.
- **De homepage is de drukste pagina**, dus de lijst met aanbiedingen wordt
  gecacht. Niet per bezoeker de catalogus bevragen voor een rijtje dat een dag
  hetzelfde blijft.

Vijf tot acht artikelen is genoeg. Niemand ziet dia negen.

**Let op de eerste maand.** De doorgestreepte "van"-prijs mag pas getoond worden
als er dertig dagen prijsgeschiedenis is (zie hierboven). Tot die tijd toont het
blok de nieuwe prijs met een kortingsvlag, zonder oude prijs ernaast. Dat is
geen tekortkoming maar de wet.

### GEBOUWD 2026-09-17 — wat er staat en wat er níet in kan

De carrousel staat er, met pauzeknop, stilstand bij muis en toetsenbord en géén
beweging bij `prefers-reduced-motion` (alle drie gemeten in de browser). De drie
voordelen zijn verhuisd naar een strook onder de hero, zoals hierboven
afgesproken. Daarnaast is er `/nl/aanbiedingen` voor wie ze allemaal wil zien.

Twee dingen die bij het bouwen bleken en die je moet weten voordat je een actie
aanzet:

- **Een categoriekorting op onderdelen kan niet**, en het paneel biedt hem
  daarom niet aan. De categorieboom van Wearparts hangt aan een auto
  (`/category` zonder `carId` geeft ERR_MISSING_MANDATORY_PARAMETER), en een
  artikel dat via het zoekveld binnenkomt draagt helemaal geen categorie maar
  `zoekresultaat`. Dezelfde korting zou dus op de ene pagina wél gelden en op
  de andere niet. Wat wél kan: de hele groep onderdelen, of één artikel —
  **en sinds 2026-09-22 ook één soort onderdeel, zie hieronder.**
- **Familie- en categorieacties op onderdelen komen niet in de carrousel.** Ze
  werken gewoon in de winkel — daar wordt per artikel gekeken — maar de
  aanbiedingenlijst redeneert andersom (van regel naar artikelen) en kan die
  catalogus niet bevragen zonder gekozen auto. Eén artikel aanwijzen kan wel.

De kortingsvlag ("-15%") staat er ook, zonder doorgestreepte van-prijs. Dat is
geen tussenoplossing maar de wet: tot er dertig dagen prijsgeschiedenis is mag
die tweede prijs er niet bij.

### UITGEBREID 2026-09-22: korting op één soort onderdeel

Gevraagd door de eigenaar: bij onderdelen zat er niets tussen "alle
onderdelen" en "dit ene artikel", terwijl bij de prijsregels wél een soort te
kiezen was. Dat gat is gedicht met dezelfde sleutel als daar — het
TecDoc-soortnummer uit `src/lib/admin/part-kinds.ts` (#17).

**Waarom dat wél mag en een categorie niet.** Het soortnummer staat op het
artikel zelf en komt met elk artikel mee, ongeacht hoe de klant erop uitkomt.
De hierboven beschreven fout — op de ene pagina wel, op de andere niet — kan
hier dus niet optreden.

GEMETEN 2026-09-22 met een tijdelijke actie van 12% op soort 7 (Oliefilter),
naast een lopende actie van 3% op de hele groep onderdelen:

| Waar | Artikel | Korting |
|---|---|---|
| Categoriepagina oliefilter | BOSCH F 026 407 143 | −8% |
| Productpagina van datzelfde artikel | idem | −8% |
| **Zoekresultaat, dus zonder categorie** | FEBI BILSTEIN Oliefilter 172139 | **−9%** |
| Zoekresultaat, pakking oliefilterhuis | ELRING 763.260 | −3% |
| Categoriepagina remschijf | — | −3% |

Twee dingen staan daarmee vast. De korting volgt het artikel tot in het
zoekresultaat (en dus tot in de winkelwagen, die langs dezelfde `partById`
loopt), en hij raakt alleen het gekozen soort: een pakking vóór een
oliefilterhuis houdt gewoon de 3% van de groep.

Dat het geen 12% is maar 8 of 9 is geen fout maar de marge-ondergrens: op
oliefilters staat een prijsregel van 10% opslag, en daar past hoogstens 9%
korting in (#17). De actie wordt dus per artikel getrimd in plaats van
geweigerd.

**Wat het niet verandert:** zo'n actie komt nog steeds niet in de carrousel en
krijgt geen doorgestreepte van-prijs. Beide om dezelfde reden als bij een
familieactie op onderdelen — die catalogus is niet te bevragen zonder gekozen
auto, dus de nachtelijke prijsmeting heeft er geen artikelen van. De
kortingsvlag zelf staat er wel.

De database kent de waarde sinds `db/migrations/0008_discount_kind.sql`.

### GEBOUWD 2026-09-17: de prijsmeting, en wat hij kost

De eigenaar vroeg of dit niet te veel API-verzoeken kost, en of het niet met een
SQL-trigger kon. Allebei beantwoord met een meting op het echte account.

**Wat het kost.** De eerste echte meting van zijn winteractie:

| | |
|---|---|
| Acties | 1 (25% op Auto / SUV) |
| Artikelen gemeten | **1.603** |
| API-verzoeken | **4** |
| Tijd | 110 seconden |

Eén verzoek draagt 500 prijzen, dus de rekening gaat over het aantal acties en
niet over het aantal artikelen. De leverancier staat 100 verzoeken per minuut
toe voor de héle winkel; dit kost er vier per dag. **Zonder lopende actie kost
het nul.**

**Waarom geen SQL-trigger of stored procedure.** Gemeten op de database:
`event_scheduler` staat op `OFF` en de winkelgebruiker heeft alleen
`GRANT USAGE ON *.*` — hij mag hem niet aanzetten. Maar de doorslaggevende
reden is een andere: **de prijzen staan niet in de database maar achter de API
van de leverancier, en MariaDB kan geen HTTP-verzoek doen.** Een trigger vuurt
op een tabelwijziging, een procedure alleen als iemand hem aanroept; geen van
beide kan iets ophalen.

Het hostingpakket toont geen taakplanner in hPanel. Daarom drie ingangen die
allemaal dezelfde dag claimen in `job_runs`:

1. een cron-taak die `GET /api/jobs/prices` aanroept met `CARO_JOB_TOKEN`;
2. de klok in de server zelf (`instrumentation.ts`), die elk uur kijkt;
3. de knop **Nu meten** in het beheerpaneel.

De eerste die de dag claimt draait; de rest krijgt "overgeslagen" terug. De
cron-taak mag dus gerust elk uur lopen.

### Het venster ligt vóór de actie — GEVONDEN BIJ HET NAREKENEN

De eerste opzet nam de laagste prijs van de dertig dagen vóór **vandaag**. Dat
werkt niet: dan zit de actieprijs zelf in dat venster, is de laagste prijs
altijd gelijk aan wat het artikel nu kost, en verschijnt er nooit een
van-prijs. Het venster hoort te liggen vóór de **startdatum van de actie** —
dat is ook wat de richtlijn zegt ("voorafgaand aan de toepassing van de
prijsvermindering").

Daar volgt een werkregel uit die de beheerder moet kennen:

> **Plan een actie een maand vooruit en de doorgestreepte van-prijs mag.
> Begin je hem vandaag, dan ziet de klant alleen het percentage.**

Bewezen met dertig dagen geplante geschiedenis op één band, waarvan één dag
lager stond: de winkel toonde **€ 44,00** (die laagste dag) en niet de € 45,98
van de dag ervoor. De verzonnen geschiedenis is daarna verwijderd.

### Kortingscodes

Gekeurd op de server, in `startPayment()` vlak voordat de betaling wordt
aangemaakt — daar wordt het bedrag al opnieuw uitgerekend en dat blijft de enige
plek waar het bedrag ontstaat (CLAUDE.md: een bedrag dat naar een betaaldienst
gaat komt nooit uit de browser).

**Vastgesteld 2026-09-14:**

| Keuze | Besluit |
|---|---|
| Soort korting | **Alleen een percentage.** Geen vaste bedragen — dat scheelt een halve rekenmachine aan randgevallen |
| Minimum bestedingsbedrag | **Zonder verzendkosten.** De grens kijkt naar de artikelen, niet naar het verzendtarief |
| Looptijd | **Startdatum én einddatum**, allebei door de beheerder in te vullen. Een actie kan dus vooruit gepland worden |
| Maximaal aantal keer | **Optioneel.** Leeg = onbeperkt |

Twee dingen die hieruit volgen en die nog niemand heeft beslist — mijn voorstel
erbij, zeg het als je er anders over denkt:

- **Telt de korting mee voor gratis verzending (€ 100)?** Een code van 20% op
  een bestelling van € 110 maakt daar € 88 van. *Voorstel: de grens kijkt naar
  het bedrag ná de korting.* De klant betaalt dan immers € 88, en gratis
  verzending weggeven op geld dat niet binnenkomt kost twee keer.
- **Mag een code op een artikel dat al in de aanbieding is?** *Voorstel: nee.*
  Anders stapelen twee kortingen tot onder de ondergrens en moet de winkel de
  code bij het afrekenen alsnog weigeren — precies op het moment dat de klant
  wil betalen. Een regel vooraf ("geldt niet op afgeprijsde artikelen") is
  eerlijker dan een weigering achteraf.

Een code die de bestelling op nul zet kan niet: Mollie weigert een betaling van
nul. Dat is een randgeval om bewust af te vangen, geen theoretisch probleem.

### BEANTWOORD 2026-09-17 door de eigenaar, en gebouwd

Allebei de voorstellen hierboven zijn akkoord:

- **de gratis-verzendgrens kijkt naar het bedrag ná de korting**;
- **een code geldt niet op artikelen die al in de aanbieding zijn** — hij telt
  alleen over de rest van de wagen, en het minimumbedrag kijkt naar datzelfde
  bedrag zodat drempel en korting over hetzelfde geld gaan.

Bij het bouwen kwam er een derde regel bij, die niemand had bedacht maar die
uit de eerste twee volgt. **Een korting mag een bestelling nooit duurder
maken.** GEMETEN: € 100 aan artikelen is gratis verzonden; met een code van 5%
werd dat € 95 + € 7,45 verzendkosten = € 102,45. De klant betaalde dus méér
mét zijn code. Nu houdt hij in dat geval de verzending die hij zonder code ook
had gekregen. In alle normale gevallen — een korting groter dan het
verzendtarief — verandert er niets: 10% op € 110 kost nog steeds € 7,45
verzending en komt uit op € 106,45.

**Één keer per klant hangt aan de database, niet aan een controle in code.** De
unieke sleutel `(code_id, email_key)` is wat het afdwingt; twee bestellingen
tegelijk lezen allebei "nog niet gebruikt" en de tweede ketst af. Aftekenen
gebeurt pas als er betaald is, dus een afgebroken checkout kost de klant zijn
enige kans niet. Ketst het af terwijl het geld al binnen is, dan gaat de
bestelling gewoon door en komt het in de log — een betaalde klant zijn
bevestiging onthouden om een teller is de verkeerde afweging.

---

## 17. Eigen prijzen — VASTGESTELD 2026-09-19

De eigenaar wil zelf bepalen wat een artikel kost, per groep in plaats van per
artikel. Zijn woorden: *"de huidige prijzen marge op de webshop mag weg, vanaf
het beheerderportaal vult de beheerder een procent, bijv. 10%, dus inkoopprijs
van Alzura verhogen met 10%."*

Dat vervangt de strategie uit #5 (de adviesprijs van de leverancier volgen),
en het is een grotere ingreep dan het klinkt. **GEMETEN op de echte
catalogus:** een GOODYEAR UG9+ 195/65 R15 kost € 38,00 met de adviesprijs en
**€ 27,14** met een opslag van 10% — bijna dertig procent lager. De
adviesprijs ligt netto gemeten zo'n 37–55% boven de inkoop (#5), dus een
opslag van 10% is een heel ander winkelmodel: scherp zitten en het van volume
hebben.

(Die € 38,00 stond hier eerst als € 45,98. Dat was de btw-fout uit #5, die op
19 september is rechtgezet; het verschil tussen de twee regimes is dus kleiner
dan het eerst leek, maar nog altijd fors.)

Dat is de keuze van de eigenaar en hij is gebouwd. Wel met de kanttekening die
hij bij het invullen ziet: van 10% op een inkoop van € 50 blijft € 5 over,
vóór de betaalkosten van Mollie (~€ 0,29 per iDEAL-transactie), de € 6,90 die
Tyre24 per zending rekent en de retouren binnen de bedenktijd.

### Drie regels die het veilig houden

1. **Zonder regel staat de prijs van de leverancier er onaangeroerd.** Geldt
   er voor een artikel geen enkele prijsregel, dan is de verkoopprijs de
   adviesprijs van Alzura — die al inclusief btw is (#5), dus óók daar tellen
   we niets bij op. Een leeg veld mag niet
   betekenen dat de winkel ineens bijna op inkoopprijs verkoopt (dat zou het
   bij een lege tabel wél doen), maar het mag er evenmin toe leiden dat wij
   een bedrag tonen dat de leverancier niet vraagt.

   **AANGESCHERPT 2026-09-19** op verzoek van de eigenaar: de ondergrens van
   25% lag hier eerst nog overheen (`max(advies, inkoop x 1,25)`). Dat tilde
   artikelen waar de adviesprijs krap boven de inkoop zit stilletjes omhoog,
   en dan is het niet meer de prijs van de leverancier. De grens geldt nu nog
   alleen als er **geen** adviesprijs bij een artikel staat; élk gemeten
   artikel had er een, dus dat is een noodgreep en geen strategie.
2. **De ondergrens van 25% geldt niet mét een opslag.** Dat lijkt tegendraads
   maar is precies het punt: die grens zou een opslag van 10% naar 25% tillen
   en dus negeren wat de eigenaar invulde. Wat er in álle gevallen wél geldt
   is dat we nooit onder de inkoopprijs verkopen — ook niet als een
   adviesprijs daar ooit onder zou duiken.

   Voor een korting zónder prijsregel blijft de bodem 25% marge, maar nooit
   hoger dan de prijs zelf. Zonder die aftopping zou een artikel waarvan de
   adviesprijs onder die bodem ligt elke korting stil laten wegvallen.
3. **Een korting kan nooit groter zijn dan de opslag.** Bij 10% opslag past er
   hoogstens 9% korting (1 − 1/1,10 = 9,09%); het kortingsformulier weigert
   meer en zegt wat er wél kan — dezelfde regel als in #14.

### De sleutel verschilt per familie, en dat is geen willekeur

| Familie | Waarop een regel kan |
|---|---|
| Banden, velgen, toebehoren | hele winkel, familie, **categorie**, artikel |
| Onderdelen | hele winkel, familie, **soort onderdeel**, artikel |

**Bij onderdelen kan een categorieregel niet.** De categorieboom van Wearparts
hangt aan een auto en een artikel dat via het zoekveld binnenkomt draagt
helemaal geen categorie maar `zoekresultaat` (#7). Bij een korting was dat al
verwarrend; bij een prijs is het onacceptabel, want het afrekenen zoekt het
artikel op id en zou dan een ánder bedrag uitrekenen dan de klant zag.

Daarvoor in de plaats komt het **TecDoc-soortnummer**, dat op het artikel zelf
staat en dus overal hetzelfde is. GEMETEN 2026-09-19 op twee auto's, identiek
in beide bomen: oliefilter 7, luchtfilter 8, interieurfilter 424, remblok 402,
remschijf 82, motorolie 3224, accu 1, wisserblad 298, bougie 686, schokdemper
854, distributieriem 1123. Die elf staan in `src/lib/admin/part-kinds.ts` en
zijn precies de rij "meest gezocht" die de klant ziet.

**Een prijsregel is geen aanbieding.** Zet de eigenaar een prijs lager, dan is
dat zijn nieuwe prijs: geen kortingsvlag, geen doorgestreepte van-prijs, niet
op de aanbiedingenpagina. Voor een tijdelijke verlaging zijn de kortingsregels
er (#14). Dat onderscheid is niet cosmetisch — een "van"-prijs mag alleen bij
een *aangekondigde* verlaging en vraagt dertig dagen prijsgeschiedenis.

### Bij het bouwen: dezelfde valkuil als bij de kortingscodes

Het formulier in het paneel is een client component en importeerde
`maxDiscountPercent` uit `lib/prices/markup.ts` — dat bestand praat met de
database, dus de MySQL-driver belandde in de browserbundel en de hele pagina
gaf HTTP 500 met "Can't resolve net". Precies wat er 2026-09-17 met
`discounts/codes.ts` gebeurde. Het rekenwerk staat nu in `markup-math.ts`,
zonder database eromheen.

**Typecheck en lint zien dit geen van beide.** De enige controle die het vangt
is de pagina openen of `pnpm build` draaien.

---

## 18. Beoordelingen van klanten — VASTGESTELD 2026-09-19

De eigenaar wil beoordelingen ophalen per mail, ze bewaren en op de webshop
tonen. Zijn keuzes: **twee soorten in één formulier** — één cijfer voor de
webshopervaring en één voor de bestelling — plus optioneel een cijfer per
artikel.

### Wanneer de uitnodiging uitgaat

We weten niet wanneer een pakket bezorgd is; er komt geen statusbericht van de
vervoerder. Wat er wél is, is `purchased_at`: het moment waarop de eigenaar bij
de groothandel inkocht (#10, dat blijft handwerk).

> **Zeven dagen na de inkoop.** Heeft hij die niet afgetekend, dan veertien
> dagen na de betaling.

Die tweede termijn is laat en met opzet: te vroeg vragen om een oordeel over
een pakket dat er nog niet is, is erger dan te laat vragen. In het paneel zit
een knop **Nu uitnodigen** voor als hij weet dat het bezorgd is.

De taak hangt aan dezelfde klok en dezelfde dagclaim als de prijsmeting
(`job_runs`), en aan hetzelfde cron-adres — één cron-taak dekt nu beide.
Hoogstens 25 mails per keer: de bevestigingsmails van bestellingen gaan over
dezelfde mailbox en die mogen nooit achter een stapel verzoeken blijven staan.

### Wat de wet hier vraagt, en wat dat betekent voor de knoppen

**Negatieve beoordelingen wegfilteren mag niet.** Sinds de Omnibus-richtlijn
is selectief publiceren een oneerlijke handelspraktijk, en de ACM handhaaft
erop. Daar volgt de hele opzet van het paneel uit:

- een beoordeling staat **meteen** op de site, er is geen goedkeuringsstap;
- **verbergen kan alleen mét een reden**, die in de database én in het logboek
  komt. Dat is het bewijs dat je verbergt om misbruik en niet om een cijfer;
- wat je bij een klacht doet is er **openbaar op antwoorden**. Dat leest voor
  een volgende klant beter dan vijf keer vijf sterren.

**"Geverifieerde aankoop" mag je alleen zeggen als het waar is.** Daarom komt
de uitnodiging per mail, werkt de link één keer, en komen de artikelen waar
een cijfer op kan uit de bestelling zelf — niet uit het formulier. Met een
geldige link kun je dus geen cijfer plakken op iets wat je nooit kocht.

**De markering voor Google komt er pas met echte beoordelingen.**
`aggregateRating` telt alleen wat zichtbaar is, dus wat de bezoeker kan
nalezen. Dat stond al als regel in `.claude/rules/frontend.md` en blijft
staan; alleen de reden om hem leeg te laten vervalt.

### GEVONDEN 2026-09-25: "Nu uitnodigen" kon niet uitnodigen

De eigenaar drukte op de knop en er gebeurde niets. Nagelopen in de database:
de knop had gedraaid en netjes `invited: 0, errors: 0` gemeld. Dat klopte ook
— zijn twee betaalde bestellingen (20 en 24 september, geen `purchased_at`)
zijn pas op 4 en 8 oktober aan de beurt.

**Maar dat is niet wat de knop belooft.** Hierboven staat: *"In het paneel zit
een knop Nu uitnodigen voor als hij weet dat het bezorgd is."* Wat hij deed
was alleen de **dagclaim** overslaan (`force: true`), niet de wachttermijn van
zeven of veertien dagen. Hij verstuurde dus wat tóch al aan de beurt was, en
dat is precies het geval waarin je niet hoeft te drukken.

Rechtgezet met twee dingen op de beoordelingenpagina:

1. **Een lijst "nog niet uitgenodigd"** met per bestelling de datum waarop het
   vanzelf gebeurt. Alleen al daarmee is het antwoord zichtbaar in plaats van
   een stille nul.
2. **Een knop per bestelling** die de wachttermijn wél overslaat, met een
   bevestiging ertussen. Per bestelling en niet in bulk, want de belofte gaat
   over déze zending waarvan de beheerder weet dat hij bezorgd is.

Wat er niet verandert: betaald zijn, nog geen uitnodiging hebben, en de unieke
sleutel die een tweede mail tegenhoudt. Die drie bewaakt de handmatige weg
net zo goed als de dagelijkse taak.

**De lijst toont geen naam en geen mailadres**, alleen het ordernummer. Deze
pagina mag ook een marketingmedewerker openen en klantgegevens horen daar niet
(#19).

### Wat er niet in zit

- **Geen mailinglijst en geen uitschrijflink.** Dit is één bericht per
  bestelling over een bestelling die de klant net kreeg; dat valt onder de
  klantrelatie. Een uitschrijflink zou misleidend zijn, want er is geen lijst
  (#15 blijft geparkeerd).
- **Geen gemiddelde per product op de productpagina.** De gegevens liggen er
  wél klaar (`review_products` draagt het artikelnummer), maar met dit
  ordervolume zou er maandenlang "1 beoordeling" bij een artikel staan en dat
  zegt niets. Zodra er genoeg zijn is het een query, geen verbouwing.

---

## 16. Privacyverklaring en cookiebanner — VASTGESTELD 2026-09-17

De eigenaar vroeg: nu we mailadressen in een database bewaren, moet de
privacyverklaring dan aangepast worden, en is er een cookiebanner nodig?

**Privacyverklaring: ja, en dat is gebeurd.** Er stond alleen in wat er op het
apparaat van de bezoeker terechtkomt. Wat er op ónze server staat — naam,
adres, mailadres, telefoon, wat er besteld is, de factuur — ontbrak, terwijl
dat juist het stuk is dat de AVG wil zien: welke gegevens, waarvoor, op welke
grondslag en hoe lang. Er staat nu een tweede tabel op `/nl/privacy` met vier
regels, en de bewaartermijn van zeven jaar (fiscale bewaarplicht) staat er
eindelijk expliciet bij.

Eén regel was echt nieuw en niet af te leiden uit de oude tekst: bij een
kortingscode met "één keer per klant" bewaren we het **mailadres apart van de
bestelling**, in kleine letters en niet gehasht (`discount_code_uses`). Het
moet daar blijven staan óók als de bestelling ooit verdwijnt, anders is de
code opnieuw te gebruiken. Dat is de enige plek in het schema waar een
mailadres buiten een bestelling om bewaard wordt.

**Cookiebanner: nee.** De toestemmingsplicht van art. 11.7a Telecommunicatiewet
gaat uitsluitend over het plaatsen van of lezen van gegevens **op het apparaat
van de bezoeker**. Wat een server in zijn eigen database zet valt daar niet
onder — dat is een AVG-vraag, en die is hierboven beantwoord. De vijf sleutels
in de browser zijn onveranderd en alle vijf noodzakelijk of zelfgekozen; de
uitzondering van lid 3 blijft dus gelden.

**De banner komt er wél** zodra er iets bijkomt dat geen van beide is:
analytics, een advertentiepixel, een ingesloten YouTube-speler of een
chatwidget van een derde. Dan moet het een banner **mét voorafgaande
blokkering** zijn: weigeren net zo makkelijk als accepteren, en niets laden
voordat er geklikt is. Een banner die nu al zou vragen om toestemming voor de
winkelwagen is misleidend — je kunt er geen nee tegen zeggen.

Onderbouwing en de bijwerkinstructie staan in @docs/PRIVACY.md.

---

## 15. Mailadressen bewaren en marketingmail — GEPARKEERD 2026-09-14

**De eigenaar parkeert dit**; misschien komt er later een apart mailadres voor.
De analyse hieronder blijft staan voor als het weer opgepakt wordt.

Wat parkeren concreet betekent, en dat is geen formaliteit:

- **We gaan nu géén mailadressen apart bewaren voor marketing.** Ze staan al bij
  de bestelling, want daar zijn ze voor nodig. Een aparte lijst aanleggen voor
  een doel dat je nog niet hebt, mag niet onder de AVG — je verzamelt voor een
  doel, niet voor de zekerheid.
- **De bezwaarmelding in de checkout komt er nu ook niet.** Die hoort bij het
  moment dat je adressen voor marketing gaat verzamelen (zie hieronder), en
  eerder iets aankondigen wat je niet doet is verwarrend.
- **Beslist voor later: bewaartermijn twee jaar** na de laatste bestelling.

Wanneer dit terugkomt, is de eerste stap dus niet de knop maar de melding in de
checkout — zonder die melding is de rest niet toegestaan.

De wens was: de mailadressen van klanten bewaren en er met één klik een
aanbiedingenmail naartoe sturen. Dat kan, maar niet zoals het nu zou gaan.

### Toestemming is niet vrijblijvend

De Telecommunicatiewet (art. 11.7) staat toe dat je **eigen klanten** mailt over
**eigen, soortgelijke producten** zonder dat ze daar vooraf ja op zeggen — de
klantrelatie-uitzondering. Twee voorwaarden zitten eraan vast:

1. Je moet de mogelijkheid om bezwaar te maken aanbieden **op het moment dat je
   het adres krijgt**, dus in de checkout. Dat staat er nu niet. Zonder die
   melding geldt de uitzondering niet.
2. In **elke** mail moet een werkende afmeldlink staan, gratis en zonder
   inloggen.

Wie niets besteld heeft — bijvoorbeeld iemand die zich op de site inschrijft —
valt niet onder die uitzondering en moet actief toestemming geven.

Omdat er een nieuw doel bij komt voor gegevens die we al hebben, moet de
privacyverklaring mee: waarvoor, op welke grondslag, hoe lang bewaard, en hoe je
je uitschrijft. Bewaar per adres **hoe en wanneer** het binnenkwam en of iemand
zich heeft uitgeschreven — zonder die vastlegging kun je bij een klacht niet
laten zien dat je het goed deed.

### De aanbiedingsmail mag niet over dezelfde mailbox

Dit is de zwaarste van de twee, en het is een technisch risico, geen juridisch:

**De orderbevestiging en de reclamemail delen nu dezelfde afzender**
(`info@caroparts.nl` via de Hostinger-mailbox, `src/lib/mail.ts`). Reputatie bij
Gmail en Outlook hangt aan het domein. Eén campagne met te veel spamklachten — en
reclame krijgt altijd klachten — sleurt daarmee ook de **orderbevestigingen** de
spamfolder in. Dan betaalt een klant en hoort hij niets meer.

Gmail en Yahoo stellen sinds 2024 eisen aan afzenders van grote hoeveelheden
mail: SPF, DKIM én DMARC, uitschrijven in één klik (`List-Unsubscribe-Post`) en
een klachtpercentage onder 0,3%. Onder hun volumegrens zijn dat geen harde
eisen, maar de filters kijken naar dezelfde signalen.

**Voorstel**: marketing via een aparte verzenddienst op een **apart subdomein**
(bijvoorbeeld `nieuws.caroparts.nl`), zodat een misgelopen campagne de
transactionele mail niet meeneemt. Welke dienst dat wordt is een aparte keuze;
wat telt is de scheiding.

### "Eén klik" is precies het gevaar

Een knop die direct naar alle klanten verstuurt, is onomkeerbaar. Een typefout,
een verkeerd artikel of een verkeerde prijs staat dan bij iedereen in de inbox,
en een rectificatie is een tweede mail — met opnieuw klachten. Wat het wel kan
zijn: een concept opstellen, naar jezelf testen, en dan pas versturen met het
aantal ontvangers in beeld en een bevestiging erop. Dat zijn drie klikken in
plaats van één, en dat is de bedoeling.

### Open vragen voor als dit terugkomt

- Wat gaat er in die mail? Artikelen die in de aanbieding staan (#14) volgen
  automatisch uit de kortingsregels — of stelt de eigenaar de lijst zelf samen?
- Komt er ook een inschrijfmogelijkheid voor bezoekers die nog niet besteld
  hebben? Dan is expliciete toestemming en een bevestigingsmail nodig.

De bewaartermijn is al beslist: twee jaar na de laatste bestelling.

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
| 2026-09-10 | Betalen via Mollie, inkoop met de hand | Beheerder ziet elke bestelling langs zolang annuleren maar tien minuten kan (#4) |
| 2026-09-10 | Orders als JSON-bestand, geen database | Genoeg voor terugvinden en niet dubbel mailen; kan bij Hostinger omdat de schijf blijft bestaan (#10) |
| 2026-09-10 | Hosting bij Hostinger | Staat er al, mailbox draait er ook; levert een blijvende schijf voor de orderopslag |
| 2026-09-12 | Adres invullen via gratis-postcodedata.nl | Geen sleutel en geen contract nodig, CC0-data van het Kadaster; scheelt de klant twee velden (#11) |
| 2026-09-14 | Beheerpaneel met eigen inlogpagina | De winkel had nog geen enkele inlog; een browserpopup kent geen uitloggen en geen huisstijl (#12) |
| 2026-09-14 | Er komt een database | Factuurnummers, een codeteller en een uitschrijving kunnen niet veilig in losse bestanden (#13) |
| 2026-09-14 | Facturatie wordt factuur én omzetoverzicht | Twee verschillende vragen: één voor de klant, één voor de boekhouding (#12) |
| 2026-09-14 | Korting alleen als percentage, met prijsgeschiedenis | "Van/voor" mag alleen met de laagste prijs van 30 dagen erbij (#14) |
| 2026-09-14 | Te diepe korting wordt geweigerd, niet afgekapt | Anders staat er 40% in het paneel terwijl de klant 18% ziet (#14) |
| 2026-09-14 | Marketingmail geparkeerd | Eigenaar pakt het later op, mogelijk met een apart mailadres (#15) |
| 2026-09-16 | MySQL bij Hostinger, geen Supabase | Supabase aanmaken lukte niet; MySQL zit bij het pakket, kan transacties en zet geen klantgegevens bij een derde (#13) |
| 2026-09-16 | Aanbiedingen in de hero-banner, vanzelf doorschuivend | Die plek stond al als plaatshouder in de code; met echte kortingen vervalt de reden om hem leeg te laten (#14) |
| 2026-09-17 | Motorolie krijgt filters op inhoud, merk en viscositeit | De twee bezwaren tegen eigenschapsfilters gelden daar niet: dekking is 99–100% en het is geen jargon maar wat er op de fles staat (#7) |
| 2026-09-17 | Productgroepen zijn links, geen uitklapmenu's | De categorieën staan al op de familiepagina; het menu voegde een klik toe en kostte vier API-lijsten per paginaweergave (#7) |
| 2026-09-17 | Accu's in de rij "meest gezocht", met eigen tekeningen | Groep 653 staat in elke gemeten boom; de leverancier levert geen beeld bij eindgroepen, dus lijntekeningen in plaats van foto's (#9) |
| 2026-09-17 | Privacyverklaring uitgebreid, geen cookiebanner | De AVG vraagt om wat er op onze server staat; de banner gaat alleen over het apparaat van de bezoeker (#16) |
| 2026-09-19 | Eigen prijs: opslag op de inkoopprijs, per groep | De eigenaar bepaalt zijn marge zelf; de adviesprijs blijft staan waar hij niets invult (#17) |
| 2026-09-19 | Prijs bij onderdelen hangt aan het soortnummer, niet aan de categorie | De categorie ontbreekt bij een zoekresultaat, en dan zou het afrekenen een ander bedrag uitrekenen dan de klant zag (#17) |
| 2026-09-19 | Beoordelingen verschijnen meteen, verbergen alleen met reden | Selectief publiceren is een oneerlijke handelspraktijk; antwoorden werkt beter dan weghalen (#18) |
