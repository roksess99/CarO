/**
 * Bouwt de merk/model-catalogus uit RDW open data.
 *
 * Waarom een oogst en geen live API: opendata.rdw.nl is gratis en zonder
 * sleutel te gebruiken, maar een keuzelijst mag niet afhangen van de
 * beschikbaarheid van een externe dienst. Na deze oogst kost de autokiezer
 * nul netwerkverkeer.
 *
 * Waarom RDW en niet een commerciele voertuig-API: gemeten 2026-08-11 missen
 * carapi.dev en carapi.app juist de Europese volumemerken (Peugeot, Opel,
 * Renault, Skoda, Citroen). RDW is de Nederlandse registratie zelf, en het is
 * dezelfde bron als de kentekenzoeker gebruikt — merk en model die de klant
 * hier kiest zijn dus letterlijk dezelfde tekst als bij een kentekencheck.
 *
 * Draaien:  node scripts/harvest-vehicle-catalog.mjs
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATASET = "https://opendata.rdw.nl/resource/m9d7-ebf2.json";

/** Alleen personenauto's: dat is waar de klant een auto voor kiest */
const VEHICLE_KIND = "Personenauto";

/** Merken onder deze grens zijn te zeldzaam om in een keuzelijst te horen */
const MIN_VEHICLES_PER_MAKE = 2000;

/** Modellen per merk; gesorteerd op aantal, dus dit zijn de meest gereden */
const MODELS_PER_MAKE = 40;

/** Modellen onder deze grens vervuilen de lijst met eenmalige importen */
const MIN_VEHICLES_PER_MODEL = 150;

/**
 * De RDW registreert sommige fabrikanten onder meerdere namen. Voor de klant
 * is dat één merk: wie een Golf rijdt zoekt onder Volkswagen, niet onder VW.
 */
const MAKE_ALIASES = {
  VW: "VOLKSWAGEN",
  "BMW I": "BMW",
  "MERCEDES-AMG": "MERCEDES-BENZ",
  "FORD-CNG-TECHNIK": "FORD",
  "TESLA MOTORS": "TESLA",
  "JAGUAR CARS": "JAGUAR",
  "ADRIA MOBIL": "ADRIA",
};

/**
 * Camperbouwers. Ze staan als personenauto geregistreerd, maar hun
 * "modellen" zijn opbouwnamen (Hymer B-klasse) terwijl de onderdelen van het
 * basisvoertuig komen — meestal een Fiat Ducato. Wie hier zijn camper kiest
 * zou dus nooit een passend onderdeel vinden.
 */
const COACHBUILDERS = new Set([
  "ADRIA",
  "ADRIA MOBIL",
  "BUERSTNER",
  "CAPRON",
  "CARTHAGO",
  "CHAUSSON",
  "DETHLEFFS",
  "HYMER",
  "KNAUS",
  "POESSL",
  "WEINSBERG",
]);

const OUTPUT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "lib",
  "vehicle",
  "vehicle-catalog.json",
);

async function query(params) {
  const url = `${DATASET}?${new URLSearchParams(params)}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) return res.json();
    // Socrata knijpt anonieme aanvragen af; even wachten helpt
    if (res.status === 429 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      continue;
    }
    throw new Error(`RDW ${res.status} voor ${url}`);
  }
  throw new Error("onbereikbaar");
}

/**
 * Sleutel om schrijfwijzen samen te voegen: "UP!" en "UP" zijn hetzelfde
 * model, net als "GOLF" en "Golf". Alleen letters en cijfers tellen.
 */
function mergeKey(text) {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * De RDW-handelsbenaming is vrije tekst die de dealer heeft ingetypt. Dat
 * levert rommel op: "0*****", "PEUGEOT 107" naast "107", en losse
 * uitvoeringsteksten. Hier gaat die rommel eruit.
 */
function cleanModel(raw, make) {
  if (!raw) return null;
  let name = raw.trim();

  // Maskeringen en placeholders uit de registratie
  if (name.includes("*") || name.includes("?")) return null;
  if (!/[A-Z0-9]/i.test(name)) return null;

  // "PEUGEOT 107" -> "107": het merk staat al in de kolom ernaast. Op de
  // eerste vier letters vergelijken vangt ook typefouten als "PEUGOT 108".
  const stem = make.replace(/[^A-Z]/gi, "").slice(0, 4).toUpperCase();
  if (stem.length === 4) {
    const first = name.split(/[\s-]+/)[0] ?? "";
    if (first.toUpperCase().startsWith(stem)) {
      name = name.slice(first.length).replace(/^[\s-]+/, "");
    }
  }

  // Uitvoeringsdetails horen niet in een modelkeuze: de klant kiest "ID.3",
  // niet "ID.3 PRO 150 KW". Motorinhoud, vermogen en typecodes eruit.
  name = name
    .replace(/\b\d+([.,]\d+)?\s*KW\b/gi, "")
    .replace(/\b\d\s*[.,]\s*\d\b/g, "")
    .replace(/\bPRO\s*S?\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[\s-]+$/, "");

  // Generatieaanduidingen: "Corsa-b", "Zafira-a", "Astra-g-caravan"
  name = name.replace(/-[a-z](-|$)/gi, "$1").replace(/-+$/, "").trim();

  if (name.length === 0 || name.length > 24) return null;
  // Kale typenummers zonder letters ("111011") zeggen een klant niets
  if (!/[a-z]/i.test(name) && name.length > 4) return null;

  return name;
}

/**
 * Voegt varianten samen in hun basismodel: "Astra Sports Tourer" en
 * "Astra GTC" worden "Astra". De generatie kiest de klant met het bouwjaar,
 * en een lijst met vijf soorten Astra helpt niemand.
 *
 * Datagedreven: een naam wordt samengevoegd als een kortere modelnaam van
 * hetzelfde merk er het begin van vormt. Geen handmatige lijst dus.
 */
function collapseVariants(models) {
  const bases = [...models].sort((a, b) => a.name.length - b.name.length);
  const result = new Map();

  for (const model of models) {
    let target = model.name;
    for (const base of bases) {
      if (base.name.length >= model.name.length) break;
      const boundary = model.name.charAt(base.name.length);
      if (model.name.startsWith(base.name) && (boundary === " " || boundary === "-")) {
        target = base.name;
        break;
      }
    }

    const existing = result.get(target);
    if (!existing) {
      result.set(target, { ...model, name: target });
    } else {
      existing.count += model.count;
      if (model.from && (!existing.from || model.from < existing.from)) existing.from = model.from;
      if (model.to && (!existing.to || model.to > existing.to)) existing.to = model.to;
    }
  }

  return [...result.values()];
}

/**
 * Leesbaar maken zonder modelaanduidingen kapot te maken. "GOLF PLUS" wordt
 * "Golf Plus", maar "ID.3", "GTE" en "KW" blijven staan: dat zijn geen
 * woorden maar type- en eenheidsaanduidingen.
 */
function toLabel(name) {
  const capitalise = (word) => {
    if (/\d/.test(word)) return word;
    if (word.length <= 3) return word.toUpperCase();
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  };

  return name
    .split(" ")
    .map((word) =>
      // Ook na een koppelteken een hoofdletter: "MERCEDES-BENZ" hoort
      // "Mercedes-Benz" te worden, niet "Mercedes-benz".
      word.split("-").map(capitalise).join("-"),
    )
    .join(" ");
}

function yearFrom(value) {
  if (!value) return undefined;
  const year = Number(String(value).slice(0, 4));
  return Number.isFinite(year) && year > 1900 ? year : undefined;
}

console.log(`Merken ophalen (minimaal ${MIN_VEHICLES_PER_MAKE} voertuigen)…`);
const makeRows = await query({
  $select: "merk, count(*) as aantal",
  $where: `voertuigsoort='${VEHICLE_KIND}'`,
  $group: "merk",
  $order: "aantal DESC",
  $limit: "400",
});

// Aliassen samenvoegen: één merk kan meerdere RDW-schrijfwijzen hebben, en
// die moeten samen één keuze worden met de modellen van allebei erin.
const grouped = new Map();
for (const row of makeRows) {
  if (!row.merk) continue;
  const raw = row.merk.trim().toUpperCase();
  const canonical = MAKE_ALIASES[raw] ?? raw;
  if (COACHBUILDERS.has(canonical)) continue;

  const existing = grouped.get(canonical);
  if (existing) {
    existing.count += Number(row.aantal);
    existing.rdwNames.push(row.merk.trim());
  } else {
    grouped.set(canonical, {
      name: canonical,
      count: Number(row.aantal),
      rdwNames: [row.merk.trim()],
    });
  }
}

const makes = [...grouped.values()]
  .filter((make) => make.count >= MIN_VEHICLES_PER_MAKE)
  .sort((a, b) => b.count - a.count);

console.log(`  ${makes.length} merken boven de grens.`);

const catalog = [];
for (const [index, make] of makes.entries()) {
  const namesClause = make.rdwNames
    .map((name) => `merk='${name.replace(/'/g, "''")}'`)
    .join(" OR ");
  const rows = await query({
    $select:
      "handelsbenaming, count(*) as aantal, min(datum_eerste_toelating) as vanaf, max(datum_eerste_toelating) as tot",
    $where: `voertuigsoort='${VEHICLE_KIND}' AND (${namesClause})`,
    $group: "handelsbenaming",
    $order: "aantal DESC",
    $limit: "200",
  });

  // Schrijfwijzen samenvoegen; de meest voorkomende wint als label
  const merged = new Map();
  for (const row of rows) {
    const count = Number(row.aantal);
    if (count < MIN_VEHICLES_PER_MODEL) continue;
    const cleaned = cleanModel(row.handelsbenaming, make.name);
    if (!cleaned) continue;

    const key = mergeKey(cleaned);
    if (!key) continue;
    const existing = merged.get(key);
    const from = yearFrom(row.vanaf);
    const to = yearFrom(row.tot);

    if (!existing) {
      merged.set(key, { name: cleaned, count, from, to });
    } else {
      if (count > existing.count) existing.name = cleaned;
      existing.count += count;
      if (from && (!existing.from || from < existing.from)) existing.from = from;
      if (to && (!existing.to || to > existing.to)) existing.to = to;
    }
  }

  const models = collapseVariants(
    [...merged.values()].map((model) => ({ ...model, name: toLabel(model.name) })),
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, MODELS_PER_MAKE)
    .map((model) => ({ name: model.name, from: model.from, to: model.to }))
    // Alfabetisch tonen: de klant zoekt op naam, niet op populariteit
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));

  if (models.length === 0) {
    console.log(`  ${index + 1}/${makes.length} ${make.name}: geen bruikbare modellen, overgeslagen`);
    continue;
  }

  catalog.push({ name: toLabel(make.name), rdwNames: make.rdwNames, models });
  console.log(`  ${index + 1}/${makes.length} ${make.name}: ${models.length} modellen`);
}

catalog.sort((a, b) => a.name.localeCompare(b.name, "nl"));

const output = {
  source: "opendata.rdw.nl dataset m9d7-ebf2 (Gekentekende voertuigen)",
  vehicleKind: VEHICLE_KIND,
  generatedAt: new Date().toISOString().slice(0, 10),
  makes: catalog,
};

writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, "utf8");

const totalModels = catalog.reduce((sum, m) => sum + m.models.length, 0);
console.log(`\nKlaar: ${catalog.length} merken, ${totalModels} modellen -> ${OUTPUT}`);
