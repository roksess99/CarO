"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useVehicle } from "@/components/vehicle/use-vehicle";

/**
 * Zet de gekozen auto in de URL van de onderdelenpagina.
 *
 * De auto staat in localStorage en is dus pas ná hydratie bekend, terwijl de
 * catalogus server-side wordt opgehaald en het TecDoc-id in de querystring
 * verwacht. Zonder deze brug ziet iemand die op "Onderdelen" in het menu klikt
 * "kies eerst je auto", terwijl hij er al een gekozen heeft.
 *
 * `replace` en niet `push`: de tussenstap zonder auto hoort niet in de
 * geschiedenis, anders komt de terugknop erin vast te zitten.
 *
 * `keep` zijn parameters die mee moeten over die sprong heen. De onderdelen-
 * tegels zetten er `deel=remschijf` in; zonder dat was de klant zijn keuze
 * kwijt op precies het moment dat de auto bekend werd, en kwam hij op de
 * kale onderdelenpagina uit in plaats van bij de remschijven.
 */
export function SelectedCarInUrl({
  active,
  keep,
}: {
  active: boolean;
  keep?: Record<string, string>;
}) {
  const vehicle = useVehicle();
  const router = useRouter();
  // Het ruwe pad inclusief taalsegment; daarmee blijft de locale staan.
  const pathname = usePathname();
  const carId = vehicle?.carId;

  // Een string en geen object in de afhankelijkheden: een vers objectliteral
  // bij elke render zou het effect elke keer opnieuw laten lopen.
  const extra = new URLSearchParams(keep ?? {}).toString();

  useEffect(() => {
    if (!active || !carId) return;
    const query = new URLSearchParams(extra);
    query.set("auto", String(carId));
    router.replace(`${pathname}?${query}`);
  }, [active, carId, extra, pathname, router]);

  return null;
}
