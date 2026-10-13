# Fotos bij de rij "meest gezocht"

**Herkomst: de productfotos van de groothandel**, dezelfde bron als elke
productkaart in deze winkel (`cdn01.alzura.com`). Opgehaald 2026-10-11 met de
Wearparts-API. Ze staan hier op onze eigen server en niet als hotlink; dat
scheelt ook de naam van de groothandel in de broncode van elke pagina - zie
@docs/PRIVACY.md, waar dat als openstaand punt staat.

Bewerkt met sharp: **wit weggesneden** (`trim`), daarna 400x400 op wit met een
marge van 16 px, mozjpeg q82. Samen 141 kB.

Dat bijsnijden is geen opmaak. De bougie kwam binnen als 495x400 waarvan het
onderwerp 210 px breed was: op een tegel van 64 px bleef daar een streepje
van over. Na het snijden vult elk onderwerp het vlak.

## Waarom geen vrije stockfoto

GEMETEN 2026-10-11 op drie bronnen. Openverse (CC0 en publiek domein) geeft
**nul** treffers voor interieurfilter, remblok, koelvloeistof en wisserblad;
motorolie geeft 240 treffers die allemaal reclameplaten uit 1934-1953 zijn, en
distributieriem geeft 3D-printbestanden. Pexels geeft bij "brake pads"
motorfietsremklauwen en monteurs in garages, Pixabay bij "cabin air filter"
vliegtuigstoelen en een berghut. Deze categorieen zijn te specifiek voor vrije
stockfotografie.

Dat is dus geen kwestie van beter zoeken. Wie hier ooit opnieuw naar kijkt:
begin bij de leverancier, niet bij een stockbank.

## Drie dingen die het oog moest vangen en een script niet

1. **Een foto hebben is niet hetzelfde als een foto zijn.** De YUASA-accu
   draagt een `image`-URL die een plaatje met de tekst "NO IMAGE" oplevert.
   Een controle op "is het veld gevuld" laat die er dus gewoon door.
2. **Sommige merken leveren een maattekening.** Bij remschijf gaven DELPHI en
   TEXTAR een technische tekening met maatvoering in plaats van een foto.
3. **Watermerken.** De SAKURA-remblokken staan vol met hun eigen logo.

Elke kandidaat is daarom met het oog bekeken op een contactvel voordat hij
gekozen werd. Automatiseer dat niet zonder die stap.

## Hoe zwaar een foto weegt op 64 pixels

GEMETEN per foto: welk deel van het vlak is niet-wit, op het formaat dat de
tegel gebruikt. Dat getal bepaalde twee dingen.

| | |
|---|---|
| Zwaarst | accu 44%, oliefilter 44%, remschijf 41% |
| Lichtst | wisserblad 10%, distributieriem 12%, interieurfilter 16%, bougie 16% |

**Het wisserblad is daarop gewisseld**: de BLUE PRINT-foto haalde 12% en de
MAXGEAR 30%, met meer dan dubbel zoveel echt donkere pixels. Bij de bougie
bleef de eerste keuze staan - die had met 11% de meeste donkere pixels van de
drie, en een bougie is nu eenmaal een zilver voorwerp.

**En het verklaart de haarlijn om het beeldvlak** in `group-list.tsx`: in
lichte modus valt een wit vlak samen met de witte tegel, en dan is een licht
onderwerp helemaal weg. De bougie was daar letterlijk niets.

## Wat er staat

| Bestand | Merk | Artikel | Grootte | Bron |
|---|---|---|---|---|
| `oliefilter.jpg` | HERTH+BUSS JAKOPARTS | Oliefilter | 18 kB | https://cdn01.alzura.com/0055_PIC/J1313025.JPG |
| `luchtfilter.jpg` | FEBI BILSTEIN | Luchtfilter | 11 kB | https://cdn01.alzura.com/0101_PIC/38924_1.JPG |
| `brandstoffilter.jpg` | ALCO FILTER | Brandstoffilter | 8 kB | https://cdn01.alzura.com/0180_PIC/FF-010.JPG |
| `interieurfilter.jpg` | ALCO FILTER | Interieurfilter | 7 kB | https://cdn01.alzura.com/0180_PIC/MS-6109.JPG |
| `remblok.jpg` | ABE | Remblokkenset, schijfrem | 9 kB | https://cdn01.alzura.com/4426_PIC/C20314ABE_%233.JPG |
| `remschijf.jpg` | FEBI BILSTEIN | Remschijf | 11 kB | https://cdn01.alzura.com/0101_PIC/05649_1.JPG |
| `motorolie.jpg` | EUROL | Motorolie | 11 kB | https://cdn01.alzura.com/0398_PIC/E100010-1L.JPG |
| `remvloeistof.jpg` | TEXTAR | Remvloeistof | 12 kB | https://cdn01.alzura.com/0039_PIC/textar_dot4_250ml.JPG |
| `koelvloeistof.jpg` | ROWE | Anti-vries/koelvloeistof | 11 kB | https://cdn01.alzura.com/5382_PIC/21041-0015-99.JPG |
| `accu.jpg` | BOSCH | Accu | 10 kB | https://cdn01.alzura.com/0030_PIC/0092S5AX10PH01WHCO0000.JPG |
| `wisserblad.jpg` | MAXGEAR | Wisserblad | 10 kB | https://cdn01.alzura.com/0403_PIC/_grafika_39-0301_large.JPG |
| `schokdemper.jpg` | DACO Germany | Schokdemper 562802 | 7 kB | https://cdn01.alzura.com/6479_PIC/562802-1.JPG |
| `bougie.jpg` | FEBI BILSTEIN | Bougie | 8 kB | https://cdn01.alzura.com/0101_PIC/13450_1.JPG |
| `distributieriem.jpg` | FEBI BILSTEIN | Distributieriemset | 9 kB | https://cdn01.alzura.com/0101_PIC/19657_1.JPG |

**Er staat een merknaam op.** Dat is onvermijdelijk: een productfoto is van
een fabrikant. Waar de keuze er was is het minst opdringerige exemplaar
gekozen - ABE boven SAKURA bij remblokken, omdat die laatste vol watermerken
staat.

## De schokdemper kwam er via de winkel, niet via de API

Deze groep ontbrak eerst. Wat er niet werkte:

| Weg | Uitkomst |
|---|---|
| `search=schokdemper` over 150 artikelen | alleen toebehoren: beschermkappen, bussen, ophangingen |
| `filter[genericArticleId]=854` | **HTTP 500**, acht keer achter elkaar, op elke paginagrootte |
| `/articles?filter[carId]=128136&filter[category]=775` | **0 artikelen** |
| Node 775 op carId 115566 | 10 artikelen, allemaal aanslagrubbers en stofkappen |
| Zoeken op KYB en MONROE | 0 artikelen die precies "Schokdemper" heten |

Wat wél werkte: **de categoriepagina van de winkel openen.**
`/nl/onderdelen/schokdempers-775?auto=128136` toont gewoon PROFLEX, NTY, GSP,
DACO en ATECSO met foto en al — op exact dezelfde knoop 775 waar de losse
API-vraag nul teruggaf.

Dat verschil is niet opgelost en het is de moeite waard om te onthouden: **de
adapter van de winkel krijgt uit deze API iets wat een rechtstreekse vraag met
dezelfde parameters niet krijgt.** Loop je hier nog eens tegenaan, bevraag dan
de winkel en niet de leverancier.

Drie kandidaten van die pagina, gemeten op tegelformaat:

| Merk | Beoordeling |
|---|---|
| GSP | schone demper, maar het hele beeld ligt onder een herhaald "GSP"-watermerk |
| **DACO Germany** | **gekozen** — schone demper, compleet merklogo ernaast |
| ATECSO | staat op een grijze ondergrond in plaats van wit, valt uit de rij |

Het DACO-logo beslaat bijna de halve breedte. Terugsnijden tot alleen de
demper is geprobeerd en afgekeurd: de snede hakt het logo doormidden tot
"ACO GERMANY", en een half merkteken is slordiger dan een heel.

## Wat hier níet in mag: previews van een stockbank

De eigenaar leverde 2026-10-11 zelf een `schokdempers.png` aan. Die is **niet
gebruikt**: het was een preview van Alamy, met hun logo linksonder, "Image ID:
E9FC17" rechtsonder en een diagonaal watermerk door het beeld. Dat is dezelfde
fout als de vier iStock-previews die nog op de homepage staan (#9) — en het
watermerk zou gewoon zichtbaar zijn geweest op de tegel.

Een foto van een stockbank mag hier alleen met een gekochte licentie op naam
van het bedrijf. Zonder licentie: de leverancier, of de lijntekening.

# Fotos bij "Categorieen voor jouw auto"

De eigenaar vroeg 2026-10-12 om foto's bij het **rooster** eronder, waar tot nu
toe het pictogram van de leverancier stond. Dat zijn 35 hoofdgroepen; de
koppeling staat in `lib/catalog/group-photos.ts` onder `MAIN_PHOTOS`, **op naam
en niet op nummer** (zie @docs/DECISIONS.md #7).

Zelfde bewerking als hierboven: wit weggesneden, 400x400 op wit met 16 px
marge, mozjpeg q82. Twintig nieuwe bestanden, samen 252 kB.

**Tien groepen lenen een foto die er al stond.** Elektrische systemen krijgt de
accu, Filter de luchtfilter, Remsysteem de remschijf, smeermiddelen de
motorolie, Vering / Demping de schokdemper, Ontsteking / Gloeisysteem de
bougie, Wisserbladen de wisserblad, Riemen de distributieriem,
Brandstofmanagement het brandstoffilter en Service-/ Inspectie- /
Onderhoudsonderdelen het oliefilter. Een tweede bestand met hetzelfde beeld
zou alleen een tweede bestand zijn.

**Vier groepen houden de lijntekening van de leverancier**, en dat is geen
omissie maar het resultaat van kijken:

| Groep | Waarom geen foto |
|---|---|
| Informatie / Communicatiesystemen | de catalogus geeft alleen haaienvinantennes, en die liggen onder een herhaald watermerk van de groothandel |
| Veiligheidssystemen | een kabelboom en een stekker; een airbag zelf staat er niet in |
| Hybride-/elektrische aandrijving | twee artikelen voor deze auto, waarvan een maattekening |
| Koplampreiniging | niet gezocht; dit is de kleinste groep van het rooster |

## Persluchtsysteem en Wielen/Banden - 2026-10-13, langs een andere weg

Die twee stonden hierboven eerst bij "geen foto". De eigenaar leverde er zelf
beeld voor aan en dat werkte als aanwijzing: **er is wel aanbod, het hangt
alleen niet aan de categorieboom van deze auto.**

De boom vraagt een `carId` en gaf voor Persluchtsysteem nul artikelen langs
vier eindgroepen. Een **zoekopdracht op naam** werkt zonder auto
(@docs/api/WEARPARTS.md) en gaf wel treffers:

| Zoekterm | Treffers |
|---|---|
| `persluchtpistool` | 2 |
| `luchtdrukpistool` | 50 |
| `wielmoersleutel` | 34 |
| `bandenpomp`, `kruissleutel`, `reservewiel` | 0 |

**Dat is de werkwijze voor een groep die leeg blijft**: niet nog een eindgroep
proberen, maar op naam zoeken.

**Wielen/Banden is daarmee een herziening.** Hierboven stond dat de
lijntekening daar het betere beeld was, want de catalogus gaf alleen wielbouten
en bandenspanningsensoren - en een wiel zegt meer dan een bout. Dat klopte voor
wat er toen lag; met de kruissleutel erbij is het argument weg.

| Bestand | Hoofdgroep | Merk | Grootte | Bron |
|---|---|---|---|---|
| `groep-persluchtsysteem.jpg` | Persluchtsysteem | SW-Stahl Luchtdrukpistool | 6 kB | zoekopdracht `luchtdrukpistool` |
| `groep-wielen-banden.jpg` | Wielen/Banden | HP-Autozubehor Wielmoersleutels | 8 kB | zoekopdracht `wielmoersleutel` |

### Wat de eigenaar aanleverde, en waarom het er niet in staat

Twee bestanden in `public/onderdelen/`, allebei niet gebruikt:

**`8796209381406.webp`** - een lijntekening van een bestelbus op een krik, met
de onderdelen eromheen benoemd: Krik, Wieldop, Wielmoeren, Reservewiel,
Kruissleutel. GEMETEN op tegelformaat (80x56): een lichtgrijze vlek. De
labels worden streepjes en de omtrek van de bus verdwijnt. Het is bovendien
een tekening met **Nederlandse tekst erin**, en de winkel is tweetalig - op
`/en/` zou er Nederlands in het beeld staan.

**`autojack-5-delige-compressor-accessoire-kit-air5p.webp`** - een
compressor-accessoireset. Die leest op tegelformaat juist prima: blauwe
pistolen, rode ketel, oranje slang. Niet gebruikt om een andere reden: het is
een productfoto van Autojack, een merk dat deze winkel niet verkoopt, van een
pagina waar we geen leveranciersrelatie mee hebben. **Geen watermerk is geen
licentie.** Dat is hetzelfde punt als de vier iStock-previews op de homepage en
de Alamy-preview van de schokdemper; alleen ontbreekt hier de waarschuwing in
beeld.

Het verschil met de foto's die hier wel staan is niet esthetisch maar
juridisch: die komen uit de catalogus van onze eigen groothandel en staan al
op elke productkaart in deze winkel.

Beide bestanden zijn uit `public/` gehaald - alles daar is publiek opvraagbaar
zodra het meegaat in een deploy.

## Hoe de kandidaten gevonden zijn

Per hoofdgroep een eindgroep gekozen die het onderwerp het beste toont (een
hoofdgroep heeft zelf geen artikelen: `/articles` geeft HTTP 500 op een groep
met subgroepen), en daarvan de eerste zes productfoto's opgehaald. **Via de
winkel, niet via de API** - dezelfde les als bij de schokdemper hierboven.
Daarna zes contactvellen bekeken en per groep met het oog gekozen.

Dat bekijken was het werk. Wat er langskwam en waarom het afviel: maattekeningen
met maatvoering in plaats van een foto (Uitlaatsysteem, Hybride), foto's op een
grijze ondergrond die uit de rij vallen, verpakkingsdozen in plaats van het
artikel, en watermerken die het halve beeld beslaan (SCHAFERBARTHOLD bij de
antennes, VIXA bij de motoronderdelen). Bij Asaandrijving, Stuurinrichting en
Carrosserie leverde de eerste eindgroep siliconenkit, contactringen en bumpers
met een disclaimerregel in het beeld - daar is een tweede ronde met een andere
eindgroep overheen gegaan.

## Wat er staat

| Bestand | Hoofdgroep | Grootte | Bron |
|---|---|---|---|
| `groep-aandrijfassen.jpg` | Aandrijfassen / toebehoren | 5 kB | https://cdn01.alzura.com/0185_PIC/5010352_a.JPG |
| `groep-accessoires.jpg` | Accessoires | 18 kB | https://cdn01.alzura.com/6355_PIC/ezc-ww-702_1-wm.JPG |
| `groep-airconditioning.jpg` | Airconditioning | 13 kB | https://cdn01.alzura.com/4466_PIC/KTT095004_%231.JPG |
| `groep-asaandrijving.jpg` | Asaandrijving | 5 kB | https://cdn01.alzura.com/4975_PIC/x90003_1.JPG |
| `groep-brandstofvoorbereiding.jpg` | Brandstofvoorbereiding | 11 kB | https://cdn01.alzura.com/0185_PIC/112094_a.JPG |
| `groep-carrosserie.jpg` | Carrosserie | 7 kB | https://cdn01.alzura.com/4555_PIC/5402-01-2002648P_%231.JPG |
| `groep-comfortsystemen.jpg` | Comfortsystemen | 8 kB | https://cdn01.alzura.com/0095_PIC/SDP_SDP106-WR.JPG |
| `groep-interieuruitvoering.jpg` | Interieuruitvoering | 3 kB | https://cdn01.alzura.com/4555_PIC/6010-01-061402P_%231.JPG |
| `groep-koelsysteem.jpg` | Koelsysteem | 11 kB | https://cdn01.alzura.com/4466_PIC/D1W063TT_%231.JPG |
| `groep-koppeling.jpg` | Koppeling / Montage-onderdelen | 14 kB | https://cdn01.alzura.com/0032_PIC/00323000950099.JPG |
| `groep-motor.jpg` | Motor | 21 kB | https://cdn01.alzura.com/4514_PIC/hl0144a.JPG |
| `groep-nevenbak.jpg` | Nevenbak | 10 kB | https://cdn01.alzura.com/0151_PIC/30%2094%209236_1.JPG |
| `groep-stuurinrichting.jpg` | Stuurinrichting | 8 kB | https://cdn01.alzura.com/6892_PIC/RH01-0025_%231.JPG |
| `groep-transportsystemen.jpg` | Transportsystemen | 10 kB | https://cdn01.alzura.com/2214_PIC/Atera_022785_Genio%20Pro%20Advance.JPG |
| `groep-trekhaken.jpg` | Trekhaken / Onderdelen | 7 kB | https://cdn01.alzura.com/7994_PIC/v-062.JPG |
| `groep-uitlaatsysteem.jpg` | Uitlaatsysteem | 5 kB | https://cdn01.alzura.com/0013_PIC/28682_3028472.JPG |
| `groep-vergrendelsystemen.jpg` | Vergrendelsystemen | 16 kB | https://cdn01.alzura.com/6355_PIC/ezc-ww-109_1-wm.JPG |
| `groep-versnellingsbak.jpg` | Versnellingsbak | 11 kB | https://cdn01.alzura.com/0403_PIC/28-0515_1_large.JPG |
| `groep-verwarming.jpg` | Verwarming / Ventilatie | 17 kB | https://cdn01.alzura.com/0301_PIC/122720.JPG |
| `groep-wielophanging.jpg` | Wielophanging / wiellagers | 11 kB | https://cdn01.alzura.com/0185_PIC/5500119_a.JPG |
