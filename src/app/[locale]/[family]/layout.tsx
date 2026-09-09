import { notFound } from "next/navigation";
import { familyFromSlug } from "@/lib/catalog/families";

/**
 * Poortwachter voor een onbekende familieslug.
 *
 * Deze controle stond in `page.tsx`, maar daar komt hij te laat: `loading.tsx`
 * hangt om de pagina heen, dus Next heeft de HTML met status 200 al verstuurd
 * voordat `notFound()` valt. Google leest dat als een "soft 404" en houdt de
 * onzin-URL in de index. Een layout staat bóven die Suspense-grens, dus hier
 * is de status nog te zetten.
 *
 * Alleen de slug wordt gekeurd — dat is een lijst in het geheugen, geen
 * API-call, dus het kost de echte pagina's niets.
 */
export default async function FamilyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; family: string }>;
}) {
  const { locale, family } = await params;
  if (!familyFromSlug(family, locale)) notFound();
  return children;
}
