import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { CatalogNft } from "@/features/catalog/catalog-data";

export interface FavoritesResponse { ids: string[]; items: CatalogNft[] }

export const favoritesQueryOptions = (userId: string) => queryOptions({
  queryKey: ["favorites", userId],
  queryFn: async (): Promise<FavoritesResponse> => (await api.get<FavoritesResponse>("/favorites")).data,
  retry: false,
});

export function useToggleFavorite(userId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["favorites", userId];
  return useMutation({
    mutationFn: async ({ nftId, favorite }: { nftId: string; favorite: boolean }) => {
      if (favorite) await api.put(`/favorites/${encodeURIComponent(nftId)}`);
      else await api.delete(`/favorites/${encodeURIComponent(nftId)}`);
    },
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<FavoritesResponse>(queryKey);
      queryClient.setQueryData<FavoritesResponse>(queryKey, (current = { ids: [], items: [] }) => ({
        ids: favorite ? [...new Set([...current.ids, nftId])] : current.ids.filter((id) => id !== nftId),
        items: favorite ? current.items : current.items.filter((item) => item.id !== nftId),
      }));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => { void queryClient.invalidateQueries({ queryKey }); },
  });
}
