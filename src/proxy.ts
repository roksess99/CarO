import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { RENAMED_CATEGORY_SLUGS } from "./lib/catalog/category-labels";

const handleLocale = createMiddleware(routing);

/**
 * Hernoemde categorie-URL's afvangen vóór next-intl.
 *
 * Dit hoort hier en niet in de pagina: door de `loading.tsx` van de
 * categorieroute is de HTML al onderweg tegen de tijd dat de pagina draait,
 * en een omleiding daarna is een sprong in de browser met status 200. Een
 * zoekmachine leest dat niet als verhuizing. Hier komt er een echte 308 uit.
 *
 * De categorie is het derde segment: /<taal>/<familie>/<categorie>[/<artikel>].
 */
function renamedCategoryUrl(request: NextRequest): URL | null {
  const segments = request.nextUrl.pathname.split("/");
  const current = segments[3];
  if (!current) return null;

  const moved = RENAMED_CATEGORY_SLUGS[current];
  if (!moved) return null;

  segments[3] = moved;
  const url = new URL(request.nextUrl);
  url.pathname = segments.join("/");
  return url;
}

/**
 * `www.caroparts.nl` → `caroparts.nl`, met een 301.
 *
 * GEMETEN 2026-11-23: www antwoordde met een eigen 200 en dus een tweede kopie
 * van de hele winkel. De canonical wees wel naar het domein zonder www, maar
 * een zoekmachine moest daarvoor eerst beide crawlen, en links naar www
 * telden niet mee. De host komt uit de header en niet uit `nextUrl`: achter
 * de CDN van de hostingpartij is dat het adres dat de bezoeker typte.
 */
function canonicalHostUrl(request: NextRequest): URL | null {
  const host = request.headers.get("host") ?? "";
  if (!host.startsWith("www.")) return null;

  const url = new URL(request.nextUrl);
  url.host = host.slice("www.".length);
  url.protocol = "https:";
  url.port = "";
  return url;
}

export default function proxy(request: NextRequest) {
  const apex = canonicalHostUrl(request);
  if (apex) return NextResponse.redirect(apex, 301);

  const moved = renamedCategoryUrl(request);
  if (moved) return NextResponse.redirect(moved, 308);

  return handleLocale(request);
}

export const config = {
  // Alles behalve API-routes, Next-internals en statische bestanden.
  // LET OP: de punt in `\\.` moet ontsnapt blijven. Zonder die backslash
  // matcht `.*..*` bijna elk pad en slaat Next de proxy over — dan werkt
  // alleen de homepage nog (gemeten 2026-09-08).
  // `beheer` staat er bewust bij: het beheerpaneel is niet tweetalig en zou
  // anders door next-intl naar /nl/beheer verplaatst worden.
  matcher: "/((?!api|beheer|_next|_vercel|.*\\..*).*)",
};
