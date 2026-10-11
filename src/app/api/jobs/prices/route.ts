import { timingSafeEqual } from "node:crypto";
import { warmCatalog } from "@/lib/catalog/warm";
import { runPriceSnapshot } from "@/lib/prices/snapshot";
import { runReviewInvites } from "@/lib/reviews/job";

/**
 * De terugkerende taken aanroepen van buitenaf: de beoordelingsuitnodigingen,
 * het warmen van de catalogus en de prijsmeting.
 *
 *     curl -fsS -H "Authorization: Bearer <CARO_JOB_TOKEN>" \
 *          https://caroparts.nl/api/jobs/prices
 *
 * Bedoeld voor een cron-taak bij de hostingpartij. De winkel meet zichzelf ook
 * elk uur (zie instrumentation.ts), dus dit is een extra zekerheid en geen
 * voorwaarde — en het is onschadelijk om hem vaker aan te roepen: de eerste van
 * de dag claimt de dag, de rest krijgt `overgeslagen` terug.
 *
 * **Met een sleutel, niet open.** Zonder slot kan iedereen deze taak laten
 * lopen en zo de leverancier namens ons bevragen. De sleutel staat in
 * `CARO_JOB_TOKEN`; ontbreekt hij, dan werkt dit adres niet en zegt het dat.
 */

export const dynamic = "force-dynamic";
// Een categorie van 1.600 artikelen kost vier verzoeken van ~25 s; de
// uitnodigingen komen daar bovenop, hooguit 25 mails.
//
// GEMETEN 2026-10-11: het warmrondje doet er ~46 s bij — 17 categorieën plus
// drie homepagerijen en drie categoriebomen, met twee seconden rust ertussen
// om de limiet van de leverancier met rust te laten. Samen met de prijsmeting
// (110 s gemeten) zit dat ruim binnen deze 300.
export const maxDuration = 300;

function tokenMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // Even lang maken: timingSafeEqual gooit bij verschillende lengtes, en de
  // lengte van de sleutel verklappen we liever ook niet.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function authorized(request: Request): boolean {
  const expected = process.env.CARO_JOB_TOKEN;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  return given !== "" && tokenMatches(given, expected);
}

async function handle(request: Request): Promise<Response> {
  if (!process.env.CARO_JOB_TOKEN) {
    return Response.json(
      { ok: false, reden: "CARO_JOB_TOKEN ontbreekt op de server" },
      { status: 503 },
    );
  }
  if (!authorized(request)) {
    return Response.json({ ok: false }, { status: 401 });
  }

  // Ná elkaar en met een eigen vangnet per taak: mislukt de prijsmeting, dan
  // horen de uitnodigingen er niet onder te lijden en andersom.
  const uitnodigingen = await runReviewInvites().catch((error: unknown) => {
    console.error(
      "Beoordelingsuitnodigingen mislukt:",
      error instanceof Error ? error.message : "onbekende fout",
    );
    return null;
  });

  // Het warmrondje hoort hier ook, en vooral: het is de knop om ná een deploy
  // aan te zetten. De klok in de server doet het 45 seconden na het opstarten
  // vanzelf (lib/catalog/warm.ts), maar wie met de hand uitrolt wil niet op
  // die klok wachten. Twee rondjes tegelijk kunnen niet — `warmCatalog` laat
  // er één tegelijk door en meldt de tweede als overgeslagen.
  const warm = await warmCatalog().catch((error: unknown) => {
    console.error(
      "Catalogus warmen mislukt:",
      error instanceof Error ? error.message : "onbekende fout",
    );
    return null;
  });

  try {
    const prijzen = await runPriceSnapshot();
    return Response.json({ ok: true, prijzen, uitnodigingen, warm });
  } catch (error) {
    console.error(
      "Prijsmeting mislukt:",
      error instanceof Error ? error.message : "onbekende fout",
    );
    return Response.json({ ok: false, uitnodigingen, warm }, { status: 500 });
  }
}

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
