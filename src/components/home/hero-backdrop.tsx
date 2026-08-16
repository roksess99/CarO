/**
 * Achtergrond van de hero: een technische tekening in plaats van een foto.
 *
 * Bewust SVG en geen JPEG. Een schermvullende foto kost honderden kB, wordt
 * op elk formaat anders bijgesneden en duwt de LCP omhoog — precies het
 * budget uit .claude/rules/frontend.md. Deze tekening is een paar kB, blijft
 * scherp op elk scherm en volgt het thema mee.
 *
 * Het motief is de moer uit het logo (BRAND.md), herhaald als blauwdruk.
 * Alles staat in `currentColor` op zeer lage dekking, zodat de tekst er
 * overheen zijn volledige contrast houdt.
 */

/** Tekenvlak; `slice` snijdt bij, dus de verhouding hoeft niet te kloppen */
const WIDTH = 1440;
const HEIGHT = 600;

/** Middelpunt van de remschijf: half buiten beeld rechtsboven */
const DISC_X = 1250;
const DISC_Y = -40;

export function HeroBackdrop({
  /**
   * De tekening staat meerdere keren op de pagina (vlak en banner). SVG-id's
   * moeten uniek zijn, anders verwijst de tweede `url(#…)` naar het patroon
   * van de eerste.
   */
  id = "hero",
}: {
  id?: string;
} = {}) {
  const gridId = `caro-grid-${id}`;
  const nutsId = `caro-nuts-${id}`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden text-foreground"
    >
      <svg
        className="size-full"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Millimeterpapier: geeft het vlak diepte zonder iets voor te stellen */}
          <pattern id={gridId} width="32" height="32" patternUnits="userSpaceOnUse">
            <path
              d="M32 0H0v32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.07"
            />
          </pattern>

          {/* De moer, 12 graden gekanteld zoals het merk voorschrijft */}
          <pattern
            id={nutsId}
            width="180"
            height="156"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(12)"
          >
            <g fill="none" stroke="currentColor" strokeWidth="2" opacity="0.10">
              <path d="M45 12 71 27v30L45 72 19 57V27z" />
              <circle cx="45" cy="42" r="11" />
              <path d="M135 90l26 15v30l-26 15-26-15v-30z" />
              <circle cx="135" cy="120" r="11" />
            </g>
          </pattern>
        </defs>

        <rect width={WIDTH} height={HEIGHT} fill={`url(#${gridId})`} />
        <rect width={WIDTH} height={HEIGHT} fill={`url(#${nutsId})`} />

        {/* Geventileerde remschijf als blikvanger */}
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.12"
          transform={`translate(${DISC_X} ${DISC_Y})`}
        >
          <circle r="230" />
          <circle r="168" />
          <circle r="66" />
          {/* Koelgaten tussen de buitenrand en de binnenring */}
          {Array.from({ length: 18 }, (_, i) => {
            const angle = (i / 18) * 2 * Math.PI;
            return (
              <circle
                key={`gat-${i}`}
                cx={Math.cos(angle) * 199}
                cy={Math.sin(angle) * 199}
                r="9"
              />
            );
          })}
          {/* Wielbouten op de naaf */}
          {Array.from({ length: 5 }, (_, i) => {
            const angle = (i / 5) * 2 * Math.PI - Math.PI / 2;
            return (
              <circle
                key={`bout-${i}`}
                cx={Math.cos(angle) * 108}
                cy={Math.sin(angle) * 108}
                r="14"
              />
            );
          })}
        </g>

        {/* Maatlijn linksonder in merkoranje. Oranje mag als lijn, nooit als
            tekst op een lichte achtergrond (BRAND.md). */}
        <g
          className="text-caro-orange"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.45"
        >
          <path d="M0 548h150" />
          <path d="M150 540v16" />
        </g>
      </svg>
    </div>
  );
}
