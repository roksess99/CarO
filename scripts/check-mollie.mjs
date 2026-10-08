// Controleert of de Mollie-sleutel klopt, zonder de site te starten.
//
//   pnpm mollie:check            -> alleen de sleutel en het account nakijken
//   pnpm mollie:check --create   -> ook een testbetaling aanmaken en de
//                                   betaal-URL tonen
//
// Leest MOLLIE_API_KEY uit .env. De sleutel wordt nooit afgedrukt — alleen of
// hij werkt en, zo niet, wat Mollie terugzei.
//
// `--create` maakt een échte betaling aan in het Mollie-dashboard. Met een
// test_-sleutel is dat een testbetaling: er gaat geen geld heen en weer. Met
// een live_-sleutel wél, en daarom weigert dit script dat.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const API = "https://api.mollie.com/v2";

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

async function call(key, endpoint, init = {}) {
  const response = await fetch(`${API}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body };
}

async function main() {
  const env = { ...readEnvFile(), ...process.env };
  const key = env.MOLLIE_API_KEY;

  if (!key) {
    return fail(
      "Ontbreekt in .env: MOLLIE_API_KEY",
      "Dashboard > Ontwikkelaars > API-sleutels. Zie .env.example.",
    );
  }

  const test = key.startsWith("test_");
  const live = key.startsWith("live_");

  if (!test && !live) {
    return fail(
      "De sleutel begint niet met test_ of live_.",
      "Kopieer hem opnieuw uit het dashboard; dit lijkt geen sleutel.",
    );
  }

  // Een echte sleutel is `test_`/`live_` plus dertig tekens. Korter betekent
  // bijna altijd dat er een voorbeeldwaarde is blijven staan.
  if (key.length < 30) {
    return fail(
      `De sleutel is maar ${key.length} tekens lang; dat is te kort.`,
      "Staat er nog een voorbeeldwaarde? Plak de echte sleutel uit het dashboard.",
    );
  }

  console.log(`Sleutel  ${test ? "TESTMODUS — geen echt geld" : "LIVE — echte betalingen"}`);

  const methods = await call(key, "/methods");
  if (!methods.ok) {
    return fail(
      `\nMollie weigert de sleutel (HTTP ${methods.status}).`,
      methods.body?.detail ?? "geen uitleg meegestuurd",
    );
  }

  const names = (methods.body?._embedded?.methods ?? []).map((m) => m.description);
  console.log(`Methodes ${names.length > 0 ? names.join(", ") : "geen enkele actief"}`);
  if (names.length === 0) {
    console.log("         Zet betaalmethodes aan in het dashboard, anders kan de klant niets kiezen.");
  }

  if (!process.argv.includes("--create")) {
    console.log("\nSleutel werkt. `pnpm mollie:check --create` maakt een testbetaling aan.");
    return;
  }

  if (live) {
    return fail("\nWeigering: --create met een live-sleutel maakt een echte betaling aan.");
  }

  const payment = await call(key, "/payments", {
    method: "POST",
    body: JSON.stringify({
      amount: { currency: "EUR", value: "1.00" },
      description: "CarO controle",
      redirectUrl: "https://example.com/",
      metadata: { reference: "CARO-CHECK", token: "check" },
      locale: "nl_NL",
    }),
  });

  if (!payment.ok) {
    return fail(
      `\nAanmaken mislukt (HTTP ${payment.status}).`,
      payment.body?.detail ?? "geen uitleg meegestuurd",
    );
  }

  console.log(`\nTestbetaling ${payment.body.id} — status ${payment.body.status}`);
  console.log(`Betaalscherm ${payment.body._links?.checkout?.href ?? "geen URL"}`);
  console.log('Open die URL en kies "paid" om te zien wat de klant ziet.');
}

// Geen process.exit(): Node crasht op Windows in libuv als je afsluit terwijl
// er nog een fetch-verbinding openstaat (GEMETEN 2026-09-10 — de controle
// slaagde en gaf toch exitcode 3221226505). De exitcode zetten en het proces
// zelf laten eindigen doet hetzelfde zonder die assertie.
await main();
