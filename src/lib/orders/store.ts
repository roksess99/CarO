import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StoredOrder } from "./types";

/**
 * Opslag van bestellingen als JSON-bestand, één per order.
 *
 * **Dit is bewust de eenvoudigste opzet die werkt, geen eindstation.** De
 * winkel plaatst nog geen inkooporders: de beheerder krijgt een mail met de
 * PDF en bestelt met de hand. Wat de opslag daarvoor moet kunnen is een
 * bestelling terugvinden als Mollie zich meldt, en onthouden dat de mails al
 * verstuurd zijn. Een database met migraties en een ORM voegt daar op dit
 * volume niets aan toe.
 *
 * **Dit vraagt een schijf die blijft bestaan.** De winkel draait bij Hostinger,
 * dus die is er (docs/DECISIONS.md #2). Op een serverless platform zou het
 * bestandssysteem per aanroep leeg zijn en de bestelling tussen het aanmaken en
 * de webhook verdwijnen. Zet `ORDER_DATA_DIR` op een pad buiten de projectmap,
 * anders neemt een nieuwe deploy de bestellingen mee in de opruiming.
 *
 * Moet dit later een database worden, dan raakt dat alleen dit bestand: de rest
 * van de code praat uitsluitend met de vier functies hieronder.
 *
 * De map staat standaard buiten `public/`: een orderbestand bevat NAW-gegevens
 * en mag nooit als statisch bestand uitgeleverd kunnen worden.
 */

function ordersDir(): string {
  return process.env.ORDER_DATA_DIR ?? path.join(process.cwd(), ".data", "orders");
}

/**
 * Een kenmerk komt uit onze eigen code, maar het pad wordt ermee opgebouwd.
 * Alles wat geen `A-Z 0-9 -` is eruit, zodat `../` nooit een bestand buiten de
 * map kan aanwijzen als er ooit een kenmerk uit een verzoek binnenkomt.
 */
function fileFor(reference: string): string {
  const safe = reference.replace(/[^A-Za-z0-9-]/g, "");
  if (!safe) throw new Error("Ongeldig ordernummer");
  return path.join(ordersDir(), `${safe}.json`);
}

export async function saveOrder(order: StoredOrder): Promise<void> {
  const file = fileFor(order.reference);
  await mkdir(path.dirname(file), { recursive: true });
  // Eerst naar een tijdelijk bestand, dan hernoemen: een onderbroken schrijf
  // laat anders half JSON achter en die order is dan niet meer te lezen.
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(order, null, 2), "utf8");
  await rename(temp, file);
}

export async function readOrder(reference: string): Promise<StoredOrder | null> {
  try {
    const json = await readFile(fileFor(reference), "utf8");
    return JSON.parse(json) as StoredOrder;
  } catch {
    // Bestaat niet, of onleesbaar — voor de aanroeper hetzelfde geval
    return null;
  }
}

/**
 * Leest, past aan en schrijft terug. Geeft `null` als de order niet bestaat.
 *
 * Let op: dit is geen slot. Twee webhooks tegelijk kunnen elkaars wijziging
 * overschrijven. Daarom hangt het versturen van de mails niet aan dit veld
 * alleen, maar wordt het één keer per proces afgeschermd (zie settle.ts).
 */
export async function updateOrder(
  reference: string,
  change: (order: StoredOrder) => StoredOrder,
): Promise<StoredOrder | null> {
  const current = await readOrder(reference);
  if (!current) return null;
  const next = change(current);
  await saveOrder(next);
  return next;
}
