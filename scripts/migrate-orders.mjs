// Verhuist de bestellingen van JSON-bestand naar MySQL.
//
//   pnpm orders:migrate           -> laat zien wat er zou gebeuren
//   pnpm orders:migrate --write   -> voert het uit
//
// Eenmalig bedoeld, maar veilig om vaker te draaien: een bestelling die al in
// de database staat wordt overgeslagen, niet overschreven. De JSON-bestanden
// blijven staan — pas weggooien als de winkel een tijdje op de database draait
// en er een back-up van is.
//
// De SQL staat hier apart en niet via src/lib/orders/store.ts: dit is een
// Node-script zonder TypeScript-bouwstap, en de vorm van deze bestanden ligt
// vast omdat er niets meer bij komt.

import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const ROOT = path.resolve(import.meta.dirname, "..");
const WRITE = process.argv.includes("--write");

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

const env = { ...readEnvFile(), ...process.env };
const ordersDir = env.ORDER_DATA_DIR || path.join(ROOT, ".data", "orders");

if (!fs.existsSync(ordersDir)) {
  console.log(`Geen map ${ordersDir} — niets te verhuizen.`);
  process.exit(0);
}

const files = fs
  .readdirSync(ordersDir)
  .filter((name) => name.endsWith(".json"))
  .sort();

if (files.length === 0) {
  console.log("Geen bestellingen gevonden.");
  process.exit(0);
}

const connection = await mysql.createConnection({
  host: env.DATABASE_HOST,
  port: Number(env.DATABASE_PORT) || 3306,
  database: env.DATABASE_NAME,
  user: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  timezone: "Z",
  connectTimeout: 10_000,
});

/** ISO-tekst → waarde voor een DATETIME-kolom, of NULL */
function at(iso) {
  return iso ? new Date(iso) : null;
}

/** Lege tekst hoort als NULL in de database */
function orNull(value) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : null;
}

let done = 0;
let skipped = 0;
let failed = 0;

for (const file of files) {
  let order;
  try {
    order = JSON.parse(fs.readFileSync(path.join(ordersDir, file), "utf8"));
  } catch (error) {
    console.log(`  ${file.padEnd(26)} ONLEESBAAR — ${error.message}`);
    failed += 1;
    continue;
  }

  const [existing] = await connection.query(
    "SELECT 1 FROM orders WHERE reference = ?",
    [order.reference],
  );
  if (existing.length > 0) {
    console.log(`  ${order.reference.padEnd(26)} stond er al`);
    skipped += 1;
    continue;
  }

  const d = order.document;
  const c = d.customer;
  const label = `${order.reference.padEnd(26)} ${order.status.padEnd(16)} ${
    (d.totalGrossCents / 100).toFixed(2).padStart(8)
  } EUR  ${order.items.length} regel(s)`;

  if (!WRITE) {
    console.log(`  ${label}  -> zou verhuizen`);
    done += 1;
    continue;
  }

  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO orders (
         reference, status, access_token, locale,
         payment_id, payment_method,
         email, first_name, last_name, phone,
         postcode, house_number, house_number_addition, street, city, country,
         items_gross_cents, shipping_gross_cents, discount_cents,
         total_gross_cents, total_vat_cents,
         document_json, created_at, paid_at, notified_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.reference,
        order.status,
        order.accessToken,
        order.locale,
        order.paymentId || null,
        order.paymentMethod ?? null,
        c.email,
        c.firstName,
        c.lastName,
        orNull(c.phone),
        c.postcode,
        c.houseNumber,
        orNull(c.houseNumberAddition),
        c.street,
        c.city,
        c.country,
        d.itemsGrossCents,
        d.shippingGrossCents,
        0,
        d.totalGrossCents,
        d.totalVatCents,
        JSON.stringify(d),
        at(order.createdAt),
        at(order.paidAt),
        at(order.notifiedAt),
      ],
    );

    for (const [index, item] of order.items.entries()) {
      const line = d.lines[index];
      await connection.execute(
        `INSERT INTO order_lines (
           order_reference, part_id, family, name, brand, oe_number,
           quantity, unit_gross_cents, line_gross_cents
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.reference,
          item.partId,
          item.family,
          line?.name ?? "",
          orNull(line?.brand),
          orNull(line?.oeNumber),
          item.quantity,
          line?.unitGrossCents ?? 0,
          line?.lineGrossCents ?? 0,
        ],
      );
    }

    await connection.commit();
    console.log(`  ${label}  -> verhuisd`);
    done += 1;
  } catch (error) {
    await connection.rollback();
    console.log(`  ${order.reference.padEnd(26)} MISLUKT — ${error.message}`);
    failed += 1;
  }
}

const [[counts]] = await connection.query(
  `SELECT (SELECT COUNT(*) FROM orders) AS orders,
          (SELECT COUNT(*) FROM order_lines) AS lines_total`,
);

console.log("");
console.log(
  WRITE
    ? `Verhuisd ${done}, overgeslagen ${skipped}, mislukt ${failed}.`
    : `Zou ${done} verhuizen, ${skipped} overslaan, ${failed} mislukt.`,
);
console.log(
  `In de database: ${counts.orders} bestellingen, ${counts.lines_total} regels.`,
);

if (!WRITE) {
  console.log("");
  console.log("Niets gewijzigd. Draai met --write om het echt te doen.");
}

await connection.end();
if (failed > 0) process.exitCode = 1;
