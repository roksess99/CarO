# overheid.io — RDW voertuiggegevens (kentekenzoeker)

Bron: officiële documentatie op https://overheid.io/documentatie/voertuiggegevens.
Gebruikt voor "past dit op mijn auto": klant voert kenteken in, wij tonen de auto.

## Basisfeiten

| Wat | Waarde |
|---|---|
| Host | `https://api.overheid.io/voertuiggegevens` |
| Detail | `GET /voertuiggegevens/{kenteken}` — kenteken zonder streepjes, bv. `RZ874H` |
| Zoeken | `GET /voertuiggegevens?query=…&queryfields[]=…&filters[]=…` (nog niet gebruikt) |
| Auth | Header **`ovio-api-key: <sleutel>`** (kan ook als GET/POST-parameter — doen we niet, zie hieronder) |
| Sleutel | Account op overheid.io. Nu de **gratis testtier**; live dataset vereist een abonnement |
| Verversing | Dataset wekelijks volledig bijgewerkt, dagelijks nieuwe kentekens toegevoegd |

## Wat de testtier wel en niet kan (gemeten op 2026-08-07)

De gratis tier is géén volledige dataset maar **een willekeurige greep van 10.000
voertuigen** uit de ~15 miljoen in het RDW-register. Praktische gevolgen:

| Endpoint | Status op de testtier |
|---|---|
| `GET /voertuiggegevens/{kenteken}` | **Werkt.** Zonder sleutel HTTP 401, met sleutel HTTP 200 of 404 |
| `GET /voertuiggegevens?...` (lijst/zoeken) | **HTTP 400 `{"error":"ongeldige vraag"}`** op elke variant, ook op de voorbeelden uit de documentatie. Niet beschikbaar op deze tier |

- **Een willekeurig kenteken geeft vrijwel zeker 404**: de kans dat een specifiek
  kenteken in de greep van 10.000 zit is ~0,07%. De voorbeelden uit de
  documentatie (`RZ874H`, `4TFL24`) zitten er níet in. Een 404 tijdens
  ontwikkeling betekent dus meestal **niet** dat de code fout is.
- Omdat het lijst-endpoint 400 geeft, kun je geldige testkentekens niet via de
  API opzoeken — die moet je uit het overheid.io-dashboard halen.
- Zodra er een abonnement is: opnieuw verifiëren of het lijst-endpoint werkt.
  Dat endpoint is interessant voor "zoek op merk" (`filters[merk]`).

## Rol sinds 2026-09-07: verrijking, geen ingang

De kentekenzoeker draait **niet meer op deze API als eerste bron**. Wearparts
(docs/api/WEARPARTS.md) heeft zijn eigen Nederlandse kentekenlookup én levert het
TecDoc-voertuig-id waarmee we passende onderdelen tonen. overheid.io vult aan wat
TecDoc niet heeft: kleur, APK-vervaldatum, datum eerste toelating en de officiele
kentekennotatie.

**Waarom omgedraaid:** de actie bevroeg eerst het RDW en stopte bij een 404. Op
de gratis tier is dat vrijwel elk kenteken — gemeten op XN331L, 84HKG6 en RZ874H
gaf overheid.io drie keer 404 terwijl Wearparts alle drie de autos kende. De
zoeker zei dus "onbekend kenteken" over autos die gewoon bestaan.

Beide bronnen worden nu parallel bevraagd; RDW wint per veld waar hij iets heeft,
want dat beschrijft dít exemplaar terwijl TecDoc het model beschrijft. Een
abonnement op overheid.io is daarmee **niet nodig voor fitment**, alleen voor die
extra velden.

## Onze aanpak — twee harde regels

1. **De sleutel blijft server-side.** De browser praat nooit rechtstreeks met
   overheid.io. Het opzoeken loopt via een Server Action
   (`src/components/vehicle/actions.ts`) die de adapter aanroept. Daarom ook
   de header-variant en niet de GET-parameter: sleutels horen niet in URL's.
2. **Een kenteken staat nooit in een URL.** Een kenteken is een
   persoonsgegeven (AVG): het is herleidbaar naar een voertuig en daarmee
   indirect naar een eigenaar. Dus geen `/nl/voertuig/RZ874H`-routes, geen
   querystring, en niet meeloggen bij fouten. Het kenteken gaat in de
   POST-body van de Server Action en blijft daarna in localStorage bij de klant.

## Mapping naar ons contract (`src/lib/vehicle/types.ts`)

De dataset heeft ~60 velden; wij nemen wat de klant nodig heeft om te
bevestigen "ja, dit is mijn auto".

| `Vehicle`-veld | RDW-bron |
|---|---|
| `plate` | `kenteken` (genormaliseerd, zonder streepjes) |
| `plateFormatted` | `kentekenplaat` ("RZ-874-H") |
| `brand` | `merk` |
| `model` | `handelsbenaming` |
| `vehicleType` | `voertuigsoort` |
| `firstAdmissionYear` | `datum_eerste_toelating` (eerste 4 tekens) |
| `fuel` | `brandstof[0].brandstof_omschrijving` |
| `powerKw` | `brandstof[0].nettomaximumvermogen` |
| `engineCapacityCc` | `cilinderinhoud` |
| `color` | `eerste_kleur` |
| `apkExpiry` | `vervaldatum_apk` |

## Aandachtspunten

- **Kentekenvalidatie**: alle Nederlandse sidecodes zijn 6 tekens. We checken
  op `^[A-Z0-9]{6}$` en laten de API het echte oordeel geven — een regex per
  sidecode is fragiel en blokkeert geldige kentekens.
- **Rate limit** staat niet in de documentatie; de tiers hebben wel een
  maandquotum aan API-calls. Antwoorden worden een dag gecacht
  (`revalidate: 86400`); voertuiggegevens wijzigen zelden.
- **Mapping is getest** tegen het gedocumenteerde `RZ874H`-antwoord: alle 11
  velden komen correct door, en kentekennotaties ("RZ-874-H", "rz874h",
  "rz 874 h") normaliseren allemaal naar `RZ874H`.
- **Fitment is nog niet gekoppeld.** Deze API levert merk/model/motorgegevens,
  géén koppeling naar passende onderdelen. Daarvoor is TecDoc-data nodig via
  Tyre24 (`tecDocData`, `linkedTargetId` — zie docs/api/TYRE24.md). Zie
  docs/DECISIONS.md #6.

## Environment-variabele

```
OVERHEID_IO_API_KEY=   # overheid.io account → API-sleutel. NOOIT committen
```

Zonder sleutel geeft de zoeker een nette "tijdelijk niet beschikbaar"-melding;
de rest van de site werkt normaal.
