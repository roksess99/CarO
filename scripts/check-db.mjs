// Controleert of de database bereikbaar is en of het schema klopt, zonder de
// site te starten.
//
//   pnpm db:check
//
// Leest de vijf DATABASE_*-variabelen uit .env. Het wachtwoord wordt nooit
// afgedrukt — alleen of de verbinding lukt en, zo niet, wat MySQL terugzei.
//
// Draai dit na elke migratie en na elke deploy: een winkel die op mockdata
// draait ziet er compleet uit, en een beheerpaneel zonder database ook.

import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import mysql from "mysql2/promise";

const ROOT = path.resolve(import.meta.dirname, "..");

/**
 * Alle tabellen uit db/migrations/, in de volgorde waarin ze ontstaan.
 *
 * Komt er een migratie bij, zet de tabel er dan hier ook bij — anders meldt
 * dit script hem als "niet in het schema" en lijkt een nieuwe tabel een fout.
 */
const EXPECTED = [
  // 0001_init.sql
  "admins",
  "admin_invites",
  "admin_sessions",
  "admin_recovery_codes",
  "audit_log",
  "orders",
  "order_lines",
  "counters",
  "invoices",
  "discount_rules",
  "discount_codes",
  "discount_code_uses",
  "price_history",
  // 0004_job_runs.sql
  "job_runs",
  // 0005_price_rules.sql
  "price_rules",
  // 0006_reviews.sql
  "reviews",
  "review_products",
];

function readEnvFile() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) return {};
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const at = line.indexOf("=");
    if (at === -1) continue;
    out[line.slice(0, at).trim()] = line.slice(at + 1).trim();
  }
  return out;
}

function fail(...lines) {
  for (const line of lines) console.error(line);
  process.exitCode = 1;
}

const env = { ...readEnvFile(), ...process.env };
const missing = [
  "DATABASE_HOST",
  "DATABASE_NAME",
  "DATABASE_USER",
  "DATABASE_PASSWORD",
].filter((key) => !env[key]);

if (missing.length > 0) {
  fail(
    `Ontbreekt in .env: ${missing.join(", ")}`,
    "Zie .env.example voor waar je deze vandaan haalt.",
  );
  process.exit();
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
    // MySQL kent alleen IPv4, dus een verbinding over IPv6 kan er nooit op
    // staan. Zonder dit noemde dit script een IPv6-adres om toe te voegen —
    // advies dat niet uit te voeren is.
    ...(local ? {} : { stream: () => net.connect({ host, port, family: 4 }) }),
    database: env.DATABASE_NAME,
    user: env.DATABASE_USER,
    password: env.DATABASE_PASSWORD,
    connectTimeout: 10_000,
  });
} catch (error) {
  const code = error?.code ?? "";
  fail(`Verbinden mislukt: ${code || error?.message}`);
  // De drie fouten die je in de praktijk krijgt, met wat ze betekenen.
  if (code === "ETIMEDOUT" || code === "ECONNREFUSED") {
    fail(
      "",
      "Dit is bijna altijd Remote MySQL: je IP-adres staat niet op de witte",
      "lijst in hPanel. Draait dit óp de server zelf, zet DATABASE_HOST dan op",
      "localhost — dan is Remote MySQL helemaal niet nodig.",
    );
  } else if (code === "ER_ACCESS_DENIED_ERROR") {
    // MySQL geeft exact dezelfde fout bij een verkeerd wachtwoord als bij een
    // IP dat niet op de witte lijst staat: in dat tweede geval bestaat de
    // combinatie gebruiker@ip simpelweg niet. Van hieraf zijn ze niet te
    // onderscheiden, dus noem allebei — en het IP dat de server zag, want dat
    // is precies wat er in Remote MySQL moet staan.
    const seen = String(error?.message ?? "").match(/@'([^']+)'/);
    fail(
      "",
      "Twee mogelijke oorzaken, en MySQL zegt niet welke van de twee:",
      "  1. het wachtwoord klopt niet",
      `  2. dit IP staat niet in Remote MySQL: ${seen ? seen[1] : "(onbekend)"}`,
      "",
      "Staat het IP er wel in? Zet dan in hPanel een nieuw wachtwoord op de",
      "database en neem dat over in .env — dan is er nog maar één oorzaak over.",
    );
  } else if (code === "ER_BAD_DB_ERROR") {
    fail("", "De database bestaat niet. Let op het voorvoegsel u<nummer>_.");
  }
  process.exit();
}

const [[server]] = await connection.query(
  "SELECT VERSION() AS version, @@character_set_database AS charset, @@collation_database AS collation",
);

console.log(`Server    ${server.version}`);
console.log(`Database  ${env.DATABASE_NAME} (${server.charset} / ${server.collation})`);

if (!String(server.charset).startsWith("utf8mb4")) {
  fail(
    "",
    `LET OP: de tekenset is ${server.charset} en niet utf8mb4.`,
    "Daarmee lopen een ë, een emoji of een Chinese fabrikantsnaam stuk.",
  );
}

const [rows] = await connection.query(
  `SELECT table_name AS name, table_rows AS rows_estimate
     FROM information_schema.tables
    WHERE table_schema = ?
    ORDER BY table_name`,
  [env.DATABASE_NAME],
);

const present = new Set(rows.map((row) => row.name));
const absent = EXPECTED.filter((name) => !present.has(name));
const extra = [...present].filter((name) => !EXPECTED.includes(name));

console.log("");
console.log(`Tabellen  ${present.size} gevonden, ${EXPECTED.length} verwacht`);

// Echte aantallen, niet de schatting uit information_schema: die staat op een
// lege InnoDB-tabel vaak op 0 terwijl er rijen in staan, en andersom.
for (const name of EXPECTED) {
  if (!present.has(name)) continue;
  const [[count]] = await connection.query(
    `SELECT COUNT(*) AS n FROM \`${name}\``,
  );
  console.log(`  ${name.padEnd(22)} ${String(count.n).padStart(6)} rijen`);
}

if (absent.length > 0) {
  fail("", `Ontbreekt: ${absent.join(", ")}`, "Draai db/migrations/0001_init.sql.");
}
if (extra.length > 0) {
  console.log("");
  console.log(`Niet in het schema: ${extra.join(", ")}`);
}

await connection.end();

if (absent.length === 0 && process.exitCode !== 1) {
  console.log("");
  console.log("Database in orde.");
}
