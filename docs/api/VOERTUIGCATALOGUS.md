# Merk/model-catalogus — RDW open data

Bron voor klanten die hun auto kiezen zonder kenteken.

| | |
|---|---|
| Dataset | `opendata.rdw.nl` — `m9d7-ebf2` (Gekentekende voertuigen) |
| Sleutel | **geen**, publiek toegankelijk |
| Kosten | gratis |
| Oogstscript | `scripts/harvest-vehicle-catalog.mjs` |
| Uitvoer | `src/lib/vehicle/vehicle-catalog.json` (~90 kB) |
| Laatste oogst | 2026-08-11 — 60 merken, 914 modellen |

Opnieuw oogsten:

```bash
node scripts/harvest-vehicle-catalog.mjs
```

## Waarom RDW en geen commerciële voertuig-API

Gemeten 2026-08-11 op twee kandidaten. Beide vielen af op hetzelfde punt:
het zijn Noord-Amerikaanse databases.

### carapi.dev — afgevallen

| Meting | Uitkomst |
|---|---|
| `GET /v1/listing` | Advertentiefeed van losse voertuigen met VIN, **geen** merk/model-catalogus |
| Modellen per merk | Toyota levert 4Runner, Tacoma, Tundra, Sequoia, Venza — Amerikaanse modellen |
| Volledigheid | `offset` 0→50 leverde nog maar 3 nieuwe modellen; je weet nooit of de lijst compleet is |
| Gratis plan | **100 requests per maand** (`X-Ratelimit-Remaining`), onbruikbaar voor een keuzelijst |
| `GET /v1/photos/{vin}` | 0 van 50 listings had `imagesCount > 0`; endpoint gaf `{"photos": []}` |
| `GET /v1/plate-to-vin` | Ondersteunt alleen **PL, NO, SK, SE, CZ, US** — geen NL |

Gevolg voor foto's: er is geen route van een Nederlands kenteken naar een VIN,
en de foto's zijn bovendien opnames van dát specifieke voertuig uit hun
advertentiebestand — niet van het model. Ook met een betaald plan zou "toon
de auto van de klant" dus niet werken.

### carapi.app — afgevallen

Heeft wél een echte merk/model/bouwjaar/uitvoering-catalogus, maar de
merkenlijst telt 68 merken en mist **Peugeot, Renault, Citroën, Opel, Škoda,
SEAT, Dacia en Vauxhall**. Europese premiummerken zitten erin (die worden in
de VS verkocht), de Europese volumemerken niet. In Nederland staan Peugeot,
Opel en Renault op plek 3, 4 en 5.

## Waarom deze bron wél past

Personenauto's in Nederland, gemeten 2026-08-11:

| Merk | Voertuigen |
|---|---|
| Volkswagen | 1.247.168 |
| Toyota | 784.185 |
| Peugeot | 654.167 |
| Opel | 651.130 |
| Renault | 647.572 |

Belangrijker nog: **de kentekenzoeker leest dezelfde dataset**
(docs/api/OVERHEID-IO.md). Merk en model die de klant in de kiezer aanklikt
zijn dus letterlijk dezelfde tekst als wat een kentekencheck teruggeeft. De
twee manieren om een auto op te geven zijn daarmee uitwisselbaar, zonder
vertaaltabel.

## Wat het oogstscript opruimt

`handelsbenaming` is vrije tekst die de dealer heeft ingetypt. Zonder
opschoning krijg je 7.652 varianten voor alleen Volkswagen.

| Probleem | Voorbeeld | Aanpak |
|---|---|---|
| Maskeringen | `0*****`, `2*****` | Regels met `*` of `?` weg |
| Merk in de modelnaam | `PEUGEOT 107` | Eerste woord weg als het op de eerste 4 letters van het merk begint — vangt ook typefouten als `PEUGOT 108` |
| Uitvoeringsdetails | `ID.3 PRO 150 KW` | Vermogen, motorinhoud en `PRO` eruit |
| Generatiecodes | `Corsa-b`, `Zafira-a` | Losse letter na koppelteken weg |
| Varianten | `Astra Sports Tourer`, `Astra GTC` | Samengevoegd in `Astra`; de generatie kiest de klant met het bouwjaar |
| Schrijfwijzen | `UP!` naast `UP` | Samengevoegd op alfanumerieke sleutel |
| Dubbele merken | `VW` naast `VOLKSWAGEN` | Aliastabel in het script |
| Kale typenummers | `111011` | Weg als er geen letter in zit |

**Camperbouwers zijn bewust uitgesloten** (Hymer, Adria, Knaus, Dethleffs en
zeven andere). Ze staan als personenauto geregistreerd, maar hun modelnamen
zijn opbouwnamen terwijl de onderdelen van het basisvoertuig komen — meestal
een Fiat Ducato. Wie hier zijn camper koos, zou nooit een passend onderdeel
vinden.

## Grenzen

- **Alleen personenauto's.** Tweewielers staan wel in ons assortiment maar nog
  niet in deze catalogus; dat vraagt een tweede oogst op `voertuigsoort`.
- **Geen bandenmaat.** RDW open data heeft die niet — gecontroleerd, de enige
  band-datasets gaan over rupsbanden (landbouw). Banden filteren op maat kan
  dus niet vanuit het kenteken.
- **Geen koppeling naar onderdelen.** De catalogus zegt wélke auto de klant
  heeft, niet welke onderdelen erop passen. Dat blijft docs/DECISIONS.md #6.
