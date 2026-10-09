// Controleert of de Stripe-sleutel klopt, zonder de site te starten.
//
//   pnpm stripe:check            -> de sleutel en het account nakijken
//   pnpm stripe:check --create   -> ook een Checkout-sessie aanmaken en de
//                                   betaal-URL tonen
//
// Leest STRIPE_SECRET_KEY uit .env. De sleutel wordt nooit afgedrukt — alleen
// of hij werkt en, zo niet, wat Stripe terugzei.
//
// `--create` maakt een échte Checkout-sessie aan. Met een sk_test_-sleutel is
// dat een testsessie: er gaat geen geld heen en weer. Met een sk_live_-sleutel
// wél, en daarom weigert dit script dat.
//
// Zelfde opzet als de andere controlescripts, inclusief de foutcode: een winkel
// waar niemand kan betalen is kapot, ook al antwoordt de sleutel netjes
// (@docs/DECISIONS.md #29).

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const API = "https://api.stripe.com/v1";

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

async function call(key, endpoint, form) {
  const response = await fetch(`${API}${endpoint}`, {
    method: form ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    ...(form ? { body: form } : {}),
  });
  const body = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, body };
}

async function main() {
  const env = { ...readEnvFile(), ...process.env };
  const key = env.STRIPE_SECRET_KEY;

  if (!key) {
    return fail(
      "Ontbreekt in .env: STRIPE_SECRET_KEY",
      "Dashboard > Developers > API keys. Zie .env.example.",
    );
  }

  const test = key.startsWith("sk_test_");
  const live = key.startsWith("sk_live_");

  if (!test && !live) {
    return fail(
      "De sleutel begint niet met sk_test_ of sk_live_.",
      "Let op: pk_… is de publieke sleutel en hoort hier niet.",
    );
  }

  console.log(`Sleutel  ${test ? "TESTMODUS — geen echt geld" : "LIVE — echte betalingen"}`);

  const account = await call(key, "/account");
  if (!account.ok) {
    return fail(
      `\nStripe weigert de sleutel (HTTP ${account.status}).`,
      account.body?.error?.message ?? "geen uitleg meegestuurd",
    );
  }

  // `charges_enabled` is bij Stripe wat `pending-boarding` bij Mollie was: het
  // account bestaat en de sleutel werkt, en er kan toch niets betaald worden.
  const kanInnen = account.body?.charges_enabled === true;
  const kanUitbetalen = account.body?.payouts_enabled === true;
  console.log(`Innen    ${kanInnen ? "ja" : "NEE — het account neemt geen betalingen aan"}`);
  console.log(`Uitkeren ${kanUitbetalen ? "ja" : "nee — nog geen uitbetaling mogelijk"}`);

  const reden = account.body?.requirements?.disabled_reason;
  if (reden) console.log(`Reden    ${reden}`);

  const open = account.body?.requirements?.currently_due ?? [];
  if (open.length > 0) {
    console.log(`Gevraagd ${open.join(", ")}`);
  }

  if (!kanInnen) {
    console.log("         Rond de verificatie af in het Stripe-dashboard.");
    // GEMETEN 2026-10-09: met een testsleutel maakt Stripe gewoon een sessie
    // aan terwijl dit op false staat — in testmodus gaat er geen geld om. Een
    // foutcode hoort dus alleen bij een live sleutel, anders staat een
    // cron-taak rood terwijl er niets aan de hand is.
    if (live) process.exitCode = 1;
    else console.log("         In testmodus blokkeert dit het afrekenen niet.");
  }

  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.log("\nLet op: STRIPE_WEBHOOK_SECRET ontbreekt in .env.");
    console.log("Zonder dat geheim weigert /api/stripe/webhook élk bericht.");
    process.exitCode = 1;
  }

  if (!process.argv.includes("--create")) {
    console.log(
      kanInnen || !live
        ? "\nSleutel werkt. `pnpm stripe:check --create` maakt een Checkout-sessie aan."
        : "\nDe sleutel werkt, maar er kan niet betaald worden.",
    );
    return;
  }

  if (live) {
    return fail("\nWeigering: --create met een live-sleutel maakt een echte sessie aan.");
  }

  const form = new URLSearchParams({
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": "100",
    "line_items[0][price_data][product_data][name]": "CaroParts controle",
    success_url: "https://example.com/",
    cancel_url: "https://example.com/",
    client_reference_id: "CARO-CHECK",
    "metadata[reference]": "CARO-CHECK",
    "metadata[token]": "check",
    locale: "nl",
    billing_address_collection: "auto",
    "phone_number_collection[enabled]": "false",
    "automatic_tax[enabled]": "false",
    allow_promotion_codes: "false",
    submit_type: "auto",
  });

  const session = await call(key, "/checkout/sessions", form);
  if (!session.ok) {
    return fail(
      `\nAanmaken mislukt (HTTP ${session.status}).`,
      session.body?.error?.message ?? "geen uitleg meegestuurd",
    );
  }

  console.log(`\nTestsessie ${session.body.id} — status ${session.body.status}`);
  console.log(`Bedrag     ${session.body.amount_total} cent`);
  console.log(`Methodes   ${(session.body.payment_method_types ?? []).join(", ") || "geen"}`);
  console.log(`Betaalscherm ${session.body.url ?? "geen URL"}`);
  console.log("Open die URL; testkaart 4242 4242 4242 4242, elke toekomstige datum.");
}

// Geen process.exit(): Node crasht op Windows in libuv als je afsluit terwijl
// er nog een fetch-verbinding openstaat (GEMETEN 2026-09-10).
await main();
