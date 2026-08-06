import Image from "next/image";

const SRC = {
  solid: "/brand/caro-mark.svg",
  line: "/brand/caro-mark-line.svg",
} as const;

type Props = {
  /** Onder 40px altijd "line" — de volle vulling loopt dan dicht (BRAND.md) */
  variant?: keyof typeof SRC;
  className?: string;
  alt?: string;
};

export function CaroMark({ variant = "solid", className, alt = "" }: Props) {
  return (
    <Image
      src={SRC[variant]}
      width={64}
      height={64}
      alt={alt}
      className={className}
    />
  );
}
