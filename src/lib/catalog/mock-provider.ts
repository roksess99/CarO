import type { ProductFamily } from "./families";
import type { CatalogProvider, Category, Part } from "./types";

// Mock heeft alleen data voor twee families; de rest is leeg. De mock is
// er voor ontwikkelen zonder token, niet om het hele assortiment na te bouwen.
const categoriesByFamily: Partial<Record<ProductFamily, Category[]>> = {
  onderdelen: [
    { slug: "remmen", name: "Remmen" },
    { slug: "filters", name: "Filters" },
    { slug: "elektra", name: "Elektra" },
    { slug: "motor", name: "Motor" },
    { slug: "ruitenwissers", name: "Ruitenwissers" },
  ],
  banden: [
    { slug: "auto-suv", name: "Auto / SUV" },
    { slug: "tweewieler", name: "Tweewieler" },
  ],
};

const parts: Part[] = [
  {
    id: "p-001",
    slug: "remblokkenset-vooras-brembo-p85020",
    name: "Remblokkenset vooras",
    brand: "Brembo",
    oeNumber: "P 85 020",
    family: "onderdelen",
    categorySlug: "remmen",
    categoryName: "Remmen",
    priceCents: 4295,
    availability: "in-stock",
  },
  {
    id: "p-002",
    slug: "remschijven-vooras-bosch-0986479b93",
    name: "Remschijven vooras (set van 2)",
    brand: "Bosch",
    oeNumber: "0 986 479 B93",
    family: "onderdelen",
    categorySlug: "remmen",
    categoryName: "Remmen",
    priceCents: 8990,
    availability: "in-stock",
  },
  {
    id: "p-003",
    slug: "oliefilter-mann-hu7197x",
    name: "Oliefilter",
    brand: "MANN-FILTER",
    oeNumber: "HU 719/7 x",
    family: "onderdelen",
    categorySlug: "filters",
    categoryName: "Filters",
    priceCents: 1195,
    availability: "in-stock",
  },
  {
    id: "p-004",
    slug: "interieurfilter-koolstof-mann-cuk26009",
    name: "Interieurfilter met actieve koolstof",
    brand: "MANN-FILTER",
    oeNumber: "CUK 26 009",
    family: "onderdelen",
    categorySlug: "filters",
    categoryName: "Filters",
    priceCents: 1890,
    availability: "ordered",
  },
  {
    id: "p-005",
    slug: "accu-12v-70ah-varta-e44",
    name: "Accu 12V 70Ah",
    brand: "Varta",
    oeNumber: "577 400 078",
    family: "onderdelen",
    categorySlug: "elektra",
    categoryName: "Elektra",
    priceCents: 12950,
    availability: "in-stock",
  },
  {
    id: "p-006",
    slug: "bougieset-4-stuks-ngk-94833",
    name: "Bougieset (4 stuks)",
    brand: "NGK",
    oeNumber: "94833",
    family: "onderdelen",
    categorySlug: "motor",
    categoryName: "Motor",
    priceCents: 3160,
    availability: "in-stock",
  },
  {
    id: "p-007",
    slug: "multiriem-continental-6pk1153",
    name: "Multiriem",
    brand: "Continental",
    oeNumber: "6PK1153",
    family: "onderdelen",
    categorySlug: "motor",
    categoryName: "Motor",
    priceCents: 2245,
    availability: "ordered",
  },
  {
    id: "p-008",
    slug: "ruitenwisserset-voor-bosch-3397007620",
    name: "Ruitenwisserset voor",
    brand: "Bosch",
    oeNumber: "3 397 007 620",
    family: "onderdelen",
    categorySlug: "ruitenwissers",
    categoryName: "Ruitenwissers",
    priceCents: 2795,
    availability: "out-of-stock",
  },
  // Banden, zodat beide families ook zonder API-token werken
  {
    id: "t-001",
    slug: "continental-ecocontact-6-195-65-r15-91h",
    name: "CONTINENTAL ECOCONTACT 6 195/65 R15 91 H",
    brand: "CONTINENTAL",
    oeNumber: "0311770",
    family: "banden",
    categorySlug: "auto-suv",
    categoryName: "Auto / SUV",
    priceCents: 8495,
    availability: "in-stock",
  },
  {
    id: "t-002",
    slug: "michelin-primacy-4-205-55-r16-91v",
    name: "MICHELIN PRIMACY 4 205/55 R16 91 V",
    brand: "MICHELIN",
    oeNumber: "925619",
    family: "banden",
    categorySlug: "auto-suv",
    categoryName: "Auto / SUV",
    priceCents: 10750,
    availability: "in-stock",
  },
  {
    id: "t-003",
    slug: "michelin-city-grip-2-120-70-12-58p",
    name: "MICHELIN CITY GRIP 2 120/70 -12 58 P",
    brand: "MICHELIN",
    oeNumber: "410352",
    family: "banden",
    categorySlug: "tweewieler",
    categoryName: "Tweewieler",
    priceCents: 5495,
    availability: "ordered",
  },
];

export const mockProvider: CatalogProvider = {
  async getCategories(family) {
    return categoriesByFamily[family] ?? [];
  },
  async getParts(query) {
    let result = parts.filter((p) => p.family === query.family);
    if (query.categorySlug) {
      result = result.filter((p) => p.categorySlug === query.categorySlug);
    }
    if (query.brand) {
      result = result.filter((p) => p.brand === query.brand);
    }
    const merken = query.filters?.merk;
    if (merken?.length) {
      result = result.filter((p) => merken.includes(p.brand));
    }
    if (query.search) {
      // Zoals de echte API: exacte match op OE-nummer
      const term = query.search.trim().toUpperCase();
      result = result.filter((p) => p.oeNumber.toUpperCase() === term);
    }
    if (query.limit !== undefined) {
      result = result.slice(0, query.limit);
    }
    return result;
  },
  async getPartBySlug(family, slug) {
    return parts.find((p) => p.family === family && p.slug === slug) ?? null;
  },
  async getFilters(family, categorySlug) {
    // Mock: merkfilter afgeleid uit de eigen data, zodat de UI ook
    // zonder API-token iets te filteren heeft.
    const inCategory = parts.filter(
      (p) => p.family === family && p.categorySlug === categorySlug,
    );
    const brands = [...new Set(inCategory.map((p) => p.brand))].sort();
    if (brands.length < 2) return [];
    return [
      {
        key: "merk",
        label: "Merk",
        options: brands.map((brand) => ({
          value: brand,
          label: brand,
          count: inCategory.filter((p) => p.brand === brand).length,
        })),
      },
    ];
  },

  async getPartById(family, id) {
    return parts.find((p) => p.family === family && p.id === id) ?? null;
  },
};
