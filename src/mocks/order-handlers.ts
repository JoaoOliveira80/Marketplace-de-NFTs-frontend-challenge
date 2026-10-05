import { delay, http, HttpResponse } from "msw";
import type { Order, OrderInput } from "@/features/orders/order-api";
import type { WalletState } from "@/features/checkout/checkout-api";
import { authenticatedUser, authError } from "./account-handlers";
import { quoteFor, readCart, removePurchasedItems } from "./cart-handlers";

interface StoredOrder extends Order {
  userId: string;
  idempotencyKey: string;
  payload: string;
  settleAt: number;
  outcome: "confirmed" | "refused";
  cartApplied: boolean;
}

const ordersKey = (userId: string) => `kurio-orders-${userId}`;

function readOrders(userId: string): StoredOrder[] {
  try {
    const value = JSON.parse(localStorage.getItem(ordersKey(userId)) ?? "[]") as StoredOrder[];
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function writeOrders(userId: string, orders: StoredOrder[]) {
  localStorage.setItem(ordersKey(userId), JSON.stringify(orders));
}

function currentOrder(userId: string, id: string): StoredOrder | undefined {
  const orders = readOrders(userId);
  const order = orders.find((entry) => entry.id === id);
  if (!order || order.status !== "pending" || Date.now() < order.settleAt) return order;
  const updated: StoredOrder = { ...order, status: order.outcome, version: order.version + 1 };
  if (updated.status === "confirmed") {
    updated.transactionId = `0x${order.id.replaceAll("-", "").padEnd(64, "0")}`;
    if (!order.cartApplied) {
      removePurchasedItems(`user-${userId}`, order.receipt.quote.items);
      updated.cartApplied = true;
    }
  }
  writeOrders(userId, orders.map((entry) => entry.id === id ? updated : entry));
  return updated;
}

function publicOrder(order: StoredOrder): Order {
  return {
    id: order.id, status: order.status, version: order.version, createdAt: order.createdAt,
    transactionId: order.transactionId, receipt: order.receipt,
  };
}

function connectedWallet(userId: string, input: OrderInput) {
  try {
    const state = JSON.parse(localStorage.getItem(`kurio-wallet-state-${userId}`) ?? "null") as WalletState | null;
    return state?.connectedWalletId === input.walletId && state.connectedProvider === input.provider &&
      state.wallets.find((entry) => entry.id === input.walletId && entry.network === input.network);
  } catch { return false; }
}

export const orderHandlers = [
  http.post("/api/orders", async ({ request }) => {
    await delay(350);
    const user = authenticatedUser(request);
    if (!user) return authError();
    const key = request.headers.get("Idempotency-Key")?.trim() ?? "";
    if (!/^[\w-]{16,80}$/.test(key)) return HttpResponse.json({ message: "Chave de idempotência inválida.", code: "INVALID_KEY" }, { status: 422 });
    const input = await request.json() as OrderInput;
    const payload = JSON.stringify(input);
    const existing = readOrders(user.id).find((order) => order.idempotencyKey === key);
    if (existing) {
      if (existing.payload !== payload) return HttpResponse.json({ message: "Esta chave já foi usada com dados diferentes.", code: "IDEMPOTENCY_CONFLICT" }, { status: 409 });
      return HttpResponse.json(publicOrder(currentOrder(user.id, existing.id) ?? existing));
    }
    if (!input?.profile?.displayName?.trim() || !input.profile.email?.trim() || !input.profile.referralCode?.trim() || !input.profile.ensName?.trim() || (input.profile.useOtherWallet && !input.profile.secondaryAddress?.trim())) {
      return HttpResponse.json({ message: "Revise os dados obrigatórios do colecionador.", code: "VALIDATION_ERROR" }, { status: 422 });
    }
    const wallet = connectedWallet(user.id, input);
    if (!wallet) return HttpResponse.json({ message: "Conecte a carteira e a rede selecionadas.", code: "WALLET_DISCONNECTED" }, { status: 409 });
    const quote = quoteFor(readCart(`user-${user.id}`));
    if (!quote.valid || !quote.items.length || quote.revision !== input.quoteRevision) {
      return HttpResponse.json({ message: "A cotação mudou. Revise os valores antes de enviar o pedido.", code: "QUOTE_CHANGED", quote }, { status: 409 });
    }
    const id = crypto.randomUUID();
    const scenario = request.headers.get("X-Mock-Scenario");
    const order: StoredOrder = {
      id, userId: user.id, idempotencyKey: key, payload, status: "pending", version: 1,
      createdAt: new Date().toISOString(), transactionId: null, settleAt: Date.now() + (scenario === "order-pending" ? 12_000 : 2_400),
      outcome: scenario === "order-refused" ? "refused" : "confirmed", cartApplied: false,
      receipt: {
        quote: structuredClone(quote), collectorName: input.profile.displayName.trim(), walletName: wallet.name,
        walletAddress: input.profile.useOtherWallet ? input.profile.secondaryAddress.trim() : wallet.address,
        provider: input.provider, network: input.network, note: input.profile.note.trim(),
      },
    };
    writeOrders(user.id, [...readOrders(user.id), order]);
    if (scenario === "order-timeout") {
      await delay(900);
      return HttpResponse.json({ message: "A resposta expirou após o pedido ser criado.", code: "ORDER_TIMEOUT" }, { status: 504 });
    }
    return HttpResponse.json(publicOrder(order), { status: 202 });
  }),
  http.get("/api/orders/by-key/:key", async ({ request, params }) => {
    await delay(180);
    const user = authenticatedUser(request);
    if (!user) return authError();
    const order = readOrders(user.id).find((entry) => entry.idempotencyKey === params.key);
    return order ? HttpResponse.json(publicOrder(currentOrder(user.id, order.id) ?? order)) : HttpResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
  }),
  http.get("/api/orders/:orderId", async ({ request, params }) => {
    await delay(180);
    const user = authenticatedUser(request);
    if (!user) return authError();
    const order = currentOrder(user.id, String(params.orderId));
    return order ? HttpResponse.json(publicOrder(order)) : HttpResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
  }),
];
