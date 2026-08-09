import { familySource } from "./families";
import { mockProvider } from "./mock-provider";
import { tyre24Provider } from "./tyre24-provider";
import type { CatalogProvider } from "./types";

// Enige plek waar de databron gekozen wordt. Zonder Tyre24-token draait
// alles op de mock — de site moet altijd zonder token blijven werken
// (CLAUDE.md, fase 3). Token + areas: zie docs/api/TYRE24.md.
export function getCatalogProvider(): CatalogProvider {
  const hasToken = Boolean(process.env.TYRE24_API_TOKEN);
  // Minstens één familie moet een bron hebben, anders heeft de echte
  // provider niets te bieden en is de mock nuttiger.
  const hasAnySource = Boolean(familySource("banden") ?? familySource("onderdelen"));
  if (hasToken && hasAnySource) {
    return tyre24Provider;
  }
  return mockProvider;
}
