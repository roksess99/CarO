import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    // AVIF eerst: scheelt zo'n kwart ten opzichte van WebP op de
    // productfoto's, en browsers die het niet kennen krijgen WebP.
    formats: ["image/avif", "image/webp"],
    // Productfoto's komen van de media-servers van Tyre24 (media1/2/3).
    // Zonder deze regel weigert next/image een externe bron.
    remotePatterns: [
      { protocol: "https", hostname: "**.tyre-shopping.com", pathname: "/**" },
      // Productfoto's van de Wearparts-API staan op een ander CDN
      { protocol: "https", hostname: "**.alzura.com", pathname: "/**" },
    ],
  },

  /**
   * Beveiligingsheaders. Lighthouse noemt deze onder "Trust and Safety"; ze
   * kosten niets en sluiten drie klassieke aanvallen uit.
   *
   * Géén Content-Security-Policy hier: die vraagt om een nonce per request
   * (Next injecteert inline scripts) en een verkeerd ingestelde CSP breekt de
   * shop stil. Dat is een eigen klus, niet iets om even mee te nemen.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking: onze pagina's horen niet in een iframe van derden
          { key: "X-Frame-Options", value: "DENY" },
          // Browser mag het bestandstype niet zelf raden
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Verwijzer alleen binnen de eigen site volledig meesturen
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Vensterisolatie (Spectre-klasse aanvallen)
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // We gebruiken deze apparaatfuncties nergens
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
