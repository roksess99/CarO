/**
 * Vervanger voor een ontbrekende productfoto.
 *
 * Bewust géén merklogo: een pagina vol CarO-moeren leest als een sierlijk
 * patroon in plaats van als "hier hoort een foto". Deze neutrale tekening van
 * een verpakking zegt precies dat, en concurreert niet met het echte logo in
 * de header.
 *
 * Tyre24 levert voorlopig geen bruikbare foto-URL's (docs/api/TYRE24.md), dus
 * dit is nu de normale toestand, niet de uitzondering.
 */
export function ProductImagePlaceholder({
  label,
  className = "",
  iconClassName = "size-10",
}: {
  /** Wat een screenreader hoort; het beeld zelf zegt niets */
  label: string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex items-center justify-center bg-surface text-muted ${className}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 48 48"
        className={iconClassName}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M24 5 6 13v22l18 8 18-8V13z" />
        <path d="M6 13l18 8 18-8" />
        <path d="M24 21v22" />
        <path d="M15 9l18 8" />
      </svg>
    </div>
  );
}
