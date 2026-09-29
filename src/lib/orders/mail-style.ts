// Opmaak die de klantmail en het inkoopbriefje voor de beheerder delen.
//
// Kleuren uit docs/BRAND.md. Geen CSS-variabelen: die kent geen enkele
// mailclient. De oranje knop krijgt inkt-zwarte tekst, nooit witte — wit op
// oranje haalt 2,87:1 en zakt door elke contrasteis heen.

export const INK = "#0E1013";
export const ORANGE = "#FF6A13";
export const ZINC = "#F5F6F7";
export const MUTED = "#646b75";
export const LINE = "#e5e7e9";
export const WHITE = "#ffffff";

export const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/**
 * Vaste breedte voor artikelnummers. Twee cijfers die op elkaar lijken staan
 * in een proportioneel lettertype niet onder elkaar; een nummer dat de
 * beheerder met de hand overtypt hoort in cijfers van gelijke breedte.
 */
export const MONO =
  "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

/** Alles wat van buiten komt gaat hier langs: productnamen van de groothandel,
 * en de naam en het adres die de klant zelf intypte. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
