import { delay, http, HttpResponse } from "msw";
import { catalogNfts } from "@/features/catalog/catalog-data";
import { ethString, ethUnits } from "@/features/cart/eth";
import type { CartItem, CartQuote, CartResponse, QuotedItem } from "@/features/cart/cart-types";
import { authenticatedUser, authError, tokenFrom } from "./account-handlers";
import { nftEditions } from "./nft-inventory";
import { currentCatalogNft } from "./realtime-state";

const CART_PREFIX = "kurio-cart-";
const PROMOTIONS: Record<string, bigint> = { KURIO10: 10n, LANCAMENTO: 5n };

function cartKey(scope: string) { return `${CART_PREFIX}${scope}`; }

export function readCart(scope: string): CartResponse {
  try {
    const stored = JSON.parse(localStorage.getItem(cartKey(scope)) ?? "") as CartResponse;
    return { items: Array.isArray(stored.items) ? stored.items : [], coupon: typeof stored.coupon === "string" ? stored.coupon : null };
  } catch { return { items: [], coupon: null }; }
}

function saveCart(scope: string, cart: CartResponse) {
  localStorage.setItem(cartKey(scope), JSON.stringify(cart));
  return HttpResponse.json(cart);
}

function scopeFor(request: Request): string | null {
  if (tokenFrom(request)) {
    const user = authenticatedUser(request);
    return user ? `user-${user.id}` : null;
  }
  const guest = request.headers.get("X-Guest-Id");
  return guest && /^[\w-]{8,80}$/.test(guest) ? `guest-${guest}` : null;
}

function itemDetails(nftId: string, editionId: string) {
  const base = catalogNfts.find((entry) => entry.id === nftId);
  const nft = base && currentCatalogNft(base);
  const edition = nft && nftEditions(nft).find((entry) => entry.id === editionId);
  return nft && edition ? { nft, edition } : null;
}

export function quoteFor(cart: CartResponse): CartQuote {
  const issues: string[] = [];
  let subtotal = 0n;
  const items: QuotedItem[] = cart.items.flatMap((item) => {
    const details = itemDetails(item.nftId, item.editionId);
    if (!details) { issues.push(`Um item do carrinho não está mais disponível.`); return []; }
    const { nft, edition } = details;
    if (item.quantity > edition.available) issues.push(`${nft.name} #${nft.tokenId}: apenas ${edition.available} disponível(is) na edição ${edition.label}.`);
    const lineTotal = ethUnits(edition.priceEth) * BigInt(item.quantity);
    subtotal += lineTotal;
    return [{ ...item, name: nft.name, tokenId: nft.tokenId, image: nft.image, edition: edition.label, unitPriceEth: edition.priceEth, lineTotalEth: ethString(lineTotal), available: edition.available }];
  });
  const discount = cart.coupon ? subtotal * (PROMOTIONS[cart.coupon] ?? 0n) / 100n : 0n;
  const fee = items.length ? ethUnits("0.016") : 0n;
  const values = { items, coupon: cart.coupon, subtotalEth: ethString(subtotal), discountEth: ethString(discount), networkFeeEth: ethString(fee), totalEth: ethString(subtotal - discount + fee), valid: issues.length === 0, issues };
  return { ...values, revision: JSON.stringify(values) };
}

export function removePurchasedItems(scope: string, purchased: CartItem[]) {
  const cart = readCart(scope);
  const items = cart.items.flatMap((item) => {
    const bought = purchased.find((entry) => entry.nftId === item.nftId && entry.editionId === item.editionId)?.quantity ?? 0;
    return item.quantity > bought ? [{ ...item, quantity: item.quantity - bought }] : [];
  });
  localStorage.setItem(cartKey(scope), JSON.stringify({ ...cart, items }));
}

function scenarioFailure(request: Request) {
  return request.headers.get("X-Mock-Scenario") === "cart-error";
}

export const cartHandlers = [
  http.get("/api/cart", async ({ request }) => {
    await delay(180);
    const scope = scopeFor(request);
    if (!scope) return authError();
    if (scenarioFailure(request)) return HttpResponse.json({ message: "Não foi possível carregar o carrinho." }, { status: 503 });
    return HttpResponse.json(readCart(scope));
  }),
  http.get("/api/cart/quote", async ({ request }) => {
    await delay(220);
    const scope = scopeFor(request);
    if (!scope) return authError();
    if (scenarioFailure(request)) return HttpResponse.json({ message: "Não foi possível calcular a cotação." }, { status: 503 });
    return HttpResponse.json(quoteFor(readCart(scope)));
  }),
  http.post("/api/cart/quote/revalidate", async ({ request }) => {
    await delay(240);
    const user = authenticatedUser(request);
    if (!user) return authError();
    const { revision } = await request.json() as { revision?: string };
    const quote = quoteFor(readCart(`user-${user.id}`));
    return HttpResponse.json({ quote, changed: quote.revision !== revision });
  }),
  http.post("/api/cart/items", async ({ request }) => {
    await delay(220);
    const scope = scopeFor(request);
    if (!scope) return authError();
    const item = await request.json() as CartItem;
    const details = itemDetails(item.nftId, item.editionId);
    if (!details) return HttpResponse.json({ message: "NFT ou edição não encontrado." }, { status: 404 });
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) return HttpResponse.json({ message: "Informe uma quantidade válida." }, { status: 422 });
    const cart = readCart(scope);
    const existing = cart.items.find((entry) => entry.nftId === item.nftId && entry.editionId === item.editionId);
    const nextQuantity = (existing?.quantity ?? 0) + item.quantity;
    if (nextQuantity > details.edition.available) return HttpResponse.json({ message: `A edição permite no máximo ${details.edition.available} unidade(s).`, code: "INSUFFICIENT_STOCK" }, { status: 409 });
    const items = existing ? cart.items.map((entry) => entry === existing ? { ...entry, quantity: nextQuantity } : entry) : [...cart.items, item];
    return saveCart(scope, { ...cart, items });
  }),
  http.patch("/api/cart/items/:nftId/:editionId", async ({ request, params }) => {
    await delay(200);
    const scope = scopeFor(request);
    if (!scope) return authError();
    const cart = readCart(scope);
    const item = cart.items.find((entry) => entry.nftId === params.nftId && entry.editionId === params.editionId);
    if (!item) return HttpResponse.json({ message: "Item não encontrado no carrinho." }, { status: 404 });
    const { quantity } = await request.json() as { quantity: number };
    const details = itemDetails(item.nftId, item.editionId);
    if (!Number.isSafeInteger(quantity) || quantity < 1) return HttpResponse.json({ message: "Informe uma quantidade válida." }, { status: 422 });
    if (!details || quantity > details.edition.available) return HttpResponse.json({ message: "Quantidade maior que a disponibilidade desta edição.", code: "INSUFFICIENT_STOCK" }, { status: 409 });
    return saveCart(scope, { ...cart, items: cart.items.map((entry) => entry === item ? { ...entry, quantity } : entry) });
  }),
  http.delete("/api/cart/items/:nftId/:editionId", async ({ request, params }) => {
    await delay(180);
    const scope = scopeFor(request);
    if (!scope) return authError();
    const cart = readCart(scope);
    return saveCart(scope, { ...cart, items: cart.items.filter((entry) => entry.nftId !== params.nftId || entry.editionId !== params.editionId) });
  }),
  http.put("/api/cart/coupon", async ({ request }) => {
    await delay(220);
    const scope = scopeFor(request);
    if (!scope) return authError();
    const { code } = await request.json() as { code: string };
    const normalized = typeof code === "string" ? code.trim().toUpperCase() : "";
    if (normalized === "EXPIRADO") return HttpResponse.json({ message: "Este cupom expirou.", code: "COUPON_EXPIRED" }, { status: 410 });
    if (!(normalized in PROMOTIONS)) return HttpResponse.json({ message: "Código promocional inválido.", code: "COUPON_INVALID" }, { status: 422 });
    return saveCart(scope, { ...readCart(scope), coupon: normalized });
  }),
  http.delete("/api/cart/coupon", async ({ request }) => {
    await delay(180);
    const scope = scopeFor(request);
    if (!scope) return authError();
    return saveCart(scope, { ...readCart(scope), coupon: null });
  }),
  http.post("/api/cart/merge", async ({ request }) => {
    await delay(200);
    const user = authenticatedUser(request);
    if (!user) return authError();
    const { guestId } = await request.json() as { guestId: string };
    if (!guestId || !/^[\w-]{8,80}$/.test(guestId)) return HttpResponse.json({ message: "Identificador inválido." }, { status: 422 });
    const guestScope = `guest-${guestId}`;
    const userScope = `user-${user.id}`;
    const guest = readCart(guestScope);
    const userCart = readCart(userScope);
    const items = [...userCart.items];
    for (const item of guest.items) {
      const existing = items.find((entry) => entry.nftId === item.nftId && entry.editionId === item.editionId);
      if (existing) existing.quantity += item.quantity;
      else items.push({ ...item });
    }
    const merged = { items, coupon: userCart.coupon ?? guest.coupon };
    localStorage.setItem(cartKey(userScope), JSON.stringify(merged));
    localStorage.removeItem(cartKey(guestScope));
    return HttpResponse.json(merged);
  }),
];
