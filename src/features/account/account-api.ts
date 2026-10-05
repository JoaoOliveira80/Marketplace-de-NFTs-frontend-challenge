import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { SessionResponse } from "@/features/auth/auth-api";
import type { WalletNetwork, WalletProvider, WalletState } from "@/features/checkout/checkout-api";

export interface CollectorProfile {
  displayName: string;
  username: string;
  email: string;
  ensName: string;
  walletNickname: string;
  avatar: string | null;
}

export interface PasswordInput { currentPassword: string; newPassword: string; confirmPassword: string }

export interface WalletFormInput {
  displayName: string;
  nickname: string;
  network: WalletNetwork | "";
  profileName: string;
  address: string;
  secondaryAddress: string;
  provider: WalletProvider | "";
  referralCode: string;
  email: string;
  ensName: string;
}

export const profileQueryOptions = (userId: string) => queryOptions({
  queryKey: ["profile", userId],
  queryFn: async ({ signal }): Promise<CollectorProfile> => (await api.get<CollectorProfile>("/profile", { signal })).data,
  retry: 1,
});

export function useProfileActions(userId: string) {
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: async (input: CollectorProfile): Promise<CollectorProfile> => (await api.put<CollectorProfile>("/profile", input)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(["profile", userId], data);
      queryClient.setQueryData<SessionResponse>(["session"], (current) => current?.user ?
        { user: { ...current.user, name: data.displayName, email: data.email } } : current);
      const draftKey = `kurio-checkout-draft-${userId}`;
      try {
        const draft = sessionStorage.getItem(draftKey);
        if (draft) sessionStorage.setItem(draftKey, JSON.stringify({ ...JSON.parse(draft), displayName: data.displayName,
          username: data.username, email: data.email, ensName: data.ensName }));
      } catch { /* An invalid checkout draft is ignored by checkout. */ }
    },
  });
  const changePassword = useMutation({
    mutationFn: async (input: PasswordInput): Promise<void> => { await api.put("/profile/password", input); },
  });
  return { update, changePassword };
}

export function useWalletSave(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ slot, input }: { slot: "primary" | "secondary"; input: WalletFormInput }): Promise<WalletState> =>
      (await api.put<WalletState>(`/wallets/${slot}`, input)).data,
    onSuccess: (data) => queryClient.setQueryData(["wallets", userId], data),
  });
}

export function useSecondaryPreference(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sameAsPrimary: boolean): Promise<WalletState> =>
      (await api.put<WalletState>("/wallets/preferences/secondary", { sameAsPrimary })).data,
    onSuccess: (data) => queryClient.setQueryData(["wallets", userId], data),
  });
}
