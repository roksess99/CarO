import { ImageResponse } from "next/og";
import { routing } from "@/i18n/routing";

/**
 * Deelkaart voor WhatsApp, Facebook en X.
 *
 * Bewust in het Nederlands voor alle drie de talen. De renderer achter
 * ImageResponse krijgt één ingebouwd lettertype mee (Geist, latijns schrift);
 * Arabische tekst zou daarin als lege blokjes verschijnen. Nederland is onze
 * markt, dus dan liever de marktnaam dan onleesbare tekens.
 *
 * Het woordmerk staat hier niet in Anton (BRAND.md) maar in het ingebouwde
 * schreefloze lettertype: het echte woordmerk is een webfont en de renderer
 * laadt er geen. De moer ernaast komt wel uit `public/brand/caro-mark.svg`.
 *
 * LET OP — in `pnpm dev` geeft deze route HTTP 500 ("Input buffer contains
 * unsupported image format"). Dat is een fout in de dev-bundel van Turbopack,
 * niet in deze code: `pnpm build` rendert de kaart wél, als statieke PNG per
 * taal. Controleer hem dus in de productiebuild, niet in dev.
 */

// Zonder dit rendert Next de kaart pas bij het eerste verzoek; de crawler
// van WhatsApp wacht daar niet altijd op.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "CarO — onderdelen, banden, velgen en toebehoren";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "88px",
          // Huisstijl: inkt als vlak, oranje alleen als accent (BRAND.md)
          background: "#0E1013",
          color: "#FFFFFF",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <svg width="132" height="132" viewBox="0 0 64 64">
            <path
              fill="#FF6A13"
              fillRule="evenodd"
              transform="rotate(12 32 32)"
              d="M62 32 47 58H17L2 32 17 6h30l15 26ZM45 32a13 13 0 1 1-26 0 13 13 0 0 1 26 0Z"
            />
          </svg>
          <div style={{ fontSize: "132px", letterSpacing: "-6px" }}>CarO</div>
        </div>
        <div style={{ marginTop: "56px", fontSize: "46px", color: "#C9CDD3" }}>
          Onderdelen, banden, velgen en toebehoren
        </div>
        <div style={{ marginTop: "18px", fontSize: "34px", color: "#8A9099" }}>
          Prijzen inclusief 21% btw
        </div>
      </div>
    ),
    size,
  );
}
