/**
 * Nederlandse kentekenplaat: blauwe EU-strook links, geel vlak rechts.
 *
 * De kleuren komen NIET uit BRAND.md en horen daar ook niet in: dit is een
 * wettelijk vastgelegd uiterlijk dat iedere Nederlander herkent. Juist die
 * herkenning maakt van een invoerveld een uitnodiging. Merkoranje zou het
 * effect kapotmaken.
 *
 * Geel #facc15 met zwarte tekst haalt ruim 11:1 contrast, en de witte
 * letters op de blauwe strook halen 8,6:1 — beide ruim WCAG AA.
 */
const PLATE_YELLOW = "#facc15";
const PLATE_BLUE = "#003399";
const PLATE_INK = "#0e1013";

/** Blauwe EU-strook met sterrencirkel en landcode */
export function EuStrip({ className = "w-8" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 flex-col items-center justify-center gap-0.5 self-stretch ${className}`}
      style={{ backgroundColor: PLATE_BLUE }}
    >
      <svg viewBox="0 0 24 24" className="w-3/5" aria-hidden="true">
        {/* Twaalf sterren in een cirkel, zoals op de echte plaat */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
          return (
            <circle
              key={i}
              cx={12 + 7.5 * Math.cos(angle)}
              cy={12 + 7.5 * Math.sin(angle)}
              r="1.3"
              fill={PLATE_YELLOW}
            />
          );
        })}
      </svg>
      <span
        className="text-[0.5rem] leading-none font-bold text-white"
        style={{ letterSpacing: "0.02em" }}
      >
        NL
      </span>
    </span>
  );
}

/** Kentekenplaat als weergave, bijvoorbeeld naast de gekozen auto */
export function PlateBadge({
  plate,
  className = "",
}: {
  plate: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex overflow-hidden rounded border-2 ${className}`}
      style={{ borderColor: PLATE_INK, backgroundColor: PLATE_YELLOW }}
    >
      <EuStrip className="w-4" />
      <span
        className="px-2 py-0.5 text-sm font-bold tracking-wider tabular-nums"
        style={{ color: PLATE_INK }}
      >
        {plate}
      </span>
    </span>
  );
}

export { PLATE_YELLOW, PLATE_BLUE, PLATE_INK };
