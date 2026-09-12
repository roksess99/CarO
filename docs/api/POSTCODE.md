# gratis-postcodedata.nl — adres opzoeken bij postcode en huisnummer

Bron: [LJPc-solutions/Nederlandse-adressen-en-postcodes](https://github.com/LJPc-solutions/Nederlandse-adressen-en-postcodes).
Gebruikt door `src/lib/address/postcode-data.ts` om in de checkout straat en
plaats in te vullen zodra de klant postcode en huisnummer heeft getypt.

| Wat | Waarde |
|---|---|
| Endpoint | `GET https://gratis-postcodedata.nl/api/postcode/{postcode}/{huisnummer}` |
| Auth | **geen** — geen registratie, geen sleutel, geen env-variabele |
| Rate limit | 60 verzoeken per minuut per IP |
| Onderliggende data | BAG van het Kadaster, CC0 |
| Antwoord | JSON-array; wij nemen alleen `straat` en `plaats` |

## Gemeten 2026-09-12 op de echte dienst

| Aanvraag | Antwoord |
|---|---|
| `1012AB/1` | `Stationsplein`, `Amsterdam` — 70 ms |
| `7038DE/2` | `Gildebongerd`, `Zeddam` — ons eigen vestigingsadres |
| `1012 ab/1` | werkt ook met spatie en kleine letters |
| `9999ZZ/1` | HTTP 404, `{"error":"Adres niet gevonden"}` |
| `1012AB/9999` | HTTP 404 — bestaande postcode, onbekend huisnummer |

De dienst zet `Access-Control-Allow-Origin: *`, dus hij zou ook rechtstreeks
vanuit de browser te bevragen zijn. Dat doen we bewust niet, zie hieronder.

## Drie keuzes die erin zitten

**Het is een gemak, geen voorwaarde.** Gratis dienst, geen uptimegarantie. Elke
fout — netwerk, timeout (4 s), onverwacht antwoord — eindigt in `unavailable`,
en dan laat het formulier de klant straat en plaats gewoon zelf invullen. Een
checkout die vastloopt omdat een adressendienst offline is, is erger dan een
checkout zonder automatisch invullen.

**De vraag gaat via onze server**, met een Server Action als tussenstap
(`src/components/checkout/address-actions.ts`). Vanuit de browser zou de klant
zijn IP-adres én zijn adres afgeven aan een partij waar hij niets mee te maken
heeft. Nu ziet de dienst alleen onze server.

**Postcode en huisnummer komen nooit in een logregel** — dezelfde regel als bij
het kenteken (docs/api/OVERHEID-IO.md). De foutregel bij een onverwachte status
draagt alleen het HTTP-nummer.

## Aandachtspunten

- **De rate limit geldt voor onze server, dus voor de hele winkel tegelijk**,
  net als bij Tyre24. Eén bestelling kost één opzoekactie, dus 60 per minuut is
  ruim; de antwoorden worden bovendien dertig dagen gecacht (`next.revalidate`)
  — een adres verhuist niet.
- **Het huisnummer moet een getal zijn.** De klant typt "12", "12A" of "12-3";
  wij sturen de cijfers vooraan. Een huisletter of toevoeging verandert straat
  en plaats niet.
- De dienst levert meer velden (gemeente, provincie, lat, lon). Zod pikt er
  alleen `straat` en `plaats` uit; de rest hoort niet in onze code te lekken.
- Alleen Nederland. Het land staat in de checkout vast op NL, dus dat valt nu
  samen — komt er ooit een tweede land bij, dan moet de opzoekactie overgeslagen
  worden in plaats van een 404 te tonen.
