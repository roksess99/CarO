import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Anton, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { BackToTop } from "@/components/back-to-top";
import { SiteFooter } from "@/components/site-footer";
import { BottomNav } from "@/components/bottom-nav";
import { SiteHeader } from "@/components/site-header";
import { PageBeacon } from "@/components/stats/page-beacon";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import { vehicleMakeNames } from "@/lib/vehicle/makes";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Alleen voor het woordmerk in de lockup, nooit voor UI-tekst (BRAND.md)
const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Alleen `metadataBase`, voor de hele taalboom.
 *
 * Pagina's zetten hun eigen titel, canonical en Open Graph via
 * `localizedMetadata()` en `socialMetadata()`. Maar routes die dat niet doen —
 * de 404, de zoekpagina — hadden helemaal geen basis-URL, en dan maakt Next
 * van een relatieve deelafbeelding `http://localhost:3000/...`. Hier staat hij
 * één keer goed voor alles wat eronder hangt; een pagina die hem zelf zet
 * overschrijft dit met dezelfde waarde.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
};

// Zet de thema-class vóór de eerste paint zodat dark mode niet flikkert.
//
// **Een gewoon `<script>` in de `<head>`, geen `next/script`.** Dat laatste
// stond hier met `strategy="beforeInteractive"` en gaf in de console:
// "Encountered a script tag while rendering React component. Scripts inside
// React components are never executed when rendering on the client."
// Terecht: `next/script` is een clientcomponent, dus het scripttag werd in de
// browser opnieuw aangemaakt — en een scripttag die React zelf plaatst draait
// daar niet. De waarschuwing was dus geen ruis maar precies de val die bij
// next-themes ook toesloeg. In de `<head>` staat hij in de HTML die de server
// stuurt en draait hij tijdens het parsen, vóór de eerste schilderbeurt.
const themeInitScript = `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.add(d?"dark":"light");e.style.colorScheme=d?"dark":"light"}catch(e){}})()`;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const t = await getTranslations("common");
  // Merkenlijst: één keer per paginaweergave, hier. Header, tabbalk en
  // autokiezer delen hem — apart opgehaald stond dezelfde call drie keer in
  // het log (zie site-header.tsx).
  const makes = await vehicleMakeNames();

  return (
    <html
      lang={locale}
      dir="ltr"
      suppressHydrationWarning
      className={`${inter.variable} ${anton.variable}`}
    >
      <head>
        {/* Moet vóór de eerste schilderbeurt draaien, anders flitst de pagina
            wit — zie de uitleg bij themeInitScript. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-caro-orange focus:px-4 focus:py-2 focus:font-semibold focus:text-caro-ink"
          >
            {t("skipToContent")}
          </a>
          <SiteHeader makes={makes} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <BackToTop />
          <BottomNav makes={makes} />
          {/* Telt paginaweergaven en bezoeken op onze eigen server. Geen
              cookie, geen vingerafdruk, geen derde partij — en dus geen
              toestemmingsbanner (@docs/DECISIONS.md #24). */}
          <PageBeacon />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
