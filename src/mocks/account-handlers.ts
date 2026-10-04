import { delay, http, HttpResponse } from "msw";
import { catalogNfts } from "@/features/catalog/catalog-data";

const users = [
  { id: "nova", name: "Nova", email: "nova@kurio.dev", passwordHash: "5967c16c2022d4e40c36c348638237f3846e004c5f74dcde8aa0373f383aa8d4" },
  { id: "sam", name: "Sam", email: "sam@kurio.dev", passwordHash: "1794910a2099d08098ee3aa6538ed7b896ce467562858a2fac23e928a7d220b7" },
];

function getUser(request: Request) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  return users.find((user) => token === `mock-session-${user.id}`);
}

function publicUser(user: (typeof users)[number]) {
  return { id: user.id, name: user.name, email: user.email };
}

function favoritesFor(userId: string) {
  try { return JSON.parse(localStorage.getItem(`kurio-favorites-${userId}`) ?? "[]") as string[]; }
  catch { return []; }
}

async function hashPassword(password: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const accountHandlers = [
  http.get("/api/session", ({ request }) => {
    const user = getUser(request);
    return HttpResponse.json({ user: user ? publicUser(user) : null });
  }),
  http.post("/api/session", async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string };
    const user = users.find((item) => item.email === body.email?.trim().toLowerCase());
    if (!user || await hashPassword(body.password ?? "") !== user.passwordHash) {
      return HttpResponse.json({ message: "E-mail ou senha inválidos." }, { status: 401 });
    }
    return HttpResponse.json({ token: `mock-session-${user.id}`, user: publicUser(user) });
  }),
  http.get("/api/favorites", ({ request }) => {
    const user = getUser(request);
    return user ? HttpResponse.json({ ids: favoritesFor(user.id) }) : HttpResponse.json({ message: "Entre para ver seus favoritos." }, { status: 401 });
  }),
  http.put("/api/favorites/:nftId", async ({ request, params }) => {
    await delay(350);
    const user = getUser(request);
    if (!user) return HttpResponse.json({ message: "Sessão necessária." }, { status: 401 });
    if (request.headers.get("X-Mock-Scenario") === "favorite-error") return HttpResponse.json({ message: "Falha temporária." }, { status: 503 });
    const nftId = String(params.nftId);
    if (!catalogNfts.some((nft) => nft.id === nftId)) return HttpResponse.json({ message: "NFT não encontrado." }, { status: 404 });
    const ids = [...new Set([...favoritesFor(user.id), nftId])];
    localStorage.setItem(`kurio-favorites-${user.id}`, JSON.stringify(ids));
    return HttpResponse.json({ ids });
  }),
  http.delete("/api/favorites/:nftId", async ({ request, params }) => {
    await delay(350);
    const user = getUser(request);
    if (!user) return HttpResponse.json({ message: "Sessão necessária." }, { status: 401 });
    if (request.headers.get("X-Mock-Scenario") === "favorite-error") return HttpResponse.json({ message: "Falha temporária." }, { status: 503 });
    const ids = favoritesFor(user.id).filter((id) => id !== params.nftId);
    localStorage.setItem(`kurio-favorites-${user.id}`, JSON.stringify(ids));
    return HttpResponse.json({ ids });
  }),
];
