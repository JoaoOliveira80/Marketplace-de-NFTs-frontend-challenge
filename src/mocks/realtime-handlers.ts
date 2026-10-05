import { http, HttpResponse, ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import type { NftUpdatedEvent, OrderUpdatedEvent } from "@/features/realtime/realtime-types";
import { authenticatedUser, authError } from "./account-handlers";
import { resetRealtimeNfts, updateEdition } from "./realtime-state";
import { settleOrderNow } from "./order-handlers";
import { readCart } from "./cart-handlers";
import { catalogNfts } from "@/features/catalog/catalog-data";
import { nftEditions } from "./nft-inventory";
import { ethString, ethUnits } from "@/features/cart/eth";

const realtime = ws.link(`${location.origin.replace(/^http/, "ws")}/`);
type Connection = Parameters<Parameters<typeof realtime.addEventListener>[1]>[0]["client"];
const clients = new Map<Connection, { userId: string | null; emit: (name: string, payload: unknown) => void }>();

function userForToken(token: string) {
  if (!token) return null;
  return authenticatedUser(new Request(`${location.origin}/api/session`, { headers: { Authorization: `Bearer ${token}` } }));
}

export function publishNft(event: NftUpdatedEvent) {
  for (const { emit } of clients.values()) emit("nft.updated", event);
}

export function publishOrder(event: OrderUpdatedEvent) {
  for (const [client, connection] of clients) {
    const token = new URL(client.url).searchParams.get("token") ?? "";
    if (connection.userId === event.userId && userForToken(token)?.id === event.userId) connection.emit("order.updated", event);
  }
}

export const realtimeHandlers = [
  realtime.addEventListener("connection", (connection) => {
    const token = new URL(connection.client.url).searchParams.get("token") ?? "";
    const userId = userForToken(token)?.id ?? null;
    const io = toSocketIo(connection);
    clients.set(connection.client, { userId, emit: (name, payload) => io.client.emit(name, payload) });
    connection.client.addEventListener("close", () => { clients.delete(connection.client); });
    const url = new URL(connection.client.url);
    const scenario = url.searchParams.get("scenario");
    if (scenario === "realtime-reset") resetRealtimeNfts();
    const guest = url.searchParams.get("guestId");
    const scope = userId ? `user-${userId}` : guest && /^[\w-]{8,80}$/.test(guest) ? `guest-${guest}` : null;
    if (scope && (scenario === "realtime-price" || scenario === "realtime-sold-out")) {
      const item = readCart(scope).items[0];
      const scenarioKey = item && `kurio-${scenario}-${scope}-${item.nftId}-${item.editionId}`;
      if (item && scenarioKey && !localStorage.getItem(scenarioKey)) {
        localStorage.setItem(scenarioKey, "scheduled");
        window.setTimeout(() => {
          const nft = catalogNfts.find((entry) => entry.id === item.nftId);
          const edition = nft && nftEditions(nft).find((entry) => entry.id === item.editionId);
          if (!edition) return;
          const priceEth = scenario === "realtime-price" ? ethString(ethUnits(edition.priceEth) + ethUnits("0.2")) : edition.priceEth;
          const event = updateEdition(item.nftId, item.editionId, priceEth, scenario === "realtime-sold-out" ? 0 : edition.available);
          if (event) { localStorage.setItem(scenarioKey, "done"); publishNft(event); }
        }, 1800);
      }
    }
  }),
  http.post("/api/mock/realtime/nfts/:nftId", async ({ request, params }) => {
    const body = await request.json() as { editionId?: string; priceEth?: string; available?: number };
    const event = updateEdition(String(params.nftId), body.editionId ?? "default", body.priceEth ?? "", body.available ?? -1);
    if (!event) return HttpResponse.json({ message: "Atualização de NFT inválida." }, { status: 422 });
    publishNft(event);
    return HttpResponse.json(event);
  }),
  http.post("/api/mock/realtime/orders/:orderId/settle", async ({ request, params }) => {
    const user = authenticatedUser(request);
    if (!user) return authError();
    const order = settleOrderNow(user.id, String(params.orderId));
    return order ? HttpResponse.json(order) : HttpResponse.json({ message: "Pedido não encontrado." }, { status: 404 });
  }),
  http.post("/api/mock/realtime/disconnect", () => {
    for (const client of clients.keys()) client.close(1012, "Interrupção simulada");
    return HttpResponse.json({ disconnected: true });
  }),
  http.post("/api/mock/realtime/replay", async ({ request }) => {
    const body = await request.json() as { name?: string; payload?: NftUpdatedEvent | OrderUpdatedEvent };
    if (body.name === "nft.updated" && body.payload && "nftId" in body.payload) {
      publishNft(body.payload);
      return HttpResponse.json({ replayed: true });
    }
    if (body.name === "order.updated" && body.payload && "orderId" in body.payload) {
      const user = authenticatedUser(request);
      if (!user) return authError();
      publishOrder({ ...body.payload, userId: user.id });
      return HttpResponse.json({ replayed: true });
    }
    return HttpResponse.json({ message: "Evento inválido." }, { status: 422 });
  }),
];
