import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Anton, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import Script from "next/script";
import { BackToTop } from "@/components/back-to-top";
import { SiteFooter } from "@/components/site-footer";
import { BottomNav } from "@/components/bottom-nav";
import { SiteHeader } from "@/components/site-header";
import { routing, textDirection } from "@/i18n/routing";
import type { FamilyNavItem } from "@/components/family-nav";
import { PRODUCT_FAMILIES } from "@/lib/catalog/families";
import { localizeCategories } from "@/lib/catalog/localized-categories";
import { getCatalogProvider } from "@/lib/catalog/provider";
import { listMakes } from "@/lib/vehicle/catalog";
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

// Zet de thema-class vóór de eerste paint zodat dark mode niet flikkert.
// Bewust een inline script in de server-layout: server-gerenderde scripts
// draaien tijdens het parsen van de HTML en triggeren geen React 19-warning
// (in tegenstelling tot het script dat next-themes client-side injecteerde).
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
  // De tabbalk toont het assortiment; die categorieen komen gecacht uit de
  // provider, dezelfde bron als de header gebruikt.
  const provider = getCatalogProvider();
  const navItems: FamilyNavItem[] = await Promise.all(
    PRODUCT_FAMILIES.map(async (family) => ({
      family,
      categories: await localizeCategories(await provider.getCategories(family)),
    })),
  );

  return (
    <html
      lang={locale}
      // Arabisch leest van rechts naar links; hiermee spiegelt de browser de
      // hele layout, inclusief scrollbalk en formulierelementen.
      dir={textDirection(locale)}
      suppressHydrationWarning
      className={`${inter.variable} ${anton.variable}`}
    >
      <body className="flex min-h-screen flex-col font-sans antialiased">
        {/* beforeInteractive: het thema moet vaststaan vóór de eerste
            schilderbeurt, anders flitst de pagina wit. Een gewone <script> in
            de boom geeft sinds React 19 een console-waarschuwing. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-caro-orange focus:px-4 focus:py-2 focus:font-semibold focus:text-caro-ink"
          >
            {t("skipToContent")}
          </a>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <BackToTop />
          <BottomNav items={navItems} makes={listMakes()} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
