import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { CartQuote } from "@/features/cart/cart-types";

export type WalletProvider = "WalletConnect" | "MetaMask" | "Coinbase Wallet";
export type WalletNetwork = "Ethereum" | "Polygon" | "Solana";
export interface SavedWallet {
  id: string;
  name: string;
  address: string;
  network: WalletNetwork;
  provider: WalletProvider;
  displayName?: string;
  profileName?: string;
  secondaryAddress?: string;
  referralCode?: string;
  email?: string;
  ensName?: string;
}
export interface WalletState { wallets: SavedWallet[]; connectedWalletId: string | null; connectedProvider: WalletProvider | null; secondaryUsesPrimary?: boolean }
export interface CheckoutProfile {
  displayName: string;
  username: string;
  network: WalletNetwork | "";
  profileName: string;
  walletAddress: string;
  secondaryAddress: string;
  walletType: WalletProvider | "";
  referralCode: string;
  email: string;
  ensName: string;
  useOtherWallet: boolean;
  note: string;
}
export interface RevalidatedQuote { quote: CartQuote; changed: boolean }

export const walletsQueryOptions = (userId: string) => queryOptions({
  queryKey: ["wallets", userId],
  queryFn: async ({ signal }): Promise<WalletState> => (await api.get<WalletState>("/wallets", { signal })).data,
  retry: 1,
});

export function useWalletConnection(userId: string) {
  const queryClient = useQueryClient();
  const sync = (result: WalletState) => queryClient.setQueryData(["wallets", userId], result);
  const connect = useMutation({
    mutationFn: async ({ walletId, provider, network }: { walletId: string; provider: WalletProvider; network: WalletNetwork }): Promise<WalletState> =>
      (await api.post<WalletState>("/wallets/connect", { walletId, provider, network }, { headers: { "X-Mock-Scenario": new URLSearchParams(window.location.search).get("mock") ?? "" } })).data,
    onSuccess: sync,
  });
  const disconnect = useMutation({
    mutationFn: async (): Promise<WalletState> => (await api.post<WalletState>("/wallets/disconnect")).data,
    onSuccess: sync,
  });
  return { connect, disconnect };
}

export async function revalidateQuote(revision: string): Promise<RevalidatedQuote> {
  return (await api.post<RevalidatedQuote>("/cart/quote/revalidate", { revision })).data;
}

export function readCheckoutDraft(userId: string): Partial<CheckoutProfile> {
  try { return JSON.parse(window.sessionStorage.getItem(`kurio-checkout-draft-${userId}`) ?? "{}") as Partial<CheckoutProfile>; }
  catch { return {}; }
}

export function saveCheckoutDraft(userId: string, profile: CheckoutProfile) {
  window.sessionStorage.setItem(`kurio-checkout-draft-${userId}`, JSON.stringify(profile));
}
