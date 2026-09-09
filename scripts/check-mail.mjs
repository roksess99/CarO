// Controleert of de mailinstellingen kloppen, zonder de site te starten.
//
//   pnpm mail:check              -> alleen verbinden en aanmelden
//   pnpm mail:check --send       -> ook echt een testbericht sturen
//
// Leest SMTP_HOST, SMTP_PORT, SMTP_USER en SMTP_PASSWORD uit .env. Het
// wachtwoord wordt nooit afgedrukt — alleen of het gelukt is en, zo niet,
// wat de server terugzei.
//
// Waarom een apart script en niet gewoon het formulier proberen: als er niets
// aankomt weet je met het formulier niet of het aan de instellingen, aan de
// mailbox of aan het spamfilter ligt. Dit zegt precies waar het misgaat.

import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

const ROOT = path.resolve(import.meta.dirname, "..");

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
const REQUIRED = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"];
const missing = REQUIRED.filter((key) => !env[key]);

if (missing.length > 0) {
  console.error(`Ontbreekt in .env: ${missing.join(", ")}`);
  console.error("Zie .env.example voor de uitleg per variabele.");
  process.exit(1);
}

const port = Number(env.SMTP_PORT);
console.log(`Host     ${env.SMTP_HOST}:${port} (${port === 465 ? "SSL" : "STARTTLS"})`);
console.log(`Mailbox  ${env.SMTP_USER}`);

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port,
  secure: port === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000,
});

try {
  await transporter.verify();
  console.log("✓ Verbinding en aanmelding gelukt.");
} catch (error) {
  console.error(`✗ Mislukt: ${error.message}`);
  console.error(
    port === 465
      ? "Klopt het wachtwoord? Probeer anders poort 587."
      : "Klopt het wachtwoord? Probeer anders poort 465.",
  );
  process.exit(1);
}

if (process.argv.includes("--send")) {
  const info = await transporter.sendMail({
    from: { name: "CarO", address: env.SMTP_USER },
    to: env.SMTP_USER,
    subject: "[Contactformulier] test vanuit check-mail",
    text: "Als je dit leest werkt de verzending. Dit bericht komt uit scripts/check-mail.mjs.",
  });
  console.log(`✓ Testbericht aangenomen door de server: ${info.response}`);
  console.log("Komt het niet aan? Kijk in de map ongewenste e-mail.");
}

process.exit(0);
