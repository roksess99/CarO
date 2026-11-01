// Controleert of CLIENT_NAMESPACES nog klopt met wat er echt in de browser
// draait.
//
//   pnpm messages:check
//
// De layout geeft `NextIntlClientProvider` niet de hele berichtenboom meer
// maar alleen de namespaces uit `src/i18n/client-messages.ts` — anders gaat
// alle 794 teksten op élke pagina mee in de RSC-payload, de privacyverklaring
// en de maileksten incluis (de meting staat in dat bestand).
//
// De prijs daarvan is een lijst die kan verlopen. Een clientcomponent die een
// namespace opvraagt die er niet in staat laat geen fout zien maar rendert de
// sleutel: "cart.title" in beeld in plaats van "Winkelwagen". Dit script
// vangt dat voordat het live staat.
//
// Het loopt niet de bestanden met "use client" af maar de héle sluiting
// daaronder: wat zo'n bestand importeert belandt net zo goed in de browser.
// Een servercomponent komt er niet in voor — die leest zijn teksten
// rechtstreeks uit de request-config en ziet dus altijd alles.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");

/** Elk .ts/.tsx-bestand onder src/, met pad in POSIX-vorm */
function sourceFiles(dir, out = new Map()) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name)) {
      out.set(
        path.relative(ROOT, full).split(path.sep).join("/"),
        fs.readFileSync(full, "utf8"),
      );
    }
  }
  return out;
}

const files = sourceFiles(SRC);

function resolveImport(spec, from) {
  let base;
  if (spec.startsWith("@/")) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith(".")) {
    base = path
      .normalize(path.join(path.dirname(from), spec))
      .split(path.sep)
      .join("/");
  } else return null;
  for (const kandidaat of [
    `${base}.tsx`,
    `${base}.ts`,
    `${base}/index.tsx`,
    `${base}/index.ts`,
  ]) {
    if (files.has(kandidaat)) return kandidaat;
  }
  return null;
}

const seeds = [...files].filter(([, text]) =>
  /^\s*["']use client["']/.test(text),
);
const bundle = new Set(seeds.map(([file]) => file));
const stack = [...bundle];
while (stack.length > 0) {
  const file = stack.pop();
  for (const [, spec] of files
    .get(file)
    .matchAll(/from\s+["']([^"']+)["']/g)) {
    const target = resolveImport(spec, file);
    if (target && !bundle.has(target)) {
      bundle.add(target);
      stack.push(target);
    }
  }
}

// Welke namespace vraagt welk bestand op, en vraagt er iemand de hele boom op?
const used = new Map();
const wholeTree = [];
for (const file of [...bundle].sort()) {
  const text = files.get(file);
  for (const [, namespace] of text.matchAll(
    /useTranslations\(\s*["']([^"']+)["']/g,
  )) {
    if (!used.has(namespace)) used.set(namespace, []);
    used.get(namespace).push(file);
  }
  if (/useTranslations\(\s*\)/.test(text) || /useMessages\(/.test(text)) {
    wholeTree.push(file);
  }
}

const listed = [
  ...fs
    .readFileSync(path.join(SRC, "i18n/client-messages.ts"), "utf8")
    .matchAll(/^\s{2}"([a-zA-Z]+)",$/gm),
].map(([, namespace]) => namespace);

if (listed.length === 0) {
  console.error("Geen namespaces gevonden in src/i18n/client-messages.ts.");
  console.error("Staat CLIENT_NAMESPACES er nog, één naam per regel?");
  process.exit(1);
}

const messages = JSON.parse(
  fs.readFileSync(path.join(ROOT, "messages/nl.json"), "utf8"),
);

const ontbreekt = [...used.keys()].filter((ns) => !listed.includes(ns)).sort();
const overbodig = listed.filter((ns) => !used.has(ns));
const onbekend = listed.filter((ns) => !(ns in messages));

console.log(
  `Clientbundel: ${bundle.size} bestanden, waarvan ${seeds.length} met "use client".`,
);
console.log(
  `Namespaces: ${used.size} opgevraagd, ${listed.length} in CLIENT_NAMESPACES.`,
);

let fout = false;

if (wholeTree.length > 0) {
  fout = true;
  console.error(
    "\n✗ Een clientcomponent vraagt de hele berichtenboom op; dan heeft een",
  );
  console.error("  lijst geen zin meer. Geef dit onderdeel een namespace:");
  for (const file of wholeTree) console.error(`    ${file}`);
}

if (ontbreekt.length > 0) {
  fout = true;
  console.error("\n✗ Opgevraagd in de browser maar niet meegegeven:");
  for (const ns of ontbreekt) {
    console.error(`    ${ns}  (${used.get(ns).join(", ")})`);
  }
  console.error("  Zet deze in CLIENT_NAMESPACES, anders rendert de sleutel.");
}

if (onbekend.length > 0) {
  fout = true;
  console.error(
    `\n✗ Staat in CLIENT_NAMESPACES maar niet in messages/nl.json: ${onbekend.join(", ")}`,
  );
}

if (overbodig.length > 0) {
  // Geen fout: een namespace die niemand meer opvraagt kost alleen bytes.
  const bytes = overbodig.reduce(
    (som, ns) => som + JSON.stringify(messages[ns] ?? "").length,
    0,
  );
  console.log(
    `\n· Niemand vraagt er nog om, mag eruit (${bytes} bytes per pagina): ${overbodig.join(", ")}`,
  );
}

if (fout) process.exit(1);

const gedragen = listed.reduce(
  (som, ns) => som + JSON.stringify(messages[ns] ?? "").length,
  0,
);
const alles = JSON.stringify(messages).length;
console.log(
  `\n✓ De lijst klopt. De browser krijgt ${gedragen} van ${alles} bytes (${Math.round((100 * gedragen) / alles)}%).`,
);
process.exit(0);
