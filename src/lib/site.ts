import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Basis-URL van de shop. Eén plek, want hij zit in élke canonical- en
 * hreflang-tag: staat hier localhost, dan verwijst de hele site zoekmachines
 * naar een adres dat alleen op een ontwikkelmachine bestaat.
 *
 * Zet `NEXT_PUBLIC_SITE_URL` zodra het eigen domein er is (docs/DECISIONS.md #2).
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://caro-two-swart.vercel.app";

/**
 * `metadataBase` + canonical + hreflang voor één pagina.
 *
 * `pathFor` geeft het pad per taal terug. Dat moet een functie zijn en geen
 * vast pad, omdat onze routes vertaalde slugs hebben: `/nl/winkelwagen` is in
 * het Engels `/en/cart`, niet `/en/winkelwagen`.
 *
 * De talen komen uit `routing.locales`, zodat een nieuwe taal niet in zeven
 * bestanden vergeten kan worden. `x-default` wijst naar het Nederlands: dat is
 * de standaardtaal van de routing en onze markt.
 */
export function localizedMetadata(
  locale: string,
  pathFor: (locale: Locale) => string,
): Pick<Metadata, "metadataBase" | "alternates"> {
  const languages: Record<string, string> = {};
  for (const other of routing.locales) {
    languages[other] = pathFor(other);
  }
  languages["x-default"] = pathFor(routing.defaultLocale);

  return {
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: pathFor(locale as Locale), languages },
  };
}
