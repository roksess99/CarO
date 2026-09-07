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
 */
export function SelectedCarInUrl({ active }: { active: boolean }) {
  const vehicle = useVehicle();
  const router = useRouter();
  // Het ruwe pad inclusief taalsegment; daarmee blijft de locale staan.
  const pathname = usePathname();
  const carId = vehicle?.carId;

  useEffect(() => {
    if (!active || !carId) return;
    router.replace(`${pathname}?auto=${carId}`);
  }, [active, carId, pathname, router]);

  return null;
}
