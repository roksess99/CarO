/**
 * Merkbestanden maken: de QR-code en de profielfoto's voor social media.
 *
 *   pnpm brand:build
 *
 * Alles wordt hier opnieuw getekend en in `public/brand/` gezet, zodat een
 * wijziging in de huisstijl één commando is en geen middagje in een
 * tekenprogramma. Voor PNG gebruiken we sharp, dat al in het project zit
 * omdat Next het voor de beeldoptimalisatie meebrengt.
 *
 * ---------------------------------------------------------------------------
 * WAAROM DE QR-MATRIX HIERONDER VASTE DATA IS EN GEEN BEREKENING
 * ---------------------------------------------------------------------------
 *
 * De eerste opzet rekende de QR-code zelf uit, om geen pakket te hoeven
 * toevoegen (CLAUDE.md: geen libraries zonder te vragen). Dat is niet gelukt.
 * GEMETEN 2026-09-22 door de uitkomst naast een referentie-implementatie te
 * leggen: de functiepatronen klopten, maar **269 van de 841 modules weken af**,
 * waaronder 27 van de 31 opmaakcellen — dus zowel de BCH-opmaakbits als de
 * dataplaatsing zaten fout. Er kwam een plaatje uit dat eruitziet als een QR
 * en door geen enkele scanner gelezen wordt.
 *
 * Dat is hier het gevaarlijkste soort fout: je merkt hem pas als er duizend
 * stickers gedrukt zijn. Daarom staat hier nu de matrix zoals een bewezen
 * implementatie hem oplevert (versie 3, niveau H, masker 6), gecontroleerd
 * door hem echt te laten scannen.
 *
 * **Verandert het webadres, dan moet deze matrix opnieuw**, en dat kan dit
 * script niet zelf. Twee wegen:
 *
 *   1. `pnpm add -D qrcode` en dit blok vervangen door twee regels. Dat vraagt
 *      toestemming van de eigenaar, daarom staat het er nog niet in.
 *   2. Tot die tijd: de matrix elders laten genereren en hieronder plakken.
 *      De controle blijft dezelfde — scannen, en kijken of er caroparts.nl
 *      uit komt.
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "brand");

const INK = "#0E1013";
const ORANJE = "#FF6A13";
const WIT = "#ffffff";

/** Waar de QR-code heen wijst. Wijzigen? Zie de kop van dit bestand. */
export const DOEL = "https://caroparts.nl";

/**
 * QR versie 3 (29×29), foutcorrectieniveau H, masker 6.
 *
 * H en niet L, om één reden: er staat een logo in het midden. Dat dekt
 * modules af en die moeten uit de foutcorrectie terugkomen. Met H mag zo'n
 * 30% wegvallen; het logo hieronder dekt er ongeveer 13%, dus er blijft ruim
 * marge over voor een vuile sticker of een scheve telefoon.
 */
const QR_MATRIX = [
  "11111110010000110111001111111",
  "10000010001011001110101000001",
  "10111010110111001010101011101",
  "10111010100100101101001011101",
  "10111010001101111111001011101",
  "10000010010101000110101000001",
  "11111110101010101010101111111",
  "00000000011011111001100000000",
  "00011011010010110011100001100",
  "11000001001100110100100110110",
  "00110011101111100000011101100",
  "00010001110100010100000001001",
  "01111111000010110101111000010",
  "01101100100100100010001010101",
  "11001110111110101011100101001",
  "11010101010111011111100011101",
  "00111011100100000000100101010",
  "10101101011110001010100110000",
  "11001111011001011110100001001",
  "11000001001110000010011010100",
  "11010111101111111010111110101",
  "00000000100011001010100011110",
  "11111110111000101001101010100",
  "10000010010111011011100011010",
  "10111010100100110101111110000",
  "10111010110000100110000100110",
  "10111010001100101010110111011",
  "10000010010011010100110011101",
  "11111110001000110110110111000",
].map((rij) => [...rij].map((teken) => teken === "1"));

// ---------------------------------------------------------------------------
// Tekenen
// ---------------------------------------------------------------------------

/** De moer uit public/brand/caro-mark.svg, als pad op een raster van 64 */
const MOER_PAD =
  "M62 32 47 58H17L2 32 17 6h30l15 26ZM45 32a13 13 0 1 1-26 0 13 13 0 0 1 26 0Z";

function moer({ x, y, maat, kleur }) {
  const schaal = maat / 64;
  return (
    `<g transform="translate(${x} ${y}) scale(${schaal}) rotate(12 32 32)">` +
    `<path fill="${kleur}" fill-rule="evenodd" d="${MOER_PAD}"/></g>`
  );
}

/**
 * De QR-code in huisstijl.
 *
 * **De modules blijven antraciet op wit.** Ze oranje maken zou mooier staan,
 * maar `#FF6A13` haalt 2,87:1 op wit (docs/BRAND.md) en dat is te weinig voor
 * een scanner in een donkere garage. Het oranje zit daarom in het logo in het
 * midden, waar de foutcorrectie het opvangt.
 */
function qrSvg({ logo = true } = {}) {
  const n = QR_MATRIX.length;
  const rust = 4; // stille zone: de norm vraagt er vier
  const totaal = n + rust * 2;

  let pad = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (QR_MATRIX[r][c]) pad += `M${c + rust} ${r + rust}h1v1h-1z`;
    }
  }

  const dek = 7; // 7×7 modules in het midden: ongeveer 13% van het oppervlak
  const dekX = (totaal - dek) / 2;
  const midden = logo
    ? `<rect x="${dekX}" y="${dekX}" width="${dek}" height="${dek}" rx="1" fill="${WIT}"/>` +
      moer({ x: dekX + 0.6, y: dekX + 0.6, maat: dek - 1.2, kleur: ORANJE })
    : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totaal} ${totaal}" width="${totaal * 16}" height="${totaal * 16}" shape-rendering="crispEdges">` +
    `<rect width="${totaal}" height="${totaal}" fill="${WIT}"/>` +
    `<path fill="${INK}" d="${pad}"/>` +
    midden +
    `</svg>`
  );
}

/**
 * De profielfoto: alleen de moer, gecentreerd, met ruime marge.
 *
 * Die marge is geen smaak. Vrijwel elk platform snijdt een vierkante foto tot
 * een cirkel, en de hoeken van een beeldvullend logo verdwijnen daarin. De
 * moer staat daarom binnen de ingeschreven cirkel, met de vrije ruimte die
 * docs/BRAND.md vraagt: een halve moerbreedte rondom.
 */
function profielSvg({ achtergrond, merk }) {
  const maat = 1024;
  const moerMaat = maat * 0.54;
  const rand = (maat - moerMaat) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${maat} ${maat}" width="${maat}" height="${maat}">` +
    `<rect width="${maat}" height="${maat}" fill="${achtergrond}"/>` +
    moer({ x: rand, y: rand, maat: moerMaat, kleur: merk }) +
    `</svg>`
  );
}

// ---------------------------------------------------------------------------

async function schrijf(naam, inhoud) {
  await fs.writeFile(path.join(OUT, naam), inhoud);
  console.log(
    `  ${naam.padEnd(32)} ${(Buffer.byteLength(inhoud) / 1024).toFixed(1)} kB`,
  );
}

async function png(svg, naam, maat) {
  const buffer = await sharp(Buffer.from(svg))
    .resize(maat, maat)
    .png({ compressionLevel: 9 })
    .toBuffer();
  await fs.writeFile(path.join(OUT, naam), buffer);
  console.log(
    `  ${naam.padEnd(32)} ${(buffer.length / 1024).toFixed(1)} kB  ${maat}×${maat}`,
  );
}

export { qrSvg, profielSvg, QR_MATRIX };

if (process.argv[1] && process.argv[1].endsWith("make-brand-assets.mjs")) {
  console.log(
    `QR-code naar ${DOEL}  (${QR_MATRIX.length}×${QR_MATRIX.length}, niveau H)`,
  );
  await schrijf("caro-qr.svg", qrSvg());
  await png(qrSvg(), "caro-qr.png", 2048);
  // Zonder logo, voor klein drukwerk of een scanner die het moeilijk heeft
  await schrijf("caro-qr-kaal.svg", qrSvg({ logo: false }));
  await png(qrSvg({ logo: false }), "caro-qr-kaal.png", 1024);

  console.log("\nProfielfoto's");
  const donker = profielSvg({ achtergrond: INK, merk: ORANJE });
  const licht = profielSvg({ achtergrond: WIT, merk: ORANJE });
  await schrijf("caro-profiel.svg", donker);
  await schrijf("caro-profiel-licht.svg", licht);
  for (const maat of [1024, 512, 180]) {
    await png(donker, `caro-profiel-${maat}.png`, maat);
  }
  await png(licht, "caro-profiel-licht-512.png", 512);

  console.log("\nKlaar.");
}
