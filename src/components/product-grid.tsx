import { useTranslations } from "next-intl";
import { ProductCard } from "@/components/product-card";
import type { Part } from "@/lib/catalog/types";

export function ProductGrid({ parts }: { parts: Part[] }) {
  const t = useTranslations("product");

  if (parts.length === 0) {
    return <p className="text-muted">{t("empty")}</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
      {parts.map((part) => (
        <li key={part.id}>
          <ProductCard part={part} />
        </li>
      ))}
    </ul>
  );
}
