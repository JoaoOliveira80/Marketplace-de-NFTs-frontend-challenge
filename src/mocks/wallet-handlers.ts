import { delay, http, HttpResponse } from "msw";
import type { SavedWallet, WalletProvider, WalletState } from "@/features/checkout/checkout-api";
import { authenticatedUser, authError } from "./account-handlers";

function walletKey(userId: string) { return `kurio-wallet-state-${userId}`; }

function walletState(userId: string): WalletState {
  const defaults: SavedWallet[] = userId === "nova" ? [
    { id: "reserve", name: "Reserva", address: "nova.kurio.eth", network: "Polygon", provider: "Coinbase Wallet" },
    { id: "primary", name: "Principal", address: "0xA91F...E82C", network: "Ethereum", provider: "MetaMask" },
  ] : [
    { id: "primary", name: "Principal", address: "0xB241...47DA", network: "Ethereum", provider: "MetaMask" },
  ];
  try {
    const stored = JSON.parse(localStorage.getItem(walletKey(userId)) ?? "") as WalletState;
    if (Array.isArray(stored.wallets)) return {
      ...stored,
      connectedProvider: stored.connectedProvider ??
        stored.wallets.find((wallet) => wallet.id === stored.connectedWalletId)?.provider ?? null,
    };
  } catch { /* use seeded wallets */ }
  return { wallets: defaults, connectedWalletId: null, connectedProvider: null };
}

function respond(userId: string, state: WalletState) {
  localStorage.setItem(walletKey(userId), JSON.stringify(state));
  return HttpResponse.json(state);
}

export const walletHandlers = [
  http.get("/api/wallets", async ({ request }) => {
    await delay(180);
    const user = authenticatedUser(request);
    return user ? HttpResponse.json(walletState(user.id)) : authError();
  }),
  http.post("/api/wallets/connect", async ({ request }) => {
    await delay(480);
    const user = authenticatedUser(request);
    if (!user) return authError();
    if (request.headers.get("X-Mock-Scenario") === "wallet-refused") return HttpResponse.json({ message: "Conexão recusada na carteira.", code: "WALLET_REFUSED" }, { status: 409 });
    const { walletId, provider, network } = await request.json() as { walletId: string; provider: WalletProvider; network: string };
    const state = walletState(user.id);
    const wallet = state.wallets.find((entry) => entry.id === walletId);
    if (!wallet) return HttpResponse.json({ message: "Carteira não encontrada." }, { status: 404 });
    if (wallet.network !== network) return HttpResponse.json({ message: "A rede não corresponde à carteira cadastrada." }, { status: 422 });
    if (!["WalletConnect", "MetaMask", "Coinbase Wallet"].includes(provider)) return HttpResponse.json({ message: "Selecione um aplicativo de carteira válido." }, { status: 422 });
    return respond(user.id, { ...state, connectedWalletId: wallet.id, connectedProvider: provider });
  }),
  http.post("/api/wallets/disconnect", async ({ request }) => {
    await delay(180);
    const user = authenticatedUser(request);
    if (!user) return authError();
    return respond(user.id, { ...walletState(user.id), connectedWalletId: null, connectedProvider: null });
  }),
];
