// Past de migraties uit db/migrations/ toe op de database.
//
//   pnpm db:migrate                       -> laat zien wat er zou gebeuren
//   pnpm db:migrate --write               -> voert de openstaande migraties uit
//   pnpm db:migrate --baseline 0009_...   -> tekent alles t/m dat bestand af
//                                            zonder het te draaien
//
// Waarom dit script er is, en waarom pas nu: de eerste negen migraties zijn
// met de hand toegepast, en dat ging negen keer goed. Dat is precies hoe een
// database en de code die erop rekent uit elkaar gaan lopen — bij de tiende
// keer sta je met een deploy die niet start en weet je niet meer welke
// migratie er wel en niet in zit (@docs/DECISIONS.md #25).
//
// Drie dingen die de vorm bepalen:
//
// 1. **Niets draaien tenzij je --write zegt.** Zelfde afspraak als
//    `orders:migrate`. Een script dat zomaar DDL op de productiedatabase
//    loslaat is een script dat je een keer per ongeluk aanroept.
// 2. **Wat gedraaid is staat in de database zelf**, in `schema_migrations`,
//    en niet in een bestand hier. Alleen de database weet wat er écht in zit.
// 3. **Geen transactie eromheen.** MySQL en MariaDB sluiten een transactie
//    stilletjes af bij elke CREATE of ALTER; een rollback bestaat hier niet.
//    Daarom één migratie per keer, en pas aftekenen als hij geslaagd is.
//    Schrijf migraties dus zo dat ze alleen toevoegen (IF NOT EXISTS).

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import mysql from "mysql2/promise";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIR = path.join(ROOT, "db", "migrations");

const args = process.argv.slice(2);
const write = args.includes("--write");
const baselineAt = args.indexOf("--baseline");
const baseline = baselineAt === -1 ? null : args[baselineAt + 1];

function readEnvFile() {
  const out = {};
  let raw;
  try {
    raw = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
  } catch {
    return out;
  }
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const at = line.indexOf("=");
    if (at === -1) continue;
    out[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return out;
}

const env = { ...readEnvFile(), ...process.env };
const missing = [
  "DATABASE_HOST",
  "DATABASE_NAME",
  "DATABASE_USER",
  "DATABASE_PASSWORD",
].filter((key) => !env[key]);

if (missing.length > 0) {
  console.error(`Ontbreekt in .env: ${missing.join(", ")}`);
  process.exit(1);
}

const files = fs
  .readdirSync(DIR)
  .filter((name) => name.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  console.log("Geen migraties gevonden in db/migrations/.");
  process.exit(0);
}

if (baseline && !files.includes(baseline)) {
  console.error(`Onbekende migratie bij --baseline: ${baseline}`);
  console.error(`Keuze: ${files.join(", ")}`);
  process.exit(1);
}

const host = env.DATABASE_HOST;
const port = Number(env.DATABASE_PORT) || 3306;
const local = ["localhost", "127.0.0.1", "::1"].includes(host);

let connection;
try {
  connection = await mysql.createConnection({
    host,
    port,
    // Zelfde reden als in src/lib/db/client.ts: de witte lijst van Remote
    // MySQL kent alleen IPv4.
    ...(local ? {} : { stream: () => net.connect({ host, port, family: 4 }) }),
    database: env.DATABASE_NAME,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    connectTimeout: 10_000,
    // Een migratiebestand bevat meerdere opdrachten. Ze hier in één keer
    // uitvoeren scheelt een eigen SQL-splitser, en die zou vroeg of laat
    // struikelen over een puntkomma in een comment of in een tekst.
    multipleStatements: true,
  });
} catch (error) {
  console.error(`Verbinden mislukt: ${error?.code ?? error?.message}`);
  process.exit(1);
}

// De boekhouding van dit script. Zonder --write ook aanmaken: hij is leeg en
// onschuldig, en zonder hem valt er niets te laten zien.
await connection.query(
  `CREATE TABLE IF NOT EXISTS schema_migrations (
     name VARCHAR(128) NOT NULL,
     applied_at DATETIME NOT NULL,
     PRIMARY KEY (name)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
);

const [rows] = await connection.query(`SELECT name FROM schema_migrations`);
const done = new Set(rows.map((row) => row.name));

console.log(`Database  ${env.DATABASE_NAME} op ${host}`);
console.log(`Migraties ${files.length} bestanden, ${done.size} al afgetekend\n`);

// --- aftekenen zonder draaien ---------------------------------------------
if (baseline) {
  const upTo = files.slice(0, files.indexOf(baseline) + 1);
  const nieuw = upTo.filter((name) => !done.has(name));

  if (nieuw.length === 0) {
    console.log("Niets af te tekenen; die staan er al in.");
  } else {
    console.log(`Aftekenen zonder uitvoeren t/m ${baseline}:`);
    for (const name of nieuw) console.log(`  ${name}`);
    if (write) {
      for (const name of nieuw) {
        await connection.execute(
          `INSERT IGNORE INTO schema_migrations (name, applied_at) VALUES (?, ?)`,
          [name, new Date()],
        );
      }
      console.log("\nAfgetekend.");
    } else {
      console.log("\nNiets gedaan. Voeg --write toe om dit vast te leggen.");
    }
  }
  await connection.end();
  process.exit(0);
}

// --- openstaande migraties -------------------------------------------------
const open = files.filter((name) => !done.has(name));

if (open.length === 0) {
  console.log("Niets te doen: de database is bij.");
  await connection.end();
  process.exit(0);
}

console.log(`Openstaand (${open.length}):`);
for (const name of open) {
  const bytes = fs.statSync(path.join(DIR, name)).size;
  console.log(`  ${name}  (${bytes} bytes)`);
}

if (!write) {
  console.log("\nNiets gedaan. Voeg --write toe om ze uit te voeren.");
  console.log(
    "Zijn deze al met de hand gedraaid? Teken ze dan af met --baseline <bestand> --write.",
  );
  await connection.end();
  process.exit(0);
}

console.log("");
for (const name of open) {
  const sql = fs.readFileSync(path.join(DIR, name), "utf8");
  process.stdout.write(`  ${name} … `);
  try {
    await connection.query(sql);
  } catch (error) {
    console.log("MISLUKT");
    console.error(`\n${error?.sqlMessage ?? error?.message}`);
    console.error(
      "\nDe migraties hierna zijn niet gedraaid. Los dit op en draai opnieuw;" +
        " wat wél gelukt is staat afgetekend en wordt overgeslagen.",
    );
    await connection.end();
    process.exit(1);
  }
  await connection.execute(
    `INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)`,
    [name, new Date()],
  );
  console.log("ok");
}

console.log("\nKlaar. Controleer met pnpm db:check.");
await connection.end();
