import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { CartItem, CartQuote, CartResponse } from "./cart-types";

const GUEST_KEY = "kurio-guest-id";

export function guestId() {
  let id = window.localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

function cartConfig() {
  return { headers: { "X-Guest-Id": guestId(), "X-Mock-Scenario": new URLSearchParams(window.location.search).get("mock") ?? "" } };
}

export const cartQueryOptions = (scope: string) => queryOptions({
  queryKey: ["cart", scope],
  queryFn: async ({ signal }): Promise<CartResponse> => {
    if (scope.startsWith("user-") && window.localStorage.getItem("kurio-cart-merge-pending")) await mergeGuestCart();
    return (await api.get<CartResponse>("/cart", { ...cartConfig(), signal })).data;
  },
  retry: 1,
  refetchInterval: 15_000,
});

export const quoteQueryOptions = (scope: string) => queryOptions({
  queryKey: ["cart-quote", scope],
  queryFn: async ({ signal }): Promise<CartQuote> => (await api.get<CartQuote>("/cart/quote", { ...cartConfig(), signal })).data,
  retry: 1,
  refetchInterval: 15_000,
});

export async function mergeGuestCart() {
  const id = guestId();
  window.localStorage.setItem("kurio-cart-merge-pending", id);
  await api.post("/cart/merge", { guestId: id }, cartConfig());
  window.localStorage.removeItem("kurio-cart-merge-pending");
}

export function useCartActions() {
  const queryClient = useQueryClient();
  const afterChange = () => {
    void queryClient.invalidateQueries({ queryKey: ["cart"] });
    void queryClient.invalidateQueries({ queryKey: ["cart-quote"] });
  };
  const add = useMutation({ mutationFn: async (item: CartItem) => (await api.post<CartResponse>("/cart/items", item, cartConfig())).data, onSuccess: afterChange });
  const update = useMutation({ mutationFn: async (item: CartItem) => (await api.patch<CartResponse>(`/cart/items/${encodeURIComponent(item.nftId)}/${encodeURIComponent(item.editionId)}`, { quantity: item.quantity }, cartConfig())).data, onSuccess: afterChange });
  const remove = useMutation({ mutationFn: async (item: Pick<CartItem, "nftId" | "editionId">) => (await api.delete<CartResponse>(`/cart/items/${encodeURIComponent(item.nftId)}/${encodeURIComponent(item.editionId)}`, cartConfig())).data, onSuccess: afterChange });
  const applyCoupon = useMutation({ mutationFn: async (code: string) => (await api.put<CartResponse>("/cart/coupon", { code }, cartConfig())).data, onSuccess: afterChange });
  const removeCoupon = useMutation({ mutationFn: async () => (await api.delete<CartResponse>("/cart/coupon", cartConfig())).data, onSuccess: afterChange });
  return { add, update, remove, applyCoupon, removeCoupon };
}
