# E-mail aan ALZURA / Tyre24 — openstaande vragen

Concept om te versturen naar de support-/API-afdeling. In het Nederlands, na
telefonisch contact met de Nederlandse vestiging. Vul je klantnummer in en haal
weg wat je niet wilt vragen.

**Belangrijk**: zet je API-token nooit in een e-mail. Verwijs naar je klant- of
accountnummer; support kan het token daaraan koppelen.

---

**Onderwerp:** REST API v1.3 (Products) — vragen over productfoto's, activatie van
product areas en voertuigzoeken

---

Beste ALZURA / Tyre24,

Wij bouwen een Nederlandse webshop op uw Products REST API v1.3. Ons API-token
werkt: we kunnen areas, categorieën, artikelen en prijzen ophalen. Voordat we
live gaan hebben we een aantal vragen die we niet uit de Swagger-documentatie
konden beantwoorden.

Ons klant-/accountnummer: **[VUL IN]**

---

**1. Productfoto's: wat moet er op de plaats van de `%s` komen?**

Dit is onze meest urgente vraag, omdat we op dit moment helemaal geen
productfoto's kunnen tonen.

Elke `media[].imageLink` die we ontvangen bevat twee `%s`-plaatshouders, in elke
product area waar we toegang toe hebben:

- Banden (area 6):
  `https://media3.tyre-shopping.com/images/tyre/26064-PTY-%s-%s-br1.jpg`
- Gebruikte onderdelen (area 10):
  `https://media1.tyre-shopping.com/mediamanagement/b2b_productarea_up/2026/5/26/33/255333/3947354-X-%s-%s-br1.jpeg`
- OE-onderdelen (area 3):
  `https://media1.tyre-shopping.com/mediamanagement/category_logo_neutral/2025/7/7/10/13/666081-X-%s-%s-br1.jpg`

Wat we hebben geprobeerd:

- De URL ongewijzigd opvragen (met `%s` er nog in) geeft **HTTP 400**.
- Breedte en hoogte invullen (`200-200`, `400-400`, `800-600`, `1-1`, `0-0`)
  geeft **HTTP 500**, met een responsebody die altijd exact 12.240 bytes is:
  een algemene JPEG van 300×225, ongeacht het gevraagde formaat.

Kunt u ons vertellen:

- a. Welke waarden horen er in de twee `%s`-plaatshouders, en zijn er vaste
  toegestane formaten?
- b. Zijn er überhaupt echte productfoto's beschikbaar voor banden en
  OE-onderdelen, of is `category_logo_neutral` (zoals in het area 3-voorbeeld
  hierboven) het enige beeld dat we voor die artikelen krijgen?
- c. Is er een apart media-/CDN-endpoint dat we zouden moeten gebruiken?

---

**2. Kan product area 3 ("Original-Ersatzteile") op het NL-platform geactiveerd
worden?**

Wij verkopen aan Nederlandse consumenten en werken dus tegen
`https://tyre24.alzura.com/nl/nl/rest/v13/products`.

- Op `/de/de/` werkt area 3: zoeken op OE-nummer `06A115561B` geeft twee
  Volkswagen-oliefilters met voorraad en prijzen.
- Op `/nl/nl/`, `/be/nl/` en `/fr/fr/` geeft hetzelfde verzoek
  `ERR_B2B_PRODUCTAREA_INACTIVE` ("Requested b2b productarea is not active on
  platform 'nl'!").

Kan product area 3 voor ons account op het **nl**-platform geactiveerd worden?
Als daar een ander contract of een overeenkomst voor nodig is, horen we graag
wat er nodig is.

Dezelfde vraag geldt voor **area 10 (gebruikte onderdelen)** en **area 1
(toebehoren)**: beide geven categorieën op `/de/de/` maar zijn leeg op
`/nl/nl/`. Activering op nl zou ons ook Nederlandse categorienamen geven in
plaats van Duitse.

---

**3. Documentatie van het voertuigzoeken (TecDoc)**

Area 3 meldt `showTecDocVehicleSearch: true`, maar heeft ook
`searchableByCategory: false`, en zoeken werkt alleen met een volledig, exact
OE-nummer (gedeeltelijke nummers, wildcards en productnamen geven allemaal 0
resultaten). Onze klanten kunnen dus niet bladeren of zoeken tenzij ze het exacte
OE-nummer al kennen.

De Products API lijkt geen voertuig-endpoints te bevatten — `/carBrands`,
`/carModels`, `/carTypes`, `/vehicles`, `/articles` en `/tecdoc` geven allemaal
HTTP 400. Tegelijk bevat het Swagger-bestand definities die door geen enkel
gedocumenteerd endpoint gebruikt worden (`assemblyGroup`,
`CategoryBySearchString`, `ArticlesDirectSearch`, `vehicleIdentification`), wat
erop wijst dat er een aparte API bestaat.

- a. Bestaat er een aparte onderdelen-/TecDoc-API, en kunt u ons de documentatie
  daarvan sturen?
- b. Is het mogelijk om onderdelen op voertuig op te zoeken (merk → model →
  type, of via een TecDoc-voertuig-id), zoals de Alloys API dat doet met
  `carBrands` / `carModels` / `carTypes`?
- c. Onze klanten voeren een Nederlands kenteken in, waarmee wij via het RDW
  merk, model, type, cilinderinhoud en vermogen ophalen. Is er een ondersteunde
  manier om dat om te zetten naar een TecDoc-voertuig-id, zodat we alleen
  passende onderdelen tonen?
- d. **Heeft u zelf een kentekenzoeker?** Verschillende TecDoc-licentiehouders
  bieden een zoekfunctie op kenteken (kenteken → voertuig). Is zoiets voor ons
  beschikbaar, in de Products API, de Alloys API of als losse ALZURA-dienst? En
  zo ja, wordt Nederland ondersteund?
- e. Als die bestaat: geeft hij direct een TecDoc-voertuig-id terug (zodat we
  daarmee op onderdelen kunnen filteren), zit het in ons huidige abonnement of
  wordt het apart gefactureerd, en gelden er limieten per aanroep of per maand?

---

**4. Zijn de prijzen in de API exclusief btw?**

Elk artikel geeft een prijsblok met `type: "ek"` en één met `type: "evp_3"`
(bijvoorbeeld `ek 27.63` en `evp_3 48.00` voor een band).

- a. Kunt u bevestigen dat beide bedragen **exclusief btw** zijn?
- b. Is `evp_3` de adviesverkoopprijs, en wat betekenen de andere
  `evp_*`-varianten?

We hebben hier zekerheid over nodig, omdat Nederlandse consumenten prijzen
inclusief btw getoond moeten krijgen. Tellen we 21% btw op bij een bedrag waar
die al in zit, dan klopt elke prijs in onze shop niet.

---

**5. Welke overeenkomsten hebben we nodig voordat we kunnen bestellen?**

Area 3 heeft `agreementNeeded: true`. We zien de endpoints `/agreementList`,
`/agreementPdfs` en `/newPdfAgreement` in de documentatie.

- a. Welke overeenkomsten moeten er liggen voordat `POST /order` slaagt?
- b. Is dat per groothandel, en kan het volledig via de API geregeld worden, of
  zijn er handmatige stappen aan uw kant nodig?

---

**6. Is er een Engels platform, en kunnen Nederlandstalige areas uitgebreid
worden?**

De taal lijkt vast te zitten aan het landplatform in het base path. We hebben
`nl/en`, `de/en`, `gb/en`, `uk/en` en `en/en` geprobeerd — geen daarvan
reageert. Werkende platformen geven `nl`, `de`, `fr`, `it`, `es` en `pl`.

- a. Is er een Engels platform dat we over het hoofd zien? Onze shop bedient
  klanten in het Nederlands én Engels, en op dit moment zien onze Engelstalige
  bezoekers Nederlandse (of Duitse) categorie- en filternamen.
- b. Product areas 1 (toebehoren), 9 (gereedschap) en 10 (gebruikte onderdelen)
  geven alleen categorieën op `de/de`, waardoor al hun categorienamen,
  productomschrijvingen en filterlabels Duits zijn — ook voor Nederlandse
  klanten. Kunnen die areas op het `nl`-platform beschikbaar gemaakt worden?

---

**7. Twee documentatiedetails die we al testend vonden**

Geen vragen, maar mogelijk nuttig voor uw documentatie:

- Paginering is **nul-gebaseerd**: `page=1` geeft de *tweede* pagina. Dit staat
  niet in de Swagger en heeft ons wat tijd gekost.
- Het veld `filter` in de `/items`-respons is een **object** bij een
  categorie-verzoek, maar een **lege array** bij een `itemId`-verzoek. Strikt
  getypeerde clients lopen daarop stuk.

---

Alvast hartelijk dank. Is het makkelijker om dit telefonisch of in een call door
te nemen, dan doen we dat graag.

Met vriendelijke groet,

**[NAAM]**
CarO — Car Parts A-Z
KvK 93396252
**[E-MAIL / TELEFOON]**
