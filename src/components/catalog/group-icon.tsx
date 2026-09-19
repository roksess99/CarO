/**
 * Een tekening per veelgezochte onderdeelgroep.
 *
 * Waarom eigen tekeningen en geen foto's: de leverancier heeft ze niet.
 * GEMETEN 2026-09-07 en opnieuw 2026-09-17 — alléén de 33 hoofdgroepen
 * dragen een `icon`, de eindgroepen (Oliefilter, Remblok, motorolie, Accu)
 * geen enkele. Foto's inkopen zou voor elf tegels elf licenties vragen en
 * @docs/DECISIONS.md #9 staat over beeldrechten nog open.
 *
 * Lijntekeningen in `currentColor` hebben daarnaast twee praktische
 * voordelen boven foto's: ze werken in het lichte én het donkere thema
 * zonder tweede bestand, en ze blijven leesbaar op de 28 pixels die een rij
 * in de rij "Meest gezocht" ervoor heeft — een foto van een remblok is op
 * dat formaat een grijze vlek.
 *
 * De sleutel is het TecDoc-`assemblyGroupNodeId`, hetzelfde nummer als in
 * `lib/catalog/quick-links.ts`. Een groep zonder tekening krijgt de moer uit
 * het merkteken (@docs/BRAND.md), zodat de rijen uitgelijnd blijven.
 */

/** Zeskantmoer met open gat — het merkteken, als terugval */
const NUT = (
  <>
    <path d="M12 2.5 20 7v10l-8 4.5L4 17V7z" />
    <circle cx="12" cy="12" r="3.5" />
  </>
);

const PATHS: Record<number, React.ReactNode> = {
  // Oliefilter — bus met kraag
  543: (
    <>
      <rect x="7" y="7" width="10" height="13" rx="2" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M7 11h10" />
    </>
  ),
  // Luchtfilter — geplooid paneel
  544: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="1.5" />
      <path d="M7.5 7v10M12 7v10M16.5 7v10" />
    </>
  ),
  // Interieurfilter — paneel met luchtstroom
  546: (
    <>
      <rect x="3.5" y="6" width="11" height="12" rx="1.5" />
      <path d="M7.2 6v12M10.8 6v12" />
      <path d="M17 9h3.5M17 12h3.5M17 15h3.5" />
    </>
  ),
  // Remblok — drager met wrijvingslaag
  568: (
    <>
      <path d="M5 8.5h14A1.5 1.5 0 0 1 20.5 10v1.5h-17V10A1.5 1.5 0 0 1 5 8.5Z" />
      <path d="M3.5 11.5h17V14a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 14z" />
    </>
  ),
  // Remschijf — schijf met naaf
  569: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2" />
    </>
  ),
  // Accu — met plus en min
  653: (
    <>
      <rect x="3" y="7" width="18" height="12" rx="2" />
      <path d="M7 7V5h3v2M14 7V5h3v2" />
      <path d="M7.5 13h3M9 11.5v3M13.5 13h3" />
    </>
  ),
  // Bougie — aansluiting, zeskant, schroefdraad, massa-elektrode
  634: (
    <>
      <path d="M11 2.5h2v3h-2z" />
      <path d="M9.5 5.5h5V9h-5z" />
      <path d="M10.5 9h3v5h-3z" />
      <path d="M10.5 11h3M10.5 12.5h3" />
      <path d="M12 14v3.5h-2" />
    </>
  ),
  // Wisserblad — ruit met arm
  947: (
    <>
      <path d="M4 18a8 8 0 0 1 16 0z" />
      <path d="M6.5 18 17 7.5" />
      <circle cx="6.5" cy="18" r="1.2" />
    </>
  ),
  // motorolie — fles met druppel
  1371: (
    <>
      <path d="M10 2.5h4v3h-4z" />
      <path d="M8 8.5A3 3 0 0 1 11 5.5h2a3 3 0 0 1 3 3V18a3.5 3.5 0 0 1-3.5 3.5h-1A3.5 3.5 0 0 1 8 18z" />
      <path d="M12 11.5c1.3 1.5 2 2.6 2 3.5a2 2 0 1 1-4 0c0-.9.7-2 2-3.5Z" />
    </>
  ),
  // Schokdemper — oog, veer, oog
  774: (
    <>
      <circle cx="12" cy="3.4" r="1.9" />
      <path d="M12 5.3v1.2" />
      <path d="M5.5 6.5h13l-13 3.2h13l-13 3.2h13l-13 3.2h13" />
      <path d="M12 16.1v2.6" />
      <circle cx="12" cy="20.6" r="1.9" />
    </>
  ),
  // Distributieriem — riem om twee poelies
  269: (
    <>
      <circle cx="7.5" cy="14.5" r="4" />
      <circle cx="17" cy="8.5" r="2.8" />
      <path d="M5.3 11.2 15.5 6.1" />
      <path d="M9.9 18.3 18.7 11.5" />
    </>
  ),
};

export function GroupIcon({
  groupId,
  className = "size-6",
}: {
  groupId: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[groupId] ?? NUT}
    </svg>
  );
}
