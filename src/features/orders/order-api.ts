import { queryOptions } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { CartQuote } from "@/features/cart/cart-types";
import type { CheckoutProfile, WalletNetwork, WalletProvider } from "@/features/checkout/checkout-api";

export type OrderStatus = "pending" | "confirmed" | "refused";

export interface OrderInput {
  quoteRevision: string;
  walletId: string;
  provider: WalletProvider;
  network: WalletNetwork;
  profile: CheckoutProfile;
}

export interface OrderReceipt {
  quote: CartQuote;
  collectorName: string;
  walletName: string;
  walletAddress: string;
  provider: WalletProvider;
  network: WalletNetwork;
  note: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  version: number;
  createdAt: string;
  transactionId: string | null;
  receipt: OrderReceipt;
}

export interface OrderIntent { key: string; input: OrderInput }

const intentKey = (userId: string) => `kurio-order-intent-${userId}`;

export function readOrderIntent(userId: string): OrderIntent | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(intentKey(userId)) ?? "null") as OrderIntent | null;
    return value?.key && value.input ? value : null;
  } catch { return null; }
}

export function saveOrderIntent(userId: string, intent: OrderIntent) {
  sessionStorage.setItem(intentKey(userId), JSON.stringify(intent));
}

export function clearOrderIntent(userId: string) {
  sessionStorage.removeItem(intentKey(userId));
}

export async function createOrder(intent: OrderIntent): Promise<Order> {
  return (await api.post<Order>("/orders", intent.input, {
    headers: {
      "Idempotency-Key": intent.key,
      "X-Mock-Scenario": new URLSearchParams(location.search).get("mock") ?? "",
    },
  })).data;
}

export async function recoverOrder(key: string): Promise<Order> {
  return (await api.get<Order>(`/orders/by-key/${encodeURIComponent(key)}`)).data;
}

export const orderQueryOptions = (userId: string, orderId: string) => queryOptions({
  queryKey: ["order", userId, orderId],
  queryFn: async ({ signal }): Promise<Order> => (await api.get<Order>(`/orders/${encodeURIComponent(orderId)}`, { signal })).data,
  retry: 1,
  refetchInterval: (query) => query.state.data?.status === "pending" ? 1500 : false,
});
