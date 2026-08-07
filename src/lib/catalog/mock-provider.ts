import type { CatalogProvider, Category, Part } from "./types";

const categories: Category[] = [
  { slug: "remmen", name: "Remmen" },
  { slug: "filters", name: "Filters" },
  { slug: "elektra", name: "Elektra" },
  { slug: "motor", name: "Motor" },
  { slug: "ruitenwissers", name: "Ruitenwissers" },
];

const parts: Part[] = [
  {
    id: "p-001",
    slug: "remblokkenset-vooras-brembo-p85020",
    name: "Remblokkenset vooras",
    brand: "Brembo",
    oeNumber: "P 85 020",
    categorySlug: "remmen",
    priceCents: 4295,
    availability: "in-stock",
  },
  {
    id: "p-002",
    slug: "remschijven-vooras-bosch-0986479b93",
    name: "Remschijven vooras (set van 2)",
    brand: "Bosch",
    oeNumber: "0 986 479 B93",
    categorySlug: "remmen",
    priceCents: 8990,
    availability: "in-stock",
  },
  {
    id: "p-003",
    slug: "oliefilter-mann-hu7197x",
    name: "Oliefilter",
    brand: "MANN-FILTER",
    oeNumber: "HU 719/7 x",
    categorySlug: "filters",
    priceCents: 1195,
    availability: "in-stock",
  },
  {
    id: "p-004",
    slug: "interieurfilter-koolstof-mann-cuk26009",
    name: "Interieurfilter met actieve koolstof",
    brand: "MANN-FILTER",
    oeNumber: "CUK 26 009",
    categorySlug: "filters",
    priceCents: 1890,
    availability: "ordered",
  },
  {
    id: "p-005",
    slug: "accu-12v-70ah-varta-e44",
    name: "Accu 12V 70Ah",
    brand: "Varta",
    oeNumber: "577 400 078",
    categorySlug: "elektra",
    priceCents: 12950,
    availability: "in-stock",
  },
  {
    id: "p-006",
    slug: "bougieset-4-stuks-ngk-94833",
    name: "Bougieset (4 stuks)",
    brand: "NGK",
    oeNumber: "94833",
    categorySlug: "motor",
    priceCents: 3160,
    availability: "in-stock",
  },
  {
    id: "p-007",
    slug: "multiriem-continental-6pk1153",
    name: "Multiriem",
    brand: "Continental",
    oeNumber: "6PK1153",
    categorySlug: "motor",
    priceCents: 2245,
    availability: "ordered",
  },
  {
    id: "p-008",
    slug: "ruitenwisserset-voor-bosch-3397007620",
    name: "Ruitenwisserset voor",
    brand: "Bosch",
    oeNumber: "3 397 007 620",
    categorySlug: "ruitenwissers",
    priceCents: 2795,
    availability: "out-of-stock",
  },
];

export const mockProvider: CatalogProvider = {
  async getCategories() {
    return categories;
  },
  async getParts(query) {
    let result = parts;
    if (query?.categorySlug) {
      result = result.filter((p) => p.categorySlug === query.categorySlug);
    }
    if (query?.brand) {
      result = result.filter((p) => p.brand === query.brand);
    }
    if (query?.limit !== undefined) {
      result = result.slice(0, query.limit);
    }
    return result;
  },
  async getPartBySlug(slug) {
    return parts.find((p) => p.slug === slug) ?? null;
  },
};
