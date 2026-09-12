# Herkomst van de categoriefoto's

Per foto: waar hij vandaan komt en onder welke licentie hij gebruikt mag
worden. **Zonder regel hier is een foto niet aantoonbaar rechtenvrij**, en dat
is precies het probleem dat docs/DECISIONS.md #9 beschrijft.

| Bestand | Bron | Licentie | Toegevoegd |
|---|---|---|---|
| `banden.jpg` | onbekend — vermoedelijk iStock-preview | **niet vastgesteld** | vóór 2026-09-12 |
| `onderdelen.jpg` | onbekend — vermoedelijk iStock-preview | **niet vastgesteld** | vóór 2026-09-12 |
| `toebehoren.jpg` | onbekend — vermoedelijk iStock-preview | **niet vastgesteld** | vóór 2026-09-12 |
| `velgen.jpg` | onbekend | **niet vastgesteld** | vóór 2026-09-12 |

"Vermoedelijk iStock-preview" is geen slag in de lucht: drie van de vier zijn
exact 612 px breed, en dat is het formaat waarin iStock zijn gratis previews
uitlevert. De bestandsnamen droegen dat ooit letterlijk (`istockphoto-{id}-612x612.jpg`);
bij het hernoemen is dat spoor verdwenen, de afmeting niet.

## Bij het vervangen

Beeld van [Pexels](https://pexels.com), [Unsplash](https://unsplash.com) of
[Pixabay](https://pixabay.com) mag commercieel gebruikt worden; een
gelicentieerde iStock-versie uiteraard ook. Vul daarna de regel hierboven in
met de URL en de licentie, en noteer de datum.

Formaat: de tegels worden beeldvullend bijgesneden
(`components/home/category-grid.tsx`), dus liggend en ruim genomen. 612 px
breed is aan de krappe kant voor een tegel die op een breed scherm meer dan de
helft van de rij vult.
