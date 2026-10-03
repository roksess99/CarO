// Controleert of de sleutels bij de leverancier nog werken.
//
//   pnpm catalog:check
//
// Waarom dit los van de site staat: de adapter vangt een fout van de
// leverancier af met een lege lijst, zodat de klant geen foutpagina krijgt.
// Daardoor ziet een verlopen token er in de winkel precies zo uit als een
// categorie zonder aanbod. GEMETEN 2026-10-03: de onderdelen stonden een dag
// uit de winkel zonder dat iets dat meldde (@docs/api/WEARPARTS.md).
//
// Tokens verlopen; dat staat in de documentatie van de leverancier zelf. Draai
// dit dus na elke sleutelwissel en als een productgroep leeg lijkt.
//
// Elke API heeft zijn eigen token: een sleutel voor Products werkt niet op
// Wearparts en andersom. Dat is 2026-10-03 gemeten, en het is precies de
// verwarring waar dit script voor bedoeld is.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

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

const APIS = [
  {
    naam: "Products",
    waarvoor: "banden, velgen, toebehoren",
    sleutel: "TYRE24_API_TOKEN",
    url: "https://tyre24.alzura.com/nl/nl/rest/v13/products/areas",
  },
  {
    naam: "Wearparts",
    waarvoor: "onderdelen",
    sleutel: "TYRE24_WEARPARTS_TOKEN",
    url: "https://tyre24.alzura.com/nl/nl/rest/V16/wearparts/sorters",
  },
];

let stuk = 0;

for (const api of APIS) {
  const token = env[api.sleutel];
  const label = `${api.naam} (${api.waarvoor})`;

  if (!token) {
    console.log(`✗ ${label}\n    geen ${api.sleutel} in .env`);
    stuk += 1;
    continue;
  }

  let response;
  try {
    response = await fetch(api.url, {
      headers: { "X-AUTH-TOKEN": token },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.log(`✗ ${label}\n    onbereikbaar: ${error?.message ?? error}`);
    stuk += 1;
    continue;
  }

  if (response.ok) {
    console.log(`✓ ${label}\n    sleutel …${token.slice(-4)} werkt`);
    continue;
  }

  let code = `HTTP ${response.status}`;
  try {
    const body = await response.json();
    if (body?.errorCode) code = body.errorCode;
  } catch {
    // geen JSON; de status zegt genoeg
  }

  console.log(`✗ ${label}\n    sleutel …${token.slice(-4)} geweigerd: ${code}`);
  if (response.status === 401 || response.status === 403) {
    console.log(
      "    Maak een nieuw token op https://tyre24.alzura.com/de/de/tokenmanagement.",
      "\n    LET OP: elk token hoort bij één API. Een sleutel voor Products werkt",
      "\n    niet op Wearparts. Weigert hij ook na een nieuw token, dan gaat het",
      "\n    niet om de sleutel maar om de toegang tot die API — dan is het een",
      "\n    vraag aan de leverancier.",
    );
  }
  stuk += 1;
}

if (stuk > 0) {
  console.log(
    `\n${stuk} van de ${APIS.length} werkt niet. Die productgroepen zijn nu leeg in de winkel.`,
  );
  process.exitCode = 1;
} else {
  console.log("\nAlle sleutels werken.");
}
