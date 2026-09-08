/**
 * Vaste ingangen "Olie" en "Filters", naast de vier productfamilies.
 *
 * Dit is waar de meeste klanten voor komen, maar in de TecDoc-boom liggen ze
 * verstopt: wie olie zocht moest eerst Onderdelen openen en dan uit 36
 * groepen "smeermiddelen" herkennen — met een kleine letter, tussen "Riemen"
 * en "Stuurinrichting".
 *
 * Alleen de hoofdgroepen staan hier vast; hun subgroepen worden per auto
 * opgehaald (components/catalog/actions.ts). Die verschillen namelijk écht:
 * onder `Filter` heeft een Citroën C3 er zeven en een McLaren 720S twee.
 *
 * De slugs zijn precies wat `groupSlug()` voor deze groepen oplevert; een
 * afwijkende tekst zou dezelfde pagina op twee adressen bereikbaar maken.
 * Het getal achteraan is het TecDoc-`assemblyGroupNodeId` en dat is niet
 * auto-afhankelijk — gemeten op carId 128214, 2026-09-08.
 */
export const MAINTENANCE_LINKS = [
  { key: "oils", slug: "smeermiddelen-1370" },
  { key: "filters", slug: "filter-542" },
] as const;

export type MaintenanceLink = (typeof MAINTENANCE_LINKS)[number];
