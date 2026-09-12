# Logobestanden

Huisstijlregels staan in `docs/BRAND.md`. Die zijn leidend; dit bestand zegt
alleen wat er in deze map staat en hoe het gemaakt is.

| Bestand | Waar |
|---|---|
| `caro-mark.svg` | De moer, volle vulling. Gebruikt door `components/brand/caro-mark.tsx` |
| `caro-mark-line.svg` | Open lijnversie. **Verplicht onder 40px** — de volle vulling loopt dan dicht |
| `favicon.svg` | Browsertabblad |
| `caro-lockup-email.png` | Het lockup (CAR + moer) voor de bevestigingsmail |

## Waarom het lockup voor de mail een PNG is

De site zet het lockup samen uit tekst in Anton plus `caro-mark.svg`
(`components/brand/caro-lockup.tsx`). In een e-mail kan dat geen van beide:

- **SVG wordt door Gmail verwijderd** en door Outlook genegeerd. Een lockup in
  SVG is in de helft van de inboxen een leeg vlak.
- **Een webfont laadt niet.** Gmail gooit `@font-face` weg, dus het woordmerk
  zou in Arial verschijnen — en het woordmerk ís Anton.

Vandaar één afbeelding. Hij gaat als bijlage mee en wordt aangehaald met
`cid:` (zie `src/lib/orders/customer-mail.ts`), niet als link naar
caroparts.nl: een `<img>` naar een webserver blijft in de meeste clients een
grijs vlak tot de lezer op "afbeeldingen tonen" klikt.

**Wit woordmerk, oranje moer, transparante achtergrond** — hij staat in de mail
op een inktzwarte balk. Op wit zou hij onzichtbaar zijn.

### Opnieuw maken

371 × 141 px, 2× de weergavebreedte van 150 px in de mail. Gemaakt door het
lockup in een canvas te tekenen op een pagina van de shop, want daar is Anton
al geladen — er is geen build-stap of extra package voor nodig:

```js
// plak dit in de console op een draaiende pagina van de shop
await document.fonts.load('400 160px Anton');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 64 64" fill="none"><path fill="#FF6A13" fill-rule="evenodd" transform="rotate(12 32 32)" d="M62 32 47 58H17L2 32 17 6h30l15 26ZM45 32a13 13 0 1 1-26 0 13 13 0 0 1 26 0Z"/></svg>`;
const nut = new Image();
nut.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
await nut.decode();
const probe = document.createElement('canvas').getContext('2d');
probe.font = '160px Anton';
const m = probe.measureText('CAR');
const textW = Math.ceil(m.width);
const capH = Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
const gap = 13, nutSize = 128;
const H = Math.max(capH, nutSize), W = textW + gap + nutSize;
const c = document.createElement('canvas');
c.width = W; c.height = H;
const ctx = c.getContext('2d');
ctx.font = '160px Anton';
ctx.fillStyle = '#FFFFFF';
ctx.fillText('CAR', 0, (H - capH) / 2 + m.actualBoundingBoxAscent);
ctx.drawImage(nut, textW + gap, (H - nutSize) / 2, nutSize, nutSize);
c.toBlob((b) => open(URL.createObjectURL(b)));
```

De moer is 0,8 em hoog en staat 0,08 em na het woordmerk — dezelfde maten als
`caro-lockup.tsx`, zodat mail en site hetzelfde logo tonen. De kanteling van
12° zit in de SVG en blijft ongemoeid.

**Komt er ooit een echte `caro-lockup.svg` uit het merkdocument** (BRAND.md
noemt hem, hij is er nog niet), vervang dit bestand dan door een export
daarvan in dezelfde afmetingen en kleuren.
