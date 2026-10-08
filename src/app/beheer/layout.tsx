import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

/**
 * Eigen wortel-layout voor het beheerpaneel.
 *
 * Het paneel staat bewust **buiten** `[locale]`: het is niet tweetalig, het
 * hoort niet in de sitemap en een taalvoorvoegsel in de URL zou alleen maar
 * verwarren. Omdat er geen `app/layout.tsx` bestaat, is dit bestand zelf de
 * wortel voor deze tak en moet het `<html>` en `<body>` zetten.
 *
 * Eén vast thema, licht. De winkel kan donker omdat de bezoeker dat kiest;
 * hier zou een themaschakelaar werk zijn zonder dat iemand erom vroeg.
 */

export const metadata: Metadata = {
  title: "Beheer — CarO",
  // Dit mag nergens in een zoekmachine belanden. Staat ook in app/robots.ts.
  robots: { index: false, follow: false, nocache: true },
};

export default function BeheerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" className={inter.variable}>
      <body className="min-h-dvh bg-surface font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
