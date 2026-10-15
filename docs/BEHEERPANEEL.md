# Het beheerpaneel — bouwbeschrijving

**Voor wie dit leest: je bouwt dit paneel na in een andere webshop.** Dit
document beschrijft wat er staat, waarom het zo staat, en welke regels je niet
mag versoepelen zonder dat het geld of een boete kost. Het is geschreven om
zelfstandig te lezen te zijn — je hebt de CaroParts-codebase er niet bij nodig.

Wat het **niet** is: een kopieerbaar bestand. De schermen hangen aan de
domeinlogica van deze winkel (banden, kortingen, retouren). Wat overdraagbaar
is, is de **opzet**: de toegang, de rollen, het logboek, de volgorde waarin
geldhandelingen moeten gebeuren, en een stuk of tien valkuilen die hier allemaal
één keer zijn ingelopen.

---

## 1. Aannames over de stack

Dit paneel draait op:

| Onderdeel | Hier | Vervangbaar door |
|---|---|---|
| Framework | Next.js 16, App Router, React Server Components | Elk framework met server-side rendering en een vorm van server actions |
| Taal | TypeScript strict, geen `any` | — |
| Database | MySQL/MariaDB met InnoDB | PostgreSQL; let op het stuk over `SELECT … FOR UPDATE` |
| Mutaties | Server Actions | Een POST-endpoint per handeling; de regels in §5 gelden dan net zo |
| Styling | Tailwind | Vrij |
| Externe pakketten | **geen** voor de toegang | — |

**Er zit geen auth-bibliotheek in**, en dat is een keuze geweest (zie §4). Alles
wat het paneel aan beveiliging doet, komt uit `node:crypto`. Dat is ongeveer 500
regels code voor wachtwoorden, 2FA en sessies samen. De afweging staat in §4.0.

---

## 2. De vorm

```
/beheer                     dashboard
/beheer/login               inlogscherm
/beheer/setup               de allereerste beheerder, sluit zichzelf
/beheer/uitnodiging/[token] een uitnodiging aannemen
/beheer/facturen            facturenlijst met zoeken en jaar/maand-splitsing
/beheer/facturen/[nr]/pdf   de factuur-PDF (route handler, geen pagina!)
/beheer/prijzen             verkoopprijs van het assortiment
/beheer/kortingen           tijdelijke acties
/beheer/kortingscodes       codes met teller en looptijd
/beheer/beoordelingen       beoordelingen beantwoorden en uitnodigen
/beheer/verzending          track & trace naar de klant sturen
/beheer/retouren            retouren afhandelen en terugbetalen
/beheer/beheerders          uitnodigen, rollen, toegang intrekken
```

Vier dingen over die structuur:

**Het paneel staat buiten de meertalige tak van de winkel.** De winkel leeft
onder `/[locale]/…`, het paneel niet. Een beheerpaneel hoeft niet tweetalig te
zijn, en een taalvoorvoegsel in de URL levert alleen maar verwarring en dubbele
routes op.

**Het heeft een eigen wortel-layout.** Omdat er geen gedeelde `app/layout.tsx`
is, zet het paneel zelf `<html>` en `<body>`. Eén vast thema (licht): de winkel
mag donker omdat de bezoeker dat kiest, hier zou een themaschakelaar werk zijn
waar niemand om vroeg.

**`noindex, nofollow, nocache` in de metadata én een regel in `robots.txt`.**
Allebei. De eerste houdt het uit de index, de tweede houdt crawlers van de deur.

**Elke pagina is `force-dynamic`.** Een beheerpagina die uit de cache komt, toont
de cijfers van een uur geleden aan iemand die net iets veranderd heeft. (In deze
winkel is dat één keer op een andere pagina misgegaan en kostte het een dag
zoeken — een afrekenpagina stond een etmaal vast in de cache.)

---

## 3. Het dashboard

Eén scherm met vier blokken, elk alleen zichtbaar voor wie het recht heeft:

| Blok | Inhoud |
|---|---|
| Knoppenbalk | Eén knop per scherm, met het recht erachter |
| Bestellingen | Aantallen per status (betaald / wacht op betaling / mislukt), omzet, en de laatste bestellingen met klantnaam |
| Facturen | Totaal per jaar en per maand, nieuwste jaar uitgeklapt |
| Bezoek | Bezoeken, paginaweergaven, soort pagina, herkomst, en de trechter: in winkelwagen → afrekenen geopend → betaling gestart → betaald |

Plus **meldingen die bovenaan komen als er iets mis is**, voor iedereen ongeacht
rol:

- de betaaldienst neemt geen betalingen aan;
- de leverancier weigert onze API-sleutel;
- er staat een retour te wachten.

Die eerste twee zijn de belangrijkste les van dit hele paneel en krijgen een
eigen paragraaf (§8).

> **De knoppenbalk is de etalage, niet het slot.** Elke knop draagt het recht
> dat erachter zit, zodat niemand een knop ziet die hij toch niet mag openen.
> De echte controle staat in de pagina én in elke actie erachter.

---

## 4. Toegang

### 4.0 Waarom geen auth-bibliotheek

Afgewogen tegen Auth.js/better-auth en tegen HTTP Basic van de hostingpartij.
Doorslaggevend was: dit paneel heeft één tot vijf gebruikers, geen OAuth, geen
wachtwoord-vergeten-mail, geen sociale logins. Wat overblijft is een hash, een
cookie en een HMAC — en dat is minder code dan de configuratie van een
bibliotheek die het allemaal kan.

**Ga niet uit van deze keuze als je een flow erbij wilt** (magic links, SSO,
wachtwoord vergeten). Dan wint een bibliotheek alsnog.

### 4.1 Inloggen vraagt drie velden tegelijk

Mailadres, wachtwoord **en** de zescijferige code, in één formulier.

Een tweetrapsscherm ("eerst wachtwoord, dan code") leest prettiger, maar vraagt
een half-ingelogde toestand tussen de twee stappen — en dat is precies het soort
tussenstand waar beveiligingsfouten in zitten. Drie velden tegelijk heeft die
toestand niet.

**Eén foutmelding voor alles.** Bestaat het mailadres niet, is het wachtwoord
fout, of klopt de code niet: dezelfde zin. Anders vertel je een aanvaller welke
helft hij al goed had.

### 4.2 Wachtwoorden: scrypt uit `node:crypto`

```
scrypt$32768$8$1$<salt base64>$<key base64>
```

- N=32768, r=8, p=1, 32 bytes sleutel. Kost ~33 MB geheugen en ~0,1 s per
  poging — dat is de bedoeling, het maakt gokken duur.
- **`maxmem` moet expliciet omhoog** (hier 64 MB). Node's standaard is 32 MB en
  deze parameters ketsen daar net op af; zonder die regel werkt het op geen
  enkele machine.
- Het formaat draagt zijn eigen parameters, zodat N later omhoog kan zonder dat
  bestaande wachtwoorden onbruikbaar worden.
- Vergelijken met `timingSafeEqual`, en eerst de lengtes gelijk controleren —
  die functie gooit bij ongelijke lengtes, en dat verschil verklapt zelf al iets.
- Eis: **minimaal 12 tekens**, maximaal 200. Bewust geen
  hoofdletter-cijfer-teken-regels: die leveren `Wachtwoord1!` op. Lengte is wat
  telt.

**Waarom niet bcrypt of argon2:** allebei native modules die bij het installeren
gecompileerd worden. Deze winkel draait op gedeelde hosting waar een deploy al
eens omviel op een module die niet goed meekwam. Een wachtwoordbibliotheek die
alleen op de bouwmachine werkt en niet op de server is precies het soort
probleem dat je pas merkt als niemand meer kan inloggen.

> *Let op bij het overnemen:* in de migratie van deze winkel staat in een
> SQL-commentaar nog "argon2/bcrypt". Dat is achterhaald; de code doet scrypt.

### 4.3 Tweestapsverificatie (TOTP, RFC 6238)

Kost niets: het is een open standaard en de rekensom zit in `node:crypto`.
Google Authenticator, 1Password, Authy en Bitwarden spreken allemaal dezelfde
taal.

- 30 seconden per code, 6 cijfers, HMAC-SHA1.
- **Venster van één stap terug en vooruit.** Een klok die een halve minuut
  voorloopt werkt dan nog; een beheerder die niet meer binnenkomt is erger dan
  dertig seconden extra geldigheid.
- **SHA-1 is hier geen fout.** De RFC schrijft het voor en elke app gaat ervan
  uit. De aanval op SHA-1 gaat over botsingen bij handtekeningen, niet over HMAC
  met een geheime sleutel.
- **Het geheim gaat versleuteld de database in**, met een sleutel uit de
  omgeving (`ADMIN_TOTP_KEY`). Anders kan iedereen met leestoegang tot de
  database zelf codes maken — dan is de tweede stap geen tweede stap. *Die
  sleutel hoort dus niet in dezelfde back-up als de database.*
- **`totp_confirmed_at` blijft leeg tot de eerste code goed is ingetypt.** Zonder
  die stap sluit een verkeerd ingestelde app iemand buiten zijn eigen winkel.
- **Herstelcodes** (gehasht opgeslagen, eenmalig bruikbaar). Een verloren
  telefoon zonder herstelcode is een permanent gesloten deur.

### 4.4 Sessies

- De cookie draagt een willekeurig teken van 32 bytes; in de database staat
  **alleen de SHA-256-afdruk**. Wie de database leest kan er dus niet mee
  inloggen.
- Cookie: `httpOnly`, `sameSite: lax`, `secure` alleen in productie (lokaal
  draait het op http en zou `secure` de cookie weggooien), **`path` beperkt tot
  `/beheer`** — de cookie gaat dus niet mee met elke winkelpagina.
- Twaalf uur geldig, schuift mee zolang iemand bezig is. Het bijwerken gebeurt
  pas als de sessie een uur oud is; elke paginaweergave de database laten
  schrijven is zonde.
- **Uitloggen is een rij verwijderen.** Dat is het verschil met een ondertekend
  teken dat zichzelf bewijst: een gestolen cookie blijft daarbij geldig tot hij
  verloopt en daar kun je niets tegen doen. Nu wel, ook vanaf een ander apparaat.
- Toegang ingetrokken terwijl er nog een sessie liep → meteen ongeldig, want de
  rol en de status worden bij **elke** aanvraag opnieuw gelezen.

### 4.5 Snelheidsrem op het inloggen

Vijf pogingen per vijftien minuten, **in het geheugen van het proces**. Een
tabel erbij zou een schrijfactie per inlogpoging kosten en precies de aanval
goedkoop maken die hij moet tegenhouden.

Wat het níet is: bescherming tegen een botnet met duizend adressen. Het houdt de
gewone gokker tegen; de echte verdediging is scrypt plus de tweede stap. Draai je
op meerdere servers, dan moet dit mee naar een gedeelde opslag.

De melding zegt **over hoeveel seconden het weer mag**. Dat is eerlijker tegen
de beheerder die zich vertypte dan een dichte deur zonder uitleg.

### 4.6 De eerste beheerder

`/beheer/setup` werkt alleen als er **nul** actieve beheerders zijn én er een
`ADMIN_SETUP_TOKEN` in de omgeving staat dat meegegeven wordt. Zodra de eerste
beheerder bestaat, sluit het scherm zichzelf.

### 4.7 Uitnodigen

Een uitnodiging is een mail met een link die een willekeurig teken draagt; in de
database staat **alleen de afdruk**. De uitnodiging verloopt, is eenmalig, en
het accepteren gebeurt zonder ingelogd te zijn — dat is het hele punt, de
genodigde heeft nog geen account. Het teken wordt bij elke stap opnieuw
gecontroleerd.

---

## 5. Rollen en rechten

### De matrix staat op één plek

```ts
type Permission =
  | "bestellingen"   // klantgegevens: naam, adres, mailadres
  | "facturen"       // facturen, PDF's, omzet
  | "prijzen"        // de verkoopprijs van het hele assortiment
  | "kortingen"      // acties en codes: geld weggeven
  | "beoordelingen"
  | "retouren"       // geld terugboeken
  | "beheerders"     // rechten uitdelen
  | "statistieken";

const MATRIX = {
  eigenaar:   /* alles */,
  boekhouder: ["facturen"],
  marketing:  ["kortingen", "beoordelingen", "statistieken"],
};
```

**Drie vaste rollen, geen vinkjes per persoon.** Vinkjes klinken flexibeler maar
leveren combinaties op die niemand nodig heeft en die niemand test — "mag
prijzen wijzigen maar geen facturen zien" is geen functie, dat is een ongeluk.

**Eén recht per scherm, niet per knop.** Grover, en dat is de bedoeling: wie de
kortingenpagina mag openen, mag daar ook een korting aanzetten — anders is het
scherm zinloos.

**Twee rechten blijven altijd bij de eigenaar**, hoe je de rest ook verdeelt:
`prijzen` (zet in één formulier de verkoopprijs van de hele winkel om) en
`beheerders` (kan rechten uitdelen, en daarmee élk ander recht).

**Dit bestand mag de database niet aanraken.** Een client component moet het
kunnen importeren om een knop te verbergen; trekt het een databasedriver mee,
dan belandt die in de browserbundel en valt de pagina om. Zie §9.

### Drie regels die je niet mag versoepelen

**1. `requirePermission()` hoort in de pagina én in élke actie van dat scherm.**
Een pagina afschermen is niet genoeg: een server action is een eigen ingang die
ook draait als de pagina nooit geopend is, en een formulier is met de hand na te
bouwen. Het verraderlijke is dat een vergeten controle er van buitenaf
precies zo uitziet als eentje die werkt.

**2. Niet ophalen is iets anders dan verbergen.** Het dashboard *haalt* de
bestellingen niet op voor wie ze niet mag zien. Afschermen in de weergave laat
de gegevens alsnog door de server lopen en in een RSC-payload belanden.

**3. Wie het recht mist gaat naar het dashboard met een uitleg, niet naar de
inlogpagina.** Hij ís ingelogd, hij hoort hier alleen niet. Doorsturen naar
inloggen zou hem laten denken dat zijn sessie verlopen was.

### Twee gaten die pas bij het testen bovenkwamen

Beide zijn het soort fout dat jaren blijft staan, dus test er expliciet op:

**De factuur-PDF toetste alleen of je ingelogd was.** Dat is een route handler
zonder layout eromheen, en factuurnummers lopen op (`2026-0001`). Een
marketingmedewerker had de hele klantenlijst kunnen binnenhalen door te tellen,
terwijl hij het facturenscherm niet eens mag openen. **Route handlers erven geen
beveiliging van een layout — zet de controle er met de hand in.**

**Een `SELECT` die zijn nieuwe kolom niet ophaalde.** De query noemt zijn
kolommen met de hand, en `queryOne<AdminRow>` is een *cast*, geen validatie —
dus TypeScript zweeg. Iedereen werd stilletjes de minst bevoorrechte rol, ook de
eigenaar. De terugval op de minste rechten was goed gekozen (fail closed), maar
hij was **stil**; hij logt nu een fout.

> Hoe dat getest is, en de methode is overdraagbaar: twee tijdelijke sessierijen
> rechtstreeks in de database (zonder wachtwoorden), álle schermen opvragen met
> elk van de rollen, de statuscodes in een tabel zetten, daarna de rijen weer
> verwijderen. Plus een telling over élke server action: heeft hij een controle,
> ja of nee. De vier zonder controle zijn inloggen, uitloggen, de eerste
> beheerder aanmaken en een uitnodiging accepteren — die draaien per definitie
> vóór er een sessie is.

---

## 6. Logboek

Eén tabel: wie, welke handeling, waarover, oude en nieuwe waarde, wanneer.

Met één beheerder lijkt dit overbodig. Met twee is het dat niet: een korting is
geld, en "wie heeft dat op 40% gezet" is een vraag die je wilt kunnen
beantwoorden zonder te hoeven bellen.

**Een mislukte handeling schrijft niets.** Alleen wat er werkelijk veranderd is,
anders staat het logboek vol pogingen en is het niet meer te lezen. Mislukte
inlogpogingen horen er dus ook niet in — die worden geteld in de snelheidsrem en
verder vergeten.

**Eén uitzondering, en die is belangrijk:** een mislukte terugbetaling schrijft
wél. Als de betaaldienst het geld heeft teruggeboekt maar de database niet
bijgewerkt kon worden, is het logboek de enige plek waar het kenmerk van die
terugboeking nog staat.

De koppeling naar `admins` staat op `RESTRICT`, niet `CASCADE`: een beheerder
verwijderen mag het logboek niet leegmaken. Daarvoor is `disabled_at` er — de
naam moet leesbaar blijven.

---

## 7. De schermen

### Facturen — recht `facturen`

- Lijst met factuurnummer, ordernummer, datum, klant, bedrag, link naar de PDF.
- **Zoeken op factuurnummer, ordernummer, naam, mailadres of bedrag.** Het
  bedrag wordt gelezen als euro's: `37,71`, `37.71`, `€ 37,71` en `37` zijn
  allemaal geldig. Niemand zoekt op "3771" als hij € 37,71 bedoelt.
- **Splitsing per jaar en per maand**, uit één `GROUP BY` en niet uit twee
  queries. Een onbekend jaar valt terug op het nieuwste in plaats van te klagen:
  een URL die iemand heeft bijgewerkt hoort een bruikbare pagina te geven.
- De filters staan **in de URL**, zodat de lijst deelbaar is, de terugknop werkt
  en het zonder JavaScript gewoon werkt.
- Zoeken gaat over de **orderrij**, niet over de bevroren momentopname in het
  factuurdocument: die kan geen index gebruiken en levert bij een afwijking stil
  niets op.

> Afweging die je bewust moet maken: een zoekterm in de URL komt in het
> serverlog, en dat kan een naam of mailadres zijn. Hier geaccepteerd omdat het
> paneel geen enkele bron van derden laadt, dus de URL kan niet via een
> `Referer` naar buiten lekken. Moet dat anders, dan wordt het een POST en
> vervalt de deelbare link.

### Prijzen — recht `prijzen`, alleen de eigenaar

De beheerder zet een **opslag op de inkoopprijs** per groep: hele winkel,
productgroep, categorie, soort artikel of één artikel. De smalste regel wint;
stapelen doen ze nooit. Zonder regel staat de prijs van de leverancier er
onaangeroerd.

Twee dingen die overdraagbaar zijn ongeacht je assortiment:

- **Een leeg veld is niet hetzelfde als 0%.** Een lege tabel mag de winkel niet
  ineens op inkoopprijs laten verkopen.
- **De sleutel waarop een regel hangt moet op het artikel zelf staan**, niet op
  de plek in een categorieboom. Komt een artikel via de zoekfunctie binnen, dan
  heeft het geen categorie — en dan zou het afrekenen een ánder bedrag
  uitrekenen dan de klant zag.

### Kortingen — recht `kortingen`

Tijdelijke acties met een percentage en een looptijd.

- **Een te diepe korting wordt geweigerd, niet afgekapt**, met erbij wat er wél
  kan ("maximaal 18% op dit artikel"). Stilletjes afkappen betekent dat er 40%
  in het paneel staat terwijl de klant 18% ziet — en dat merk je pas als je je
  omzet narekent.
- Bij een actie over honderd artikelen vallen er altijd een paar onder de
  margegrens. Het scherm moet die kunnen **aanwijzen** ("94 aangepast, 6
  overgeslagen omdat de marge te krap is") en niet de hele actie weigeren.
- In het formulier valt niets te typen: productgroep en categorie zijn
  keuzelijsten uit dezelfde bron als de winkel, en een artikelnummer wordt
  opgezocht en met naam teruggemeld. Een tikfout leverde eerder een regel op die
  stil niets deed.

### Kortingscodes — recht `kortingen`

Percentage, minimumbedrag, looptijd, optioneel een maximum en "één keer per
klant".

- **"Eén keer per klant" hangt aan een unieke sleutel in de database**, niet aan
  een controle in code. Twee bestellingen tegelijk lezen allebei "nog niet
  gebruikt" en de tweede ketst af op de sleutel.
- Aftekenen gebeurt pas **als er betaald is**, zodat een afgebroken afrekening
  de klant zijn enige kans niet kost.
- Ketst het af terwijl het geld al binnen is? Dan gaat de bestelling gewoon door
  en komt het in de log. Een betaalde klant zijn bevestiging onthouden om een
  teller is de verkeerde afweging.

### Beoordelingen — recht `beoordelingen`

Lijst met beoordelingen, antwoorden, verbergen, en een lijst "nog niet
uitgenodigd" met de datum waarop dat vanzelf gebeurt.

- **Een beoordeling verschijnt meteen; verbergen kan alleen mét reden**, die in
  de database én het logboek komt. Selectief publiceren is in de EU een
  oneerlijke handelspraktijk — dit is geen voorkeur maar wetgeving.
- **De lijst toont geen naam en geen mailadres**, alleen het ordernummer: dit
  scherm mag ook een marketingmedewerker openen.
- Een knop die een wachttermijn overslaat moet dat ook echt doen. Hier stond
  eerst een knop "Nu uitnodigen" die alleen de dagclaim oversloeg en dus
  verstuurde wat tóch al aan de beurt was — precies het geval waarin je niet
  hoeft te drukken.

### Verzending — recht `bestellingen`, alleen de eigenaar

De betaalde bestellingen onder elkaar; per bestelling een vervoerder, een veld
voor de track & trace en één knop. De klant krijgt een mail in de taal waarin
hij bestelde.

Drie dingen hieruit zijn overdraagbaar naar elke winkel:

- **Neem zowel een code als een hele link aan, en laat de link winnen.** Wat de
  beheerder uit de mail van zijn vervoerder plakt weet meer dan jouw sjabloon.
  Bouw je zelf een link uit een barcode, dan heb je er vaak meer voor nodig dan
  de code — PostNL wil ook het land en de postcode — en die staan op de
  bestelling, dus laat ze niet intypen.
- **Verzin geen volglink die je niet kunt onderbouwen.** Kies de beheerder
  "andere vervoerder", dan krijgt de klant de code zonder knop. Een knop die op
  "zending niet gevonden" uitkomt is jouw fout, niet die van de vervoerder.
- **Eerst het bericht naar buiten, dan aftekenen dat het eruit is.** Dezelfde
  volgorde als bij een terugbetaling (§8). Het scherm leest de datum waarop het
  bericht verstuurd is, niet of er een code staat — anders staat een bestelling
  als "verzonden" in de lijst terwijl de mail mislukte.

En een valkuil die in §9 hoort maar hier opduikt: **`affectedRows` van een
UPDATE is het aantal *gewijzigde* rijen, niet het aantal gevonden rijen.**
Dezelfde code nog eens opslaan (na een mislukte mail) geeft dus 0, en dat is
geen fout. Toets op wat je daarna in de rij vindt, niet op dat getal.

Twee sloten, want een mail aan een klant is niet terug te draaien: alleen
betaalde bestellingen, en een tweede bericht over dezelfde bestelling vraagt
een bevestiging.

### Retouren — recht `retouren`, alleen de eigenaar

Drie stappen: aangemeld → pakket ontvangen → terugbetaald. **Dit is de enige
knop in het paneel die geld verplaatst**, dus hij heeft een bevestiging mét het
bedrag erbij. Zie §8 voor de volgorde waarin dat moet gebeuren.

Het scherm heeft als enige een **klok**: de wet geeft hier een termijn, dus het
dashboard meldt dat er iets openstaat.

### Beheerders — recht `beheerders`, alleen de eigenaar

Uitnodigen, rol wijzigen, toegang intrekken, plus de laatste regels uit het
logboek.

**De laatste actieve eigenaar kan niet gedegradeerd of uitgeschakeld worden.**
Zonder die controle kan de eigenaar zichzelf tot boekhouder maken en is het
paneel alleen nog met toegang tot de database te repareren. Bouw dit als eerste,
niet als laatste.

---

## 8. De regels die geld of een boete kosten

Dit is het deel dat je **ongewijzigd moet overnemen**, ongeacht wat je verkoopt.

### Geld

**Bedragen zijn gehele centen.** Nooit floats. Overal, ook in de JSON die je
opslaat.

**Een bedrag dat naar een betaaldienst gaat komt nooit uit de browser.** Ook
niet uit een verborgen veld, ook niet "ter controle". De server rekent het
opnieuw uit uit de bron.

**Bij een terugbetaling: het bedrag komt uit de database.** Lager mag (een
artikel komt beschadigd terug), hoger wordt geweigerd. Een getypte "-5" werd hier
ooit `Math.max(1, …)` en dus een terugboeking van één cent die het retour meteen
op "afgehandeld" zette.

**Buiten bereik wordt geweigerd, niet afgekapt.** Zelfde regel als bij de
korting hierboven. Een bedrag dat stilletjes iets anders wordt is erger dan een
foutmelding.

**Betaaldienst eerst, database daarna.** Andersom staat een mislukte terugboeking
als "terugbetaald" in de administratie, en dan wacht de klant op geld dat nooit
komt.

**Het retournummer gaat als idempotentiesleutel mee**, zodat twee tabbladen
samen één terugboeking opleveren. Let op het gevolg: een tweede poging met een
ánder bedrag krijgt de eerste terugboeking terug. Schrijf daarom weg wat de
**betaaldienst zegt te hebben teruggeboekt**, niet wat het formulier vroeg — en
meld het op het scherm als die twee verschillen.

### Facturen

**Een factuurnummer is voor altijd en de reeks moet aaneengesloten blijven.**
Dus:

- **Geen `AUTO_INCREMENT`.** Die laat gaten vallen zodra een transactie
  terugdraait.
- Het nummer komt uit een **tellerrij** die binnen een transactie met
  `SELECT … FOR UPDATE` wordt opgehoogd. Buiten een transactie geeft MySQL dat
  slot meteen weer vrij en kunnen twee betalingen hetzelfde nummer krijgen.
- Zorg eerst dát de tellerrij bestaat (`INSERT … ON DUPLICATE KEY UPDATE`): je
  kunt geen rij op slot zetten die er niet is, en twee bestellingen in januari
  zouden hem anders allebei aanmaken.
- Een unieke sleutel op (bestelling, soort) als tweede vangnet. *Getest met vijf
  gelijktijdige aanroepen: één nummer.*
- Het nummer wordt pas toegekend **als de betaling binnen is**, nooit bij het
  aanmaken van de bestelling — een afgebroken betaling zou anders een gat slaan.
- Een geannuleerde factuur verdwijnt niet; die krijgt een creditfactuur met een
  eigen nummer.
- De PDF wordt opnieuw getekend uit een **bevroren momentopname** van de
  bestelling, niet uit de catalogus van vandaag. Daarom draagt een oude factuur
  nog de oude bedrijfsnaam, en dat hoort zo.

### Privacy

- Klantgegevens worden **niet opgehaald** voor wie ze niet mag zien (§5).
- Een scherm dat marketing mag openen toont geen naam en geen mailadres.
- Verandert het schema, dan moet de privacyverklaring mee. Leg per tabel vast:
  welk persoonsgegeven, welke grondslag, welke bewaartermijn.

### Een werkende sleutel is geen werkende kassa

De duurste les uit deze winkel, en hij geldt voor élke externe dienst waar je
paneel van afhangt.

Het paneel toetste of er een API-sleutel ingevuld was en concludeerde daaruit
dat betalen kon. **Twee weken lang stond er een betaalknop die niets deed**: de
betaaldienst had na een naamswijziging bij de Kamer van Koophandel elke methode
op "wordt geverifieerd" gezet. Niemand kreeg een melding; de klant liep er pas
tegenaan nadat hij zijn naam en adres had ingevuld.

Hetzelfde gebeurde met de leverancier: een verlopen token zag er precies zo uit
als een categorie zonder aanbod, en de grootste productgroep verdween stil uit
de winkel.

**De vorm die daaruit volgt**, en die je voor elke externe afhankelijkheid
herhaalt:

1. Eén goedkope aanroep die de dienst echt vraagt of hij werkt (niet: staat er
   een sleutel). Vijf minuten gecacht, **gooit nooit**.
2. Onderscheid de gevallen: geen sleutel / sleutel geweigerd / dienst
   onbereikbaar / sleutel in orde maar de dienst doet niets.
3. Een rode melding in het paneel, **voor iedereen ongeacht rol** — een winkel
   waar niemand kan betalen is geen rechtenkwestie.
4. En zeg het de klant vóórdat hij zijn gegevens invult, niet erna.

> Een afgevangen fout ziet eruit als een lege toestand. Dat is de hele les.

---

## 9. Valkuilen in de bouw

**Een databasedriver in de browserbundel.** Twee keer gebeurd. Een client
component importeerde een module die ook databasecode bevatte, waarna de hele
pagina HTTP 500 gaf met "Can't resolve net". Oplossing: reken- en regelcode in
een eigen bestand **zonder** database-imports, en laat de rechtenmatrix nooit
iets aanraken dat een driver meetrekt.

> Typecheck en lint zien dit geen van beide. De enige controle die het vangt is
> de pagina openen of een productiebouw draaien.

**Een cast is geen validatie.** `queryOne<AdminRow>(…)` belooft een vorm die
niemand controleert. Noemt je `SELECT` een kolom niet, dan is het veld
`undefined` en zwijgt TypeScript. Valideer rijen die over rechten gaan, of log
in elk geval luid als een verwachte waarde ontbreekt.

**Route handlers erven geen beveiliging van een layout.** Zie §5.

**Schrijvers horen luid te falen, lezers niet.** Elke lezer die op een
voorgerenderde pagina terechtkomt valt terug op leeg; valt de database weg, dan
verdwijnt een blok van het dashboard en blijft de rest staan. Eén uitzondering
die dat niet deed, liet ooit de hele productiebouw omvallen.

**Tellen mag nooit een verzoek laten mislukken.** De bezoekteller vangt zijn
eigen fout af — de enige plek in deze winkel waar dat zo is, en met reden.

**Migraties voegen alleen toe.** MySQL en MariaDB sluiten een lopende
transactie stilletjes af bij elke `CREATE` of `ALTER`; terugdraaien bestaat niet.
Eén migratie per keer, pas aftekenen als hij geslaagd is, stoppen bij de eerste
fout, en schrijf ze zo dat je een half gedraaide migratie met de hand kunt
afmaken.

**Een kolombreedte is een aanname over de buitenwereld.** `VARCHAR(32)` was
ruim voor het kenmerk van de ene betaaldienst en te krap voor de volgende (66
tekens). Deze server **kapte stil af** in plaats van de rij te weigeren: de klant
betaalde, de bestelling bleef op "wacht op betaling" staan, en niemand merkte
het behalve de klant.

---

## 10. Databaseschema

De tabellen die het paneel zelf nodig heeft. De rest (bestellingen, facturen,
kortingen) hangt aan je eigen domein.

```sql
admins (
  id, email UNIQUE, password_hash,
  totp_secret VARBINARY NULL,      -- versleuteld
  totp_confirmed_at NULL,          -- leeg tot de eerste code klopt
  created_at, last_login_at NULL,
  disabled_at NULL                 -- intrekken zonder de rij te verwijderen
)

admin_sessions (
  token_hash CHAR(64) PRIMARY KEY, -- alleen de afdruk
  admin_id FK CASCADE,
  created_at, last_seen_at, expires_at,
  INDEX (expires_at)               -- opruimen en "log mij overal uit"
)

admin_invites (
  id, email, token_hash UNIQUE,    -- alleen de afdruk
  invited_by FK RESTRICT,
  created_at, expires_at, accepted_at NULL
)

admin_recovery_codes (
  id, admin_id FK CASCADE, code_hash, used_at NULL
)

audit_log (
  id, admin_id FK RESTRICT,        -- RESTRICT: logboek blijft leesbaar
  action VARCHAR(40), subject VARCHAR(80) NULL,
  detail_json JSON NULL,           -- oude en nieuwe waarde
  created_at, INDEX (created_at), INDEX (admin_id)
)

counters (name PRIMARY KEY, value) -- de factuurreeks, zie §8
```

---

## 11. Omgevingsvariabelen

| Variabele | Waarvoor | Zonder |
|---|---|---|
| `DATABASE_*` (host, port, name, user, password) | alles | Geen paneel |
| `ADMIN_TOTP_KEY` | versleutelt het 2FA-geheim | Inloggen werkt niet |
| `ADMIN_SETUP_TOKEN` | de allereerste beheerder | `/beheer/setup` weigert |
| `SMTP_*` | uitnodigingen en meldingen | Geen mail |

**Zet ze in élke omgeving die je draait**, niet alleen productie. En een
wijziging werkt niet door in een bestaande build: opnieuw bouwen en herstarten.

---

## 12. Wat je moet vervangen voor een andere winkel

1. **De rechtenlijst.** `prijzen`, `kortingen` en `retouren` zijn
   assortimentsafhankelijk. De drie rollen en de twee die bij de eigenaar
   blijven, zijn dat niet.
2. **De schermen voor prijzen, kortingen en retouren** hangen aan deze
   productcatalogus. De regels eromheen (§8) hangen nergens aan.
3. **De factuurnotatie** (`2026-0001`) en de btw-logica.
4. **Alle teksten**; dit paneel is eentalig Nederlands.
5. **De merkkleuren en de layout.**
6. **De gezondheidscontroles** (§8) wijzen naar de diensten die déze winkel
   gebruikt. De vorm neem je over, de diensten niet.

## 13. Wat er bewust niet in zit

- **Geen wachtwoord-vergeten-mail.** Bij dit aantal gebruikers is dat een
  aanvalsvlak zonder opbrengst; een andere eigenaar zet een nieuw wachtwoord.
- **Geen inkoop bij de groothandel vanuit het paneel.** Die aanroep plaatst een
  echte, factureerbare bestelling en hoort niet achter een knop in een scherm
  dat verder over kortingen gaat.
- **Geen marketingmail.** Dat raakt de bezorging van de orderbevestigingen: één
  campagne met te veel spamklachten sleurt de transactionele mail mee de
  spamfolder in. Dat hoort op een apart subdomein en via een aparte dienst.
- **Geen creditfactuur bij een terugbetaling.** Hoort er wel te komen, met een
  eigen oplopend nummer; is hier nog handwerk voor de boekhouding.
- **Geen passkeys.** Kost niets maar vraagt een zwaardere bouw; later, als er
  meer gebruikers komen.
