import { notFound } from "next/navigation";
import { familyFromSlug, usesVehicleCatalog } from "@/lib/catalog/families";
import { groupIdFromSlug } from "@/lib/catalog/wearparts-provider";

/**
 * Zelfde reden als de layout één niveau hoger: boven de Suspense-grens van
 * `loading.tsx` is de HTTP-status nog te zetten, eronder niet meer.
 *
 * Alleen de vorm van de slug wordt gekeurd, en alleen bij onderdelen: die
 * dragen hun groeps-id achteraan (`oliefilter-543`), dus een slug zonder
 * getal kan onmogelijk bestaan. Dat is een reguliere expressie, geen
 * API-call — de echte categorieën merken er niets van.
 *
 * Voor de andere families zou keuren een call naar de leverancier kosten
 * vóór de eerste schilderbeurt. Die blijven dus met status 200 op de
 * niet-gevonden-pagina uitkomen.
 */
export default async function CategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; family: string; category: string }>;
}) {
  const { locale, family, category } = await params;
  const resolved = familyFromSlug(family, locale);
  if (
    resolved &&
    usesVehicleCatalog(resolved) &&
    groupIdFromSlug(category) === null
  ) {
    notFound();
  }
  return children;
}
