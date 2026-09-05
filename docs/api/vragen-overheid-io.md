# E-mail aan overheid.io — vragen vóór het afsluiten van een abonnement

Concept. Gebeld op [DATUM]; zij vroegen om de vragen per e-mail. In het
Nederlands — overheid.io is een Nederlandse partij.

**Belangrijk**: zet je API-sleutel nooit in een e-mail. Verwijs naar het
e-mailadres of accountnummer waarmee de gratis sleutel is aangemaakt.

Vul in en haal weg wat niet van toepassing is. Antwoorden hieronder in dit
bestand bijwerken, en de conclusie in docs/DECISIONS.md vastleggen.

---

**Onderwerp:** Vragen over de voertuiggegevens-API vóór afsluiten abonnement

---

Goedendag,

We hebben zojuist telefonisch contact gehad; hierbij zoals afgesproken onze
vragen op papier.

Wij bouwen een Nederlandse webshop voor auto-onderdelen. Bezoekers voeren hun
kenteken in en zien welke auto daarbij hoort. We gebruiken nu de gratis
testtier van `/voertuiggegevens` en dat werkt technisch goed: de lookup op
kenteken doet wat hij moet doen. Voordat we een abonnement afsluiten hebben we
een aantal punten die we uit de documentatie niet konden opmaken.

Ons account staat op: **[E-MAILADRES / ACCOUNTNUMMER]**

## 1. Welke velden zitten in de dataset? (belangrijkste vraag)

Wij willen klanten laten zien welke onderdelen op hún auto passen. Merk en
handelsbenaming zijn daarvoor te grof — één model heeft tientallen uitvoeringen
met verschillende onderdelen. Om te kunnen koppelen aan een
onderdelencatalogus hebben we identificerende velden nodig.

- a. Bevat de dataset velden als `variant`, `uitvoering`,
  `eeg_typegoedkeuringssleutel` en/of het typegoedkeuringsnummer?
- b. Zo ja, zijn die voor vrijwel alle personenauto's gevuld, of vaak leeg?
- c. Zijn er velden die uitsluitend in een betaald abonnement beschikbaar zijn
  en niet in de testtier?
- d. Klopt het dat bandenmaat niet in deze dataset zit? Zo nee, in welke wel?

## 2. Werkt het zoek-/lijstendpoint op een betaald abonnement?

Op de testtier geeft `GET /voertuiggegevens?query=…` altijd HTTP 400
(`{"error":"ongeldige vraag"}`), ook bij de voorbeelden uit uw eigen
documentatie. De detail-lookup op kenteken werkt wel.

- a. Werkt dit endpoint wél met een betaald abonnement?
- b. Geldt dat ook voor filteren, bijvoorbeeld `filters[merk]`?

## 3. Volume en limieten

Elke bezoeker die een kenteken invoert veroorzaakt één lookup. Wij cachen
antwoorden 24 uur, dus herhaalde opvragingen van hetzelfde kenteken tellen niet
mee.

- a. Welk maandquotum hoort bij welk pakket?
- b. Wat gebeurt er bij overschrijding: worden verzoeken geblokkeerd, of wordt
  het meerverbruik in rekening gebracht?
- c. Is er een limiet per seconde of per minuut? Die staat niet in de
  documentatie.
- d. Kunnen we tussentijds op- of afschalen als het verbruik tegenvalt of
  meevalt?

## 4. Dekking en actualiteit

- a. Is het betaalde abonnement het volledige register, dus niet opnieuw een
  steekproef zoals de testtier?
- b. Hoe snel is een net geregistreerd kenteken opvraagbaar?

## 5. AVG en gegevensverwerking

Een kenteken is een persoonsgegeven, dus dit moeten we goed vastleggen.

- a. Is er een verwerkersovereenkomst, en kunnen we die vóór afsluiten inzien?
- b. Staan de servers waarop de API draait in de EU?
- c. Registreert u welke kentekens wij opvragen, en zo ja, hoe lang bewaart u
  dat?
- d. Mogen wij opgehaalde voertuiggegevens cachen? Wij bewaren een antwoord nu
  24 uur; graag bevestiging dat dat is toegestaan.

## 6. Commercieel gebruik en voorwaarden

- a. Is gebruik in een commerciële webshop toegestaan?
- b. Is bronvermelding verplicht, en zo ja, in welke vorm?
- c. Maand- of jaarcontract, en welke opzegtermijn geldt er?

## 7. Beschikbaarheid

- a. Is er een SLA of uptimegarantie?
- b. Is er een statuspagina, en hoe worden storingen gemeld?

## 8. Proefperiode

Kunnen wij vóór aanschaf een tijdelijke sleutel op de volledige dataset
krijgen, bijvoorbeeld enkele dagen? Dan kunnen we punt 1 en 2 zelf verifiëren
voordat we ons vastleggen.

---

Alvast dank. Mocht een korte call handiger zijn dan mailen, dan horen we het
graag.

Met vriendelijke groet,

**[NAAM]**
CarO — Car Parts A-Z
KvK 93396252
**[E-MAIL / TELEFOON]**
