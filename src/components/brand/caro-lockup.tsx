import { CaroMark } from "./caro-mark";

type Props = {
  className?: string;
  /** Onder 40px renderhoogte: "line" (BRAND.md) */
  markVariant?: "solid" | "line";
};

// TODO: vervang door de echte outline-SVG's uit CarO_logo_brand.pdf zodra die
// er zijn (docs/BRAND.md noemt caro-lockup.svg). Tot die tijd: woordmerk in
// Anton met de moer als O — zelfde opbouw als het concept.
export function CaroLockup({ className = "", markVariant = "line" }: Props) {
  return (
    <span
      className={`inline-flex items-center font-anton uppercase leading-none text-foreground ${className}`}
    >
      CAR
      <CaroMark
        variant={markVariant}
        className="ml-[0.08em] h-[0.8em] w-auto"
      />
    </span>
  );
}
