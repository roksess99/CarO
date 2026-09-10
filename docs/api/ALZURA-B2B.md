# ALZURA API-B2B v1.2 — wat het is en wanneer we het nodig hebben

Bron: `alzura-b2b-buyer-1.2.yaml` (aangeleverd 2026-09-10, uit het klantpaneel).
**Een derde API naast Products v1.3 en Wearparts v1.6**, met een eigen host én
een eigen manier van inloggen.

| Wat | Waarde |
|---|---|
| Host | `https://api-b2b.alzura.com` |
| Auth | `X-AUTH-TOKEN`, maar **niet** onze bestaande tokens — zie hieronder |
| Verplichte header | `Accept: application/vnd.saitowag.api+json;version=1.2` |
| Verplichte header op veel routes | `country: nl` (ISO 3166-1 alpha-2, kleine letters) |

## Het belangrijkste: dit vervangt het bestellen niet

De Buyer-API bevat **geen endpoint om een bestelling te plaatsen**. Dat blijft
`POST /order` op Products v1.3 en Wearparts v1.6 (zie TYRE24.md en
WEARPARTS.md). Wat deze API toevoegt is alles wat er ná een bestelling gebeurt:

| Endpoint | Waarvoor |
|---|---|
| `PATCH /buyer/order/{order}/cancel` | Bestelling annuleren |
| `PATCH /buyer/order/{order}/position/{position}/cancel` | Eén regel annuleren |
| `GET /buyer/order/{order}/trackingrequest` | Track & trace opvragen bij de verkoper |
| `GET /buyer/order/{order}/deliverynoterequest` | Pakbon opvragen |
| `GET /buyer/order/{order}/invoicerequest` | Factuur opvragen |
| `GET /buyer/order/{order}/refundrequest` | Creditering aanvragen |
| `GET/POST /buyer/guaranteed-delivery/{order}` | Ticket als de verkoper niet levert |
| `GET/PATCH /buyer/ratings/seller/{id}` | Groothandel beoordelen |

De vier "request"-endpoints zijn **verzoeken aan de verkoper**, geen downloads:
ze geven `204` terug en mogen **één keer per 24 uur per order**. Het document
zelf komt later binnen en haal je op via de Common-API.

## Eigen inloggegevens — GEMETEN 2026-09-10

Onze bestaande tokens werken hier niet:

```
GET /common/latestorders  + TYRE24_API_TOKEN        -> 401 ERR_AUTHENTICATION_FAILURE
GET /common/latestorders  + TYRE24_WEARPARTS_TOKEN  -> 401 ERR_AUTHENTICATION_FAILURE
```

Deze API wil een token dat je haalt bij `/common/login` met **basic auth op
klantnummer + wachtwoord**. Dat is dus een derde set inloggegevens, en het
enige stuk van de leverancier waar een wachtwoord bij komt kijken in plaats van
een statisch token. Zet dat pas in `.env` als we het echt gaan gebruiken.

## Wat we nog missen

De **Common**-specificatie staat achter de login van het klantpaneel en is nog
niet geëxporteerd. Die hebben we nodig, want daar zit:

- `/common/login` — het enige pad naar een geldig token;
- de lijst met recente orders en de details van één order;
- het downloaden van orderdocumenten (factuur, pakbon);
- vervoerders en artikeltypen.

Zonder die spec is de Buyer-API niet te gebruiken: we kunnen niet eens inloggen.
Twee gokken naar plausibele paden gaven `ERR_GENERAL_INVALID_ENDPOINT`, dus de
namen moeten uit de documentatie komen en niet uit een aanname.

De **Operator**-specificatie (`/operator/login`, `/operator/orders/revenue`) is
voor medewerkers van ALZURA zelf, niet voor een retailer. Die is bewust niet in
deze map opgenomen.

## Twee dingen die het verdienen om nu al te weten

**Annuleren kan tien minuten.** `PATCH /buyer/order/{order}/cancel` werkt alleen
als de order jonger is dan tien minuten, nog niet via `/common/latestorders` is
opgehaald, én de verkoper annuleren toestaat. Onze klant heeft veertien dagen
bedenktijd. Zegt hij op dag drie af, dan kunnen wij bij de groothandel niets
meer annuleren: dan is het een retour, met de retourvoorwaarden van díe
groothandel. Dat is een bedrijfsrisico, geen technisch detail — zie
DECISIONS.md #4.

**Wij betalen de groothandel per incasso.** De offerte van `GET /order` geeft
`paymentMethodId: 1`, en dat is in deze documentatie SEPA-incasso. Het geld voor
de inkoop wordt dus van onze rekening afgeschreven, los van wat de klant via
Mollie betaalt.
