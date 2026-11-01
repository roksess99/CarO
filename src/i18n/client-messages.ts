import type { getMessages } from "next-intl/server";

type Messages = Awaited<ReturnType<typeof getMessages>>;

/**
 * Welke stukken van `messages/*.json` de browser nodig heeft.
 *
 * **Waarom dit bestaat.** `NextIntlClientProvider` zonder `messages` erft de
 * hele boom van de server, en die gaat dan in de RSC-payload mee naar de
 * browser — op élke pagina, alle 794 teksten. GEMETEN 2026-11-01 op de
 * voorgerenderde `/nl/cart`: 58 van de 218 kB HTML (27%) was de
 * berichtenboom, inclusief de privacyverklaring (7,8 kB), de
 * retourvoorwaarden (5,2 kB), de veelgestelde vragen (3,8 kB) en — het meest
 * opvallend — de teksten van de bevestigingsmail en het verzendbericht
 * (3,6 kB samen), die alleen op de server bestaan en nooit in een browser
 * gerenderd worden.
 *
 * Een servercomponent haalt zijn teksten níet hier vandaan: `useTranslations`
 * en `getTranslations` lezen daar rechtstreeks uit de request-config en zien
 * dus altijd alles. Deze lijst gaat alleen over componenten die écht in de
 * browser draaien.
 *
 * **Komt er een namespace bij, dan komt hij hier bij.** Vergeten is geen
 * stille fout maar ook geen zichtbare: next-intl rendert dan de sleutel in
 * plaats van de tekst. Daarom controleert `pnpm messages:check` deze lijst
 * tegen de clientbundel — die hoort in de keten vóór een commit, naast
 * typecheck en lint.
 */
export const CLIENT_NAMESPACES = [
  "bottomNav",
  "cart",
  "checkout",
  "common",
  "contact",
  "cookies",
  "error",
  "family",
  "fitment",
  "home",
  "localeSwitcher",
  "product",
  "returns",
  "review",
  "search",
  "themeToggle",
  "totals",
  "tyres",
  "vehicle",
] as const;

/**
 * De berichtenboom terugbrengen tot wat een clientcomponent opvraagt.
 *
 * Een namespace die niet in het bestand staat wordt overgeslagen in plaats van
 * als `undefined` doorgegeven: next-intl loopt daarover met een foutmelding,
 * en een ontbrekende namespace mag geen pagina slopen.
 */
export function clientMessages(all: Messages): Messages {
  const picked: Record<string, unknown> = {};
  for (const namespace of CLIENT_NAMESPACES) {
    const value = (all as Record<string, unknown>)[namespace];
    if (value !== undefined) picked[namespace] = value;
  }
  return picked as Messages;
}
