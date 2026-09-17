"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import {
  countAdmins,
  createAdmin,
  emailKey,
  findAdminByEmail,
  markLogin,
} from "@/lib/admin/admins";
import { passwordProblem, verifyPassword } from "@/lib/admin/password";
import {
  attemptAllowed,
  clearAttempts,
  recordFailure,
} from "@/lib/admin/rate-limit";
import { createSession, destroySession } from "@/lib/admin/session";
import { fromBase32, openSecret, verifyCode } from "@/lib/admin/totp";

/**
 * De acties van het beheerpaneel.
 *
 * Twee dingen die hier bewust zo staan:
 *
 * **Inloggen vraagt mailadres, wachtwoord en code in één formulier.** Een
 * tweetrapsscherm ("eerst wachtwoord, dan code") leest prettiger, maar vraagt
 * een half-ingelogde toestand tussen de twee stappen — en dat is precies het
 * soort tussenstand waar beveiligingsfouten in zitten. Drie velden tegelijk
 * heeft die toestand niet.
 *
 * **Eén foutmelding voor alles wat misgaat.** Of het mailadres niet bestaat,
 * het wachtwoord fout is of de code niet klopt: de bezoeker krijgt dezelfde
 * zin. Anders vertel je een aanvaller welke helft hij al goed had.
 */

export type SignInResult = { error: string } | undefined;

async function clientKey(email: string): Promise<string> {
  const headerList = await headers();
  // Achter de proxy van de hostingpartij staat het echte adres vooraan in
  // x-forwarded-for. Ontbreekt die, dan tellen we alleen op mailadres.
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${emailKey(email)}|${forwarded ?? "onbekend"}`;
}

export async function signIn(
  _previous: SignInResult,
  formData: FormData,
): Promise<SignInResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "");

  if (!email || !password || !code) {
    return { error: "Vul alle drie de velden in." };
  }

  const key = await clientKey(email);
  const limit = attemptAllowed(key);
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return {
      error: `Te veel pogingen. Probeer het over ${minutes} minuten opnieuw.`,
    };
  }

  const admin = await findAdminByEmail(email);
  const wrong = { error: "Inloggen lukt niet met deze gegevens." };

  if (!admin || admin.disabledAt) {
    // Toch het wachtwoord narekenen zou hier netter zijn tegen het meten van
    // reactietijden; bij vijf pogingen per kwartier weegt dat niet op tegen
    // de rekentijd die scrypt kost.
    recordFailure(key);
    return wrong;
  }

  if (!(await verifyPassword(password, admin.passwordHash))) {
    recordFailure(key);
    return wrong;
  }

  if (!admin.totpSecret || !admin.totpConfirmedAt) {
    return {
      error: "Voor dit account staat tweestapsverificatie nog niet klaar.",
    };
  }

  if (!verifyCode(openSecret(admin.totpSecret), code)) {
    recordFailure(key);
    return wrong;
  }

  clearAttempts(key);
  await createSession(admin.id);
  await markLogin(admin.id);
  redirect("/beheer");
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/beheer/login");
}

// ---------------------------------------------------------------------------
// Eenmalig: de eerste beheerder
// ---------------------------------------------------------------------------

export type SetupResult = { error: string } | { codes: string[] } | undefined;

/** Vergelijken zonder dat de looptijd verraadt hoeveel tekens klopten */
function tokenMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function completeSetup(
  _previous: SetupResult,
  formData: FormData,
): Promise<SetupResult> {
  // Twee sloten op deze deur. De pagina bestaat alleen zolang er geen
  // beheerder is, én je moet het teken uit .env kennen — anders zou de eerste
  // voorbijganger na een deploy het paneel kunnen claimen.
  if ((await countAdmins()) > 0) {
    return { error: "Er is al een beheerder. Deze pagina is gesloten." };
  }

  const expected = process.env.ADMIN_SETUP_TOKEN;
  if (!expected) {
    return { error: "ADMIN_SETUP_TOKEN ontbreekt op de server." };
  }
  if (!tokenMatches(String(formData.get("token") ?? ""), expected)) {
    return { error: "Het instelwachtwoord klopt niet." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  const code = String(formData.get("code") ?? "");

  if (!email.includes("@")) return { error: "Vul een geldig mailadres in." };
  if (password !== repeat) return { error: "De twee wachtwoorden verschillen." };

  const problem = passwordProblem(password);
  if (problem) return { error: problem };

  // Het geheim komt uit een verborgen veld en niet uit een cookie. Dat klinkt
  // losser dan het is: dezelfde tekens staan zichtbaar op het scherm, want
  // anders kun je ze niet in je app zetten. Een cookie zou daar niets aan
  // toevoegen. En wie hier iets kan indienen heeft het instelwachtwoord uit
  // .env al, en kan dus sowieso een beheerder aanmaken.
  const secretText = String(formData.get("secret") ?? "");
  const secret = fromBase32(secretText);
  if (secret.length < 16) {
    return { error: "De instelcode is zoek. Ververs de pagina." };
  }
  if (!verifyCode(secret, code)) {
    return {
      error:
        "Die code klopt niet. Staat de tijd op je telefoon goed, en heb je de nieuwste code?",
    };
  }

  const { recoveryCodes } = await createAdmin({
    email,
    password,
    totpSecret: secret,
    // De code is zojuist gecontroleerd, dus de app staat aantoonbaar goed
    totpConfirmed: true,
  });

  return { codes: recoveryCodes };
}
