import { io, type Socket } from "socket.io-client";
import type { QueryClient } from "@tanstack/react-query";
import type { CatalogResponse } from "@/features/catalog/catalog-api";
import type { NftDetail } from "@/features/nft-detail/nft-detail-data";
import type { Order } from "@/features/orders/order-api";
import type { NftUpdatedEvent, OrderUpdatedEvent } from "./realtime-types";
import { guestId } from "@/features/cart/cart-api";

const TOKEN_KEY = "kurio-session-token";

function validVersion(version: unknown): version is number {
  return Number.isSafeInteger(version) && Number(version) > 0;
}

export function startRealtime(queryClient: QueryClient) {
  let socket: Socket | null = null;
  let token = "";
  let seen = new Set<string>();
  let versions = new Map<string, number>();

  const reconcile = () => {
    for (const key of [["catalog"], ["nft"], ["cart"], ["cart-quote"], ["order"]]) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  };

  const onNft = (event: NftUpdatedEvent) => {
    if (!event || typeof event.eventId !== "string" || typeof event.nftId !== "string" || typeof event.editionId !== "string" || !validVersion(event.version) || typeof event.priceEth !== "string" || !Number.isSafeInteger(event.available)) return;
    const key = `nft:${event.nftId}:${event.editionId}`;
    let latest = versions.get(key) ?? 0;
    for (const [, response] of queryClient.getQueriesData<CatalogResponse>({ queryKey: ["catalog"] })) {
      const nft = response?.items.find((item) => item.id === event.nftId);
      if (nft && (event.editionId === "default" || event.editionId === "fifty")) latest = Math.max(latest, nft.version ?? 0);
    }
    const detail = queryClient.getQueryData<NftDetail>(["nft", event.nftId]);
    latest = Math.max(latest, detail?.editions.find((edition) => edition.id === event.editionId)?.version ?? 0);
    if (seen.has(event.eventId) || event.version < latest || event.version <= (versions.get(key) ?? 0)) return;
    seen.add(event.eventId);
    versions.set(key, event.version);
    window.dispatchEvent(new CustomEvent("kurio:nft-updated", { detail: event }));
    for (const queryKey of [["catalog"], ["nft", event.nftId], ["cart-quote"]]) void queryClient.invalidateQueries({ queryKey });
  };

  const onOrder = (event: OrderUpdatedEvent) => {
    const userId = queryClient.getQueryData<{ user: { id: string } | null }>(["session"])?.user?.id;
    if (!event || typeof event.eventId !== "string" || typeof event.orderId !== "string" || event.userId !== userId || !validVersion(event.version) || !["confirmed", "refused"].includes(event.status)) return;
    const key = `order:${userId}:${event.orderId}`;
    const cached = queryClient.getQueryData<Order>(["order", userId, event.orderId]);
    const latest = Math.max(versions.get(key) ?? 0, cached?.version ?? 0);
    if (seen.has(event.eventId) || event.version <= latest || (cached && cached.status !== "pending")) return;
    seen.add(event.eventId);
    versions.set(key, event.version);
    void queryClient.invalidateQueries({ queryKey: ["order", userId, event.orderId] });
    void queryClient.invalidateQueries({ queryKey: ["cart", `user-${userId}`] });
    void queryClient.invalidateQueries({ queryKey: ["cart-quote", `user-${userId}`] });
  };

  const connect = () => {
    const nextToken = localStorage.getItem(TOKEN_KEY) ?? "";
    if (socket && token === nextToken) return;
    socket?.removeAllListeners();
    socket?.disconnect();
    token = nextToken;
    seen = new Set();
    versions = new Map();
    socket = io(location.origin, { path: "/socket.io", transports: ["websocket"], query: { token, guestId: guestId(), scenario: new URLSearchParams(location.search).get("mock") ?? "" }, reconnection: true });
    socket.on("connect", reconcile);
    socket.on("nft.updated", onNft);
    socket.on("order.updated", onOrder);
  };

  const onSessionChange = () => { connect(); };
  const onStorage = (event: StorageEvent) => { if (event.key === TOKEN_KEY) connect(); };
  window.addEventListener("kurio:session-established", onSessionChange);
  window.addEventListener("kurio:session-cleared", onSessionChange);
  window.addEventListener("kurio:session-expired", onSessionChange);
  window.addEventListener("storage", onStorage);
  connect();

  return () => {
    window.removeEventListener("kurio:session-established", onSessionChange);
    window.removeEventListener("kurio:session-cleared", onSessionChange);
    window.removeEventListener("kurio:session-expired", onSessionChange);
    window.removeEventListener("storage", onStorage);
    socket?.removeAllListeners();
    socket?.disconnect();
  };
}
