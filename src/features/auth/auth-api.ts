import { queryOptions, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { mergeGuestCart } from "@/features/cart/cart-api";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export interface SessionResponse { user: SessionUser | null }
export interface AuthResponse { token: string; user: SessionUser }
export interface RegisterInput { name: string; email: string; password: string; confirmPassword: string }
export interface ApiFormError { message: string; code: string; fields?: Record<string, string> }

export const sessionQueryOptions = queryOptions({
  queryKey: ["session"],
  queryFn: async ({ signal }): Promise<SessionResponse> => (await api.get<SessionResponse>("/session", { signal })).data,
  staleTime: 15_000,
  retry: false,
});

async function establishSession(queryClient: QueryClient, response: AuthResponse) {
  window.localStorage.setItem("kurio-session-token", response.token);
  queryClient.clear();
  queryClient.setQueryData(["session"], { user: response.user });
  try { await mergeGuestCart(); } catch { /* The cart query retries this merge while guest items remain stored. */ }
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }): Promise<AuthResponse> =>
      (await api.post<AuthResponse>("/session", credentials)).data,
    onSuccess: (response) => establishSession(queryClient, response),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegisterInput): Promise<AuthResponse> =>
      (await api.post<AuthResponse>("/accounts", input)).data,
    onSuccess: (response) => establishSession(queryClient, response),
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => { await api.post("/session/logout"); },
    onSuccess: () => {
      const userId = queryClient.getQueryData<SessionResponse>(["session"])?.user?.id;
      if (userId) {
        window.sessionStorage.removeItem(`kurio-checkout-draft-${userId}`);
        window.sessionStorage.removeItem(`kurio-checkout-wallet-${userId}`);
        window.sessionStorage.removeItem(`kurio-order-intent-${userId}`);
      }
      window.localStorage.removeItem("kurio-session-token");
      queryClient.clear();
      queryClient.setQueryData(["session"], { user: null });
      window.dispatchEvent(new Event("kurio:session-cleared"));
    },
  });
}
