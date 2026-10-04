import { queryOptions } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { CatalogNft } from "./catalog-data";
import type { CatalogSearch } from "./catalog-search";

export interface CatalogResponse {
  items: CatalogNft[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  facets: {
    categories: Record<string, number>;
    networks: Record<string, number>;
  };
}

export const catalogQueryOptions = (search: CatalogSearch) => queryOptions({
  queryKey: ["catalog", search],
  queryFn: async ({ signal }): Promise<CatalogResponse> => {
    const response = await api.get<CatalogResponse>("/nfts", { params: search, signal });
    return response.data;
  },
  retry: 1,
  staleTime: 30_000,
});

export const nftQueryOptions = (id: string) => queryOptions({
  queryKey: ["nft", id],
  queryFn: async ({ signal }): Promise<CatalogNft> => {
    const response = await api.get<CatalogNft>(`/nfts/${encodeURIComponent(id)}`, { signal });
    return response.data;
  },
  retry: false,
  staleTime: 30_000,
});
