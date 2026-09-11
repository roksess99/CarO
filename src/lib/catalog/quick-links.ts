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

/**
 * De onderdelen waar de meeste klanten voor komen, in volgorde van vraag.
 *
 * Het categorierooster staat alfabetisch: "Aandrijfassen / toebehoren",
 * "Accessoires", "Airconditioning" bovenaan, en wie remblokken of een
 * oliefilter zoekt moet eerst 36 groepen langs en dan nog een niveau dieper.
 * Deze rij zet de gangbare onderhoudsdelen erbovenop; het rooster blijft
 * eronder staan, zodat de volledige boom bereikbaar blijft.
 *
 * Dit zijn **eindgroepen**, geen hoofdgroepen: de klant komt zo in één klik
 * bij de artikelen in plaats van bij een tussenscherm.
 *
 * GEMETEN 2026-09-11 op drie auto's (Citroën C3 Aircross 128136, Chevrolet
 * Aveo 26605, VW Golf 7 115566): deze `assemblyGroupNodeId`s zijn in alle
 * drie de bomen identiek. Het id is dus niet auto-afhankelijk — de vraag óf
 * de groep in de boom zit wél, en dat kijkt `popularPartGroups()` na.
 */
export const POPULAR_PART_GROUP_IDS = [
  543, // Oliefilter
  544, // Luchtfilter
  546, // Interieurfilter
  568, // Remblok
  569, // Remschijf
  1371, // motorolie
  947, // Wisserblad / Rubber
  634, // Bougie
  774, // Schokdempers
  269, // Distributieriem
] as const;
