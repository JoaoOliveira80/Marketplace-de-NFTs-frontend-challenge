import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

interface SessionResponse { user: SessionUser | null }

export const sessionQueryOptions = queryOptions({
  queryKey: ["session"],
  queryFn: async (): Promise<SessionResponse> => (await api.get<SessionResponse>("/session")).data,
  staleTime: 30_000,
  retry: false,
});

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) =>
      (await api.post<{ token: string; user: SessionUser }>("/session", credentials)).data,
    onSuccess: ({ token, user }) => {
      window.localStorage.setItem("kurio-session-token", token);
      queryClient.setQueryData(["session"], { user });
      void queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return () => {
    window.localStorage.removeItem("kurio-session-token");
    queryClient.removeQueries({ queryKey: ["favorites"] });
    queryClient.setQueryData(["session"], { user: null });
  };
}
