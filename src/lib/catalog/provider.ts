import { mockProvider } from "./mock-provider";
import { tyre24Provider } from "./tyre24-provider";
import type { CatalogProvider } from "./types";

// Enige plek waar de databron gekozen wordt. Zonder Tyre24-token draait
// alles op de mock — de site moet altijd zonder token blijven werken
// (CLAUDE.md, fase 3). Token + productAreaId: zie docs/api/TYRE24.md.
export function getCatalogProvider(): CatalogProvider {
  if (process.env.TYRE24_API_TOKEN && process.env.TYRE24_PRODUCT_AREA_ID) {
    return tyre24Provider;
  }
  return mockProvider;
}
