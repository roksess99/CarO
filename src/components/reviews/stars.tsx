/** "4,5" in plaats van "4.5" — ook in de tekst die een schermlezer voorleest */
export function formatRating(value: number): string {
  return value.toLocaleString("nl-NL", { maximumFractionDigits: 1 });
}

/**
 * Een cijfer als sterren, voor het tónen van een beoordeling.
 *
 * Het getal staat er altijd bij en is wat een schermlezer voorleest; de
 * sterren zijn `aria-hidden`. Vijf losse tekeningen laten voorlezen als
 * "ster ster ster ster lege ster" is trager en minder precies dan "4 van 5".
 *
 * Halve sterren bestaan hier niet: een gemiddelde van 4,3 wordt vier hele
 * sterren plus het getal ernaast. Een halve ster tekenen vraagt een verloop
 * of een tweede laag, en dat kost meer dan het oplevert bij een cijfer dat er
 * toch al letterlijk staat.
 */
export function Stars({
  rating,
  label,
  className = "",
}: {
  /** 1 tot 5; mag een gemiddelde zijn */
  rating: number;
  /** Wat de schermlezer hoort, bv. "4,3 van de 5 sterren" */
  label: string;
  className?: string;
}) {
  const filled = Math.round(rating);

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      <span className="sr-only">{label}</span>
      {[1, 2, 3, 4, 5].map((step) => (
        <svg
          key={step}
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`size-4 ${step <= filled ? "text-caro-orange" : "text-border"}`}
          fill={step <= filled ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        >
          <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
        </svg>
      ))}
    </span>
  );
}
