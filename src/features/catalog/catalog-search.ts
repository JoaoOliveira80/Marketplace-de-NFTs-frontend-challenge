import type { SearchSchemaInput } from "@tanstack/react-router";

export type CatalogTab = "all" | "new" | "trending";
export type CatalogSort = "recent" | "price-asc" | "price-desc";
export type CatalogMockScenario = "slow" | "error" | "offline" | "out-of-order" | "empty";

export interface CatalogSearch {
  q: string;
  category: string;
  network: string;
  minPrice: number;
  maxPrice: number;
  tab: CatalogTab;
  sort: CatalogSort;
  page: number;
  mock?: CatalogMockScenario;
}

export const defaultCatalogSearch = {
  q: "",
  category: "",
  network: "",
  minPrice: 0.02,
  maxPrice: 12.3,
  tab: "all",
  sort: "recent",
  page: 1,
} satisfies CatalogSearch;

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;

const price = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return value !== undefined && value !== null && value !== "" && Number.isFinite(parsed)
    ? Math.min(12.3, Math.max(0.02, parsed))
    : fallback;
};

export function parseCatalogSearch(search: Record<string, unknown>): CatalogSearch {
  const minPrice = price(search.minPrice, defaultCatalogSearch.minPrice);
  const maxPrice = price(search.maxPrice, defaultCatalogSearch.maxPrice);
  const page = Number(search.page);
  const mock = oneOf(search.mock, ["slow", "error", "offline", "out-of-order", "empty"] as const, "slow");

  return {
    q: typeof search.q === "string" ? search.q.slice(0, 120) : defaultCatalogSearch.q,
    category: typeof search.category === "string" ? search.category : defaultCatalogSearch.category,
    network: typeof search.network === "string" ? search.network : defaultCatalogSearch.network,
    minPrice: Math.min(minPrice, maxPrice),
    maxPrice: Math.max(minPrice, maxPrice),
    tab: oneOf(search.tab, ["all", "new", "trending"] as const, defaultCatalogSearch.tab),
    sort: oneOf(search.sort, ["recent", "price-asc", "price-desc"] as const, defaultCatalogSearch.sort),
    page: Number.isInteger(page) && page > 0 ? page : defaultCatalogSearch.page,
    ...(search.mock ? { mock } : {}),
  };
}

export function validateCatalogSearch(search: Partial<CatalogSearch> & SearchSchemaInput): CatalogSearch {
  return parseCatalogSearch(search);
}
