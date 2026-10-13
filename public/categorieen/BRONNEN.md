# Herkomst van de categoriefoto's

Per foto: waar hij vandaan komt en onder welke licentie hij gebruikt mag
worden. **Zonder regel hier is een foto niet aantoonbaar rechtenvrij**, en dat
is precies het probleem dat docs/DECISIONS.md #9 beschrijft.

| Bestand | Bron | Licentie | Toegevoegd |
|---|---|---|---|
| `onderdelen.jpg` | [rawpixel 6038859](https://www.rawpixel.com/image/6038859/car-engine-free-public-domain-cc0-photo) "Car engine" | **CC0 1.0** | 2026-10-13 |
| `banden.jpg` | [rawpixel 6040038](https://www.rawpixel.com/image/6040038/car-tyre-free-public-domain-cc0-photo) "Car tyre" | **CC0 1.0** | 2026-10-13 |
| `velgen.jpg` | [rawpixel 5903628](https://www.rawpixel.com/image/5903628/photo-image-public-domain-free-cc0) "Alloy wheel close photo" | **CC0 1.0** | 2026-10-13 |
| `toebehoren.jpg` | [rawpixel 5920678](https://www.rawpixel.com/image/5920678/photo-image-public-domain-vintage-interior) "Car interior, steering wheel photo" | **CC0 1.0** | 2026-10-13 |

Gevonden via de Openverse-API met `license=cc0,pdm`, bijgesneden tot vierkant
(dat doet de tegel toch al) en opgeslagen als mozjpeg q82: 681-759 px per zijde,
43-71 kB. De tegel is `aspect-square` met `sizes` tot 12rem, dus dat is ruim.

**CC0 1.0 is een afstandsverklaring van het auteursrecht**: commercieel gebruik
mag en naamsvermelding is niet verplicht. De regels hierboven staan er dus niet
omdat het moet, maar zodat de volgende die hiernaar kijkt het kan nagaan - dat
was precies wat ontbrak.

## Wat hier niet aan te tonen was

**De licentie is niet bij rawpixel zelf geverifieerd.** Die pagina's staan
achter een botcontrole van Cloudflare, en daar gaan we niet omheen. De licentie
rust dus op het machineleesbare record van Openverse (de API van WordPress /
Automattic, die uitsluitend open gelicentieerd werk indexeert) plus de
landingspagina hierboven. **Open die vier links een keer in een gewone browser
om het af te tekenen**; het is dertig seconden werk en dan is de keten rond.

Wikimedia Commons is als controleerbaar alternatief geprobeerd - die API geeft
de licentie wél rechtstreeks terug. Het aanbod daar was voor drie van de vier
onderwerpen te mager, en de CC0-velgen droegen allemaal een handelsmerk in
beeld (Hyundai, Alfa Romeo, Pirelli, Brembo). Een merk prominent in de hero van
een webshop is een eigen risico naast het auteursrecht, dus die vielen af.

## Wat er vóór 2026-10-13 stond

Vier iStock-previews. Drie van de vier waren exact 612 px breed, en dat is het
formaat waarin iStock zijn gratis previews uitlevert; de bestandsnamen droegen
dat ooit letterlijk (`istockphoto-{id}-612x612.jpg`). Bij het hernoemen is dat
spoor verdwenen, de afmeting niet. Getty/iStock treedt hier actief tegen op, en
het stond ruim een maand op een live winkel.

## Bij het vervangen

Beeld van [Pexels](https://pexels.com), [Unsplash](https://unsplash.com) of
[Pixabay](https://pixabay.com) mag commercieel gebruikt worden; een
gelicentieerde iStock-versie uiteraard ook. Vul daarna de regel hierboven in
met de URL en de licentie, en noteer de datum.

Formaat: de tegels worden beeldvullend bijgesneden
(`components/home/category-grid.tsx`), dus liggend en ruim genomen. 612 px
breed is aan de krappe kant voor een tegel die op een breed scherm meer dan de
helft van de rij vult.
