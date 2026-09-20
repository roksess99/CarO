import net from "node:net";
import mysql from "mysql2/promise";

/**
 * De verbinding met MySQL. Eén plek, zodat de rest van de winkel niet weet
 * waar de gegevens staan — dezelfde opzet als `lib/orders/store.ts` had met
 * zijn vier functies (docs/DECISIONS.md #13).
 *
 * Vier instellingen hieronder zijn geen smaak maar noodzaak:
 *
 * **`timezone: "Z"`.** Zonder dit leest mysql2 een `DATETIME` uit de database
 * met de tijdzone van de server waarop Node draait. Dezelfde bestelling zou
 * dan in de zomer een uur eerder lijken te zijn betaald dan in de winter, en
 * op een server in een andere zone weer anders. Alles gaat er als UTC in en
 * komt er als UTC uit; omrekenen naar Nederlandse tijd doet de weergave.
 *
 * **`connectionLimit: 5`.** Gedeelde hosting staat maar een beperkt aantal
 * gelijktijdige verbindingen toe voor het hele account. Een ruime pool lijkt
 * sneller maar levert bij drukte "too many connections" op — en dan ligt de
 * winkel plat, niet alleen het beheerpaneel.
 *
 * **`namedPlaceholders: false` en altijd `?`.** Waarden gaan nooit in de
 * querytekst zelf. Dat is de enige verdediging tegen SQL-injectie die werkt.
 *
 * **De pool overleeft een hot reload.** Next laadt modules in ontwikkeling
 * opnieuw; zonder deze verwijzing op `globalThis` maakt elke wijziging een
 * nieuwe pool en loop je binnen een minuut tegen de verbindingslimiet aan.
 */

/**
 * Wat je als parameter mag meegeven. Nauwer dan `unknown`, en dat is de
 * bedoeling: het zegt meteen dat een object of een array eerst zelf naar JSON
 * moet, in plaats van dat mysql2 er stilletjes iets van maakt.
 */
export type SqlValue = string | number | boolean | Date | Buffer | null;

export function databaseIsConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_HOST &&
      process.env.DATABASE_NAME &&
      process.env.DATABASE_USER &&
      process.env.DATABASE_PASSWORD,
  );
}

const globalForDb = globalThis as unknown as {
  caroDbPool?: mysql.Pool;
};

/** De database draait op dezelfde machine als de winkel */
function isLocalHost(host: string): boolean {
  return ["localhost", "127.0.0.1", "::1"].includes(host);
}

function pool(): mysql.Pool {
  if (globalForDb.caroDbPool) return globalForDb.caroDbPool;

  if (!databaseIsConfigured()) {
    // Bewust zonder de waarden erbij: een foutmelding komt in een logbestand
    // terecht en een wachtwoord hoort daar niet in.
    throw new Error(
      "Database niet ingesteld — zet de vijf DATABASE_*-variabelen in .env",
    );
  }

  const host = process.env.DATABASE_HOST as string;
  const port = Number(process.env.DATABASE_PORT) || 3306;

  const created = mysql.createPool({
    host,
    port,
    // Bij een database op afstand: altijd over IPv4 verbinden.
    //
    // De witte lijst van Remote MySQL bij Hostinger kent alleen IPv4-adressen.
    // Node kiest zelf tussen het A- en het AAAA-record, dus dezelfde laptop
    // kwam de ene verbinding over IPv4 binnen en de volgende over IPv6 — en
    // dat tweede adres kán niet op de lijst staan. Het gevolg was een
    // "Access denied" die willekeurig leek te komen en gaan.
    //
    // Op de server zelf laten we het met rust: daar is `localhost` de
    // verbinding en die hoort niet over het internet te lopen (#13).
    ...(isLocalHost(host)
      ? {}
      : { stream: () => net.connect({ host, port, family: 4 }) }),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    connectionLimit: 5,
    waitForConnections: true,
    // Liever een wachtrij dan een geweigerde bestelling
    queueLimit: 0,
    connectTimeout: 10_000,
    timezone: "Z",
    charset: "utf8mb4_unicode_ci",
  });

  globalForDb.caroDbPool = created;
  return created;
}

/** Rijen ophalen. Waarden altijd als `?`-parameters, nooit in de tekst. */
export async function query<T>(
  sql: string,
  values: ReadonlyArray<SqlValue> = [],
): Promise<T[]> {
  // mysql2 wil een muteerbare array; een kopie houdt onze API readonly
  const [rows] = await pool().query(sql, [...values]);
  return rows as T[];
}

/** Eerste rij, of `null`. */
export async function queryOne<T>(
  sql: string,
  values: ReadonlyArray<SqlValue> = [],
): Promise<T | null> {
  const rows = await query<T>(sql, values);
  return rows[0] ?? null;
}

/** Schrijven zonder resultaat; geeft terug hoeveel rijen geraakt zijn. */
export async function execute(
  sql: string,
  values: ReadonlyArray<SqlValue> = [],
): Promise<{ affectedRows: number; insertId: number }> {
  const [result] = await pool().execute(sql, [...values]);
  const header = result as mysql.ResultSetHeader;
  return { affectedRows: header.affectedRows, insertId: header.insertId };
}

/**
 * Alles of niets, op één verbinding.
 *
 * Dit is waar het factuurnummer uit komt: de teller ophogen en de factuur
 * wegschrijven horen in dezelfde transactie, anders ontstaat er een nummer
 * waar geen factuur bij hoort — een gat in een reeks die aaneengesloten moet
 * zijn (docs/DECISIONS.md #12).
 *
 * `SELECT … FOR UPDATE` werkt alléén binnen zo'n transactie. Buiten een
 * transactie geeft MySQL het slot meteen weer vrij en kunnen twee
 * bestellingen tegelijk hetzelfde nummer krijgen.
 */
export async function transaction<T>(
  work: (tx: mysql.PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await pool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    // Terug in de pool, ook als er iets misging: een verbinding die blijft
    // hangen is er één minder voor de volgende klant.
    connection.release();
  }
}

/**
 * Een JSON-kolom uitlezen, ongeacht wat de driver ervan maakt.
 *
 * MariaDB bewaart JSON als tekst en geeft het als tekst terug; MySQL 8 leest
 * het zelf al om en levert een object. Wie blind `JSON.parse()` doet krijgt op
 * de ene server het juiste antwoord en op de andere
 * `SyntaxError: "[object Object]" is not valid JSON`. GEBEURD 2026-09-20 bij
 * `job_runs.detail_json`, terwijl de order- en factuuropslag het al goed
 * deden — vandaar dat dit hier staat en niet drie keer los.
 */
export function readJson<T>(value: string | T): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : value;
}
