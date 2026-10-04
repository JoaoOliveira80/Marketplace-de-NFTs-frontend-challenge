import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export const favoritesQueryOptions = (userId: string) => queryOptions({
  queryKey: ["favorites", userId],
  queryFn: async (): Promise<string[]> => (await api.get<{ ids: string[] }>("/favorites")).data.ids,
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
      const previous = queryClient.getQueryData<string[]>(queryKey);
      queryClient.setQueryData<string[]>(queryKey, (current = []) =>
        favorite ? [...new Set([...current, nftId])] : current.filter((id) => id !== nftId),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: () => { void queryClient.invalidateQueries({ queryKey }); },
  });
}
