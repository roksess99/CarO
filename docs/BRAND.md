# CarO — Huisstijl

Bron: `CarO_logo_brand.pdf` (Concept 02 — De Moer). Dit document is leidend voor alle UI.

## Kleuren

| Token | Hex | Gebruik |
|---|---|---|
| `--caro-orange` | `#FF6A13` | Merkaccent. Alleen als **vlak**, zie contrastregels |
| `--caro-ink` | `#0E1013` | Tekst, donkere achtergrond |
| `--caro-grey` | `#767C85` | Labels en UI-lijnen. **Niet als tekstkleur** — zie hieronder |
| `--caro-zinc` | `#F5F6F7` | Lichte achtergrond, kaartvlakken |

## Contrast — hard afgedwongen

`#FF6A13` haalt **2,87:1** op wit. Dat faalt WCAG AA voor zowel normale (4,5:1) als grote tekst (3:1).

**Verboden:**
- Oranje tekst op een lichte achtergrond
- Witte tekst op een oranje vlak

**Toegestaan:**
- `#0E1013` op `#FF6A13` — 6,6:1 ✓ (dit is de primaire knop)
- `#FF6A13` op `#0E1013` — 6,6:1 ✓ (accent in dark mode)
- Oranje als niet-tekstueel element: onderlijn, icoon, rand, badge-vlak

De primaire knop is een **oranje vlak met zwarte tekst**. Niet wit.

### Secundaire tekst

`#767C85` haalt **4,21:1** op wit en zakt daarmee onder de AA-eis van 4,5:1
(gemeten met Lighthouse, 2026-09-07). De token `--muted` staat daarom op
`#646b75` in lichte modus (5,38:1) en `#9aa1aa` in donkere modus (7,31:1).
Het merkgrijs zelf blijft ongewijzigd voor randen en vlakken.

## Logo

Bestanden in `public/brand/`:

| Bestand | Gebruik |
|---|---|
| `caro-lockup.svg` | Standaard: CAR + moer. Site header, facturen |
| `caro-lockup-dark.svg` | Omgekeerd, wit woordmerk. Donkere achtergrond, foto-overlays |
| `caro-lockup-descriptor.svg` | Met "ONDERDELEN". Verpakking, formele plaatsingen |
| `caro-mark.svg` | Alleen de moer. Social profiel, boxsticker |
| `caro-mark-line.svg` | Open lijnversie. **Verplicht onder 40px** |
| `favicon.svg` + `icon-512.png` | Browser tab, PWA |

## Logoregels

- De moer staat altijd **12° gekanteld**. Nooit recht.
- Het gat in het midden blijft **open**. Nooit met kleur vullen.
- Onder 40px: lijnversie gebruiken. De volle vulling loopt dicht en wordt modderig.
- Oranje komt **één keer per lockup** voor: alleen de moer. Het woordmerk blijft
  antraciet of omgekeerd wit — nooit de letters inkleuren.
- Vrije ruimte rondom = halve breedte van de moer.
- Niet uitrekken, roteren of van schaduw voorzien.

## Typografie

- **Woordmerk**: Anton (of de outlines in de SVG). Alleen in het logo, nooit in de UI.
- **UI kop**: Inter, weight 700, `letter-spacing: -0.02em`
- **UI body**: Inter, weight 400, `line-height: 1.6`
- **Labels/eyebrows**: Inter 600, uppercase, `letter-spacing: 0.12em`, kleur `--caro-grey`
- **Cijfers en artikelnummers**: `font-variant-numeric: tabular-nums`. OE-nummers zijn data,
  die moeten uitlijnen in een tabel.

## Tone of voice

Direct en zakelijk, geen marketingtaal. De klant zoekt een specifiek onderdeel,
niet een belevenis. "Past op jouw auto" is beter dan "Ontdek onze collectie".
