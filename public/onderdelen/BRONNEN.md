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
