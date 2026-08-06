import { mockProvider } from "./mock-provider";
import type { CatalogProvider } from "./types";

// Enige plek waar de databron gekozen wordt.
// TODO fase 3: echte catalogus-adapter achter dit entrypoint (docs/DECISIONS.md #1).
export function getCatalogProvider(): CatalogProvider {
  return mockProvider;
}
