import { delay, http, HttpResponse } from "msw";
import type { SavedWallet, WalletProvider, WalletState, WalletNetwork } from "@/features/checkout/checkout-api";
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

interface WalletInput {
  displayName?: string; nickname?: string; network?: WalletNetwork; profileName?: string;
  address?: string; secondaryAddress?: string; provider?: WalletProvider;
  referralCode?: string; email?: string; ensName?: string;
}

const addressValid = (value: string) => /^0x(?:[a-f\d]{40}|[a-f\d]{4,8}\.\.\.[a-f\d]{4,8})$/i.test(value) || /^[a-z0-9.-]{3,63}\.eth$/i.test(value);

function validateWallet(input: WalletInput) {
  const fields: Record<string, string> = {};
  if (!input.displayName?.trim()) fields.displayName = "Informe o nome de exibição.";
  if (!input.nickname?.trim()) fields.nickname = "Informe o apelido da carteira.";
  if (!input.profileName?.trim()) fields.profileName = "Informe o nome do perfil.";
  if (!input.network || !["Ethereum", "Polygon", "Solana"].includes(input.network)) fields.network = "Selecione uma rede.";
  if (!input.address || !addressValid(input.address.trim())) fields.address = "Informe um endereço 0x ou ENS válido.";
  if (input.secondaryAddress?.trim() && !addressValid(input.secondaryAddress.trim())) fields.secondaryAddress = "Informe um endereço secundário válido.";
  if (!input.provider || !["WalletConnect", "MetaMask", "Coinbase Wallet"].includes(input.provider)) fields.provider = "Selecione o tipo de carteira.";
  if (!input.referralCode?.trim()) fields.referralCode = "Informe o código de indicação.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email ?? "")) fields.email = "Informe um e-mail válido.";
  if (!/^[a-z0-9.-]{3,63}$/i.test(input.ensName ?? "")) fields.ensName = "Informe um nome ENS válido, sem .eth.";
  return fields;
}

export const walletHandlers = [
  http.get("/api/wallets", async ({ request }) => {
    await delay(180);
    const user = authenticatedUser(request);
    if (!user) return authError();
    if (request.headers.get("X-Mock-Scenario") === "wallet-error") return HttpResponse.json({ message: "Carteiras temporariamente indisponíveis." }, { status: 503 });
    return HttpResponse.json(walletState(user.id));
  }),
  http.put("/api/wallets/preferences/secondary", async ({ request }) => {
    await delay(180);
    const user = authenticatedUser(request);
    if (!user) return authError();
    if (request.headers.get("X-Mock-Scenario") === "wallet-error") return HttpResponse.json({ message: "Não foi possível salvar a preferência." }, { status: 503 });
    const { sameAsPrimary } = await request.json() as { sameAsPrimary?: boolean };
    if (typeof sameAsPrimary !== "boolean") return HttpResponse.json({ message: "Opção inválida." }, { status: 422 });
    return respond(user.id, { ...walletState(user.id), secondaryUsesPrimary: sameAsPrimary });
  }),
  http.put("/api/wallets/:slot", async ({ request, params }) => {
    await delay(220);
    const user = authenticatedUser(request);
    if (!user) return authError();
    if (request.headers.get("X-Mock-Scenario") === "wallet-error") return HttpResponse.json({ message: "Não foi possível salvar a carteira." }, { status: 503 });
    const slot = String(params.slot);
    if (slot !== "primary" && slot !== "secondary") return HttpResponse.json({ message: "Tipo de carteira inválido." }, { status: 404 });
    const input = await request.json() as WalletInput;
    const fields = validateWallet(input);
    if (Object.keys(fields).length) return HttpResponse.json({ message: "Revise os campos da carteira.", code: "VALIDATION_ERROR", fields }, { status: 422 });
    const state = walletState(user.id);
    const existing = state.wallets.find((wallet) => slot === "primary" ? wallet.id === "primary" : wallet.id !== "primary");
    if (state.wallets.some((wallet) => wallet.id !== existing?.id && wallet.address.toLowerCase() === input.address?.trim().toLowerCase())) {
      return HttpResponse.json({ message: "Este endereço já está cadastrado.", code: "WALLET_CONFLICT", fields: { address: "Já cadastrado." } }, { status: 409 });
    }
    const saved: SavedWallet = {
      id: existing?.id ?? slot, name: input.nickname!.trim(), address: input.address!.trim(), network: input.network!, provider: input.provider!,
      displayName: input.displayName!.trim(), profileName: input.profileName!.trim(), secondaryAddress: input.secondaryAddress?.trim() ?? "",
      referralCode: input.referralCode!.trim(), email: input.email!.trim().toLowerCase(), ensName: input.ensName!.trim().toLowerCase(),
    };
    const wallets = existing ? state.wallets.map((wallet) => wallet.id === existing.id ? saved : wallet) : [...state.wallets, saved];
    const connectionChanged = state.connectedWalletId === saved.id &&
      (existing?.address !== saved.address || existing.network !== saved.network || existing.provider !== saved.provider);
    return respond(user.id, { ...state, wallets, secondaryUsesPrimary: slot === "secondary" ? false : state.secondaryUsesPrimary, connectedWalletId: connectionChanged ? null : state.connectedWalletId,
      connectedProvider: connectionChanged ? null : state.connectedProvider });
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
