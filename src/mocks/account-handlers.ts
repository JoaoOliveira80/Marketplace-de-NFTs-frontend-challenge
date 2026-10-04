import { delay, http, HttpResponse } from "msw";
import { catalogNfts } from "@/features/catalog/catalog-data";

interface MockUser { id: string; name: string; email: string; passwordHash: string }
interface MockSession { userId: string; expiresAt: number }
interface MockError { message: string; code: string; fields?: Record<string, string> }

const USERS_KEY = "kurio-mock-users";
const SESSIONS_KEY = "kurio-mock-sessions";
const SESSION_DURATION_MS = 30 * 60 * 1000;

const seededUsers: MockUser[] = [
  { id: "nova", name: "Nova", email: "nova@kurio.dev", passwordHash: "5967c16c2022d4e40c36c348638237f3846e004c5f74dcde8aa0373f383aa8d4" },
  { id: "sam", name: "Sam", email: "sam@kurio.dev", passwordHash: "5967c16c2022d4e40c36c348638237f3846e004c5f74dcde8aa0373f383aa8d4" },
];

function readStored<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? "") as T; }
  catch { return fallback; }
}

function users(): MockUser[] {
  return [...seededUsers, ...readStored<MockUser[]>(USERS_KEY, [])];
}

function sessions(): Record<string, MockSession> {
  return readStored<Record<string, MockSession>>(SESSIONS_KEY, {});
}

function publicUser(user: MockUser) {
  return { id: user.id, name: user.name, email: user.email };
}

function authError(code = "SESSION_EXPIRED") {
  return HttpResponse.json<MockError>({ message: "Sua sessão expirou. Entre novamente para continuar.", code }, { status: 401 });
}

function tokenFrom(request: Request) {
  return request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
}

function authenticatedUser(request: Request): MockUser | null {
  const token = tokenFrom(request);
  const activeSessions = sessions();
  const active = activeSessions[token];
  if (!active) return null;
  if (request.headers.get("X-Mock-Scenario") === "session-expired" || active.expiresAt <= Date.now()) {
    delete activeSessions[token];
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(activeSessions));
    return null;
  }
  return users().find((user) => user.id === active.userId) ?? null;
}

function createSession(user: MockUser) {
  const token = crypto.randomUUID();
  const activeSessions = sessions();
  activeSessions[token] = { userId: user.id, expiresAt: Date.now() + SESSION_DURATION_MS };
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(activeSessions));
  return { token, user: publicUser(user) };
}

function favoritesFor(userId: string) {
  return readStored<string[]>(`kurio-favorites-${userId}`, []);
}

async function hashPassword(password: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function emailValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const accountHandlers = [
  http.get("/api/session", ({ request }) => {
    if (!tokenFrom(request)) return HttpResponse.json({ user: null });
    const user = authenticatedUser(request);
    return user ? HttpResponse.json({ user: publicUser(user) }) : authError();
  }),
  http.post("/api/session", async ({ request }) => {
    await delay(220);
    const body = await request.json() as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const user = users().find((item) => item.email === email);
    if (!user || await hashPassword(body.password ?? "") !== user.passwordHash) {
      return HttpResponse.json<MockError>({ message: "E-mail ou senha inválidos.", code: "INVALID_CREDENTIALS" }, { status: 401 });
    }
    return HttpResponse.json(createSession(user));
  }),
  http.post("/api/session/logout", ({ request }) => {
    const token = tokenFrom(request);
    const activeSessions = sessions();
    if (token && activeSessions[token]) {
      delete activeSessions[token];
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(activeSessions));
    }
    return HttpResponse.json({ success: true });
  }),
  http.post("/api/accounts", async ({ request }) => {
    await delay(220);
    const body = await request.json() as { name?: string; email?: string; password?: string; confirmPassword?: string };
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const fields: Record<string, string> = {};
    if (!/^[\p{L}\p{N}_ ]{3,24}$/u.test(name)) fields.name = "Use de 3 a 24 letras, números, espaços ou _.";
    if (!emailValid(email)) fields.email = "Informe um e-mail válido.";
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      fields.password = "Use 8 caracteres ou mais, com maiúscula, minúscula e número.";
    }
    if (password !== body.confirmPassword) fields.confirmPassword = "As senhas não coincidem.";
    if (Object.keys(fields).length) return HttpResponse.json<MockError>({ message: "Revise os campos indicados.", code: "VALIDATION_ERROR", fields }, { status: 422 });
    if (users().some((user) => user.email === email || user.name.toLowerCase() === name.toLowerCase())) {
      return HttpResponse.json<MockError>({
        message: "Este e-mail ou nome de usuário já está em uso.",
        code: "ACCOUNT_CONFLICT",
        fields: { [users().some((user) => user.email === email) ? "email" : "name"]: "Já cadastrado." },
      }, { status: 409 });
    }
    const user: MockUser = { id: crypto.randomUUID(), name, email, passwordHash: await hashPassword(password) };
    const registered = readStored<MockUser[]>(USERS_KEY, []);
    localStorage.setItem(USERS_KEY, JSON.stringify([...registered, user]));
    return HttpResponse.json(createSession(user), { status: 201 });
  }),
  http.get("/api/favorites", ({ request }) => {
    const user = authenticatedUser(request);
    if (!user) return authError();
    const ids = favoritesFor(user.id);
    return HttpResponse.json({ ids, items: catalogNfts.filter((nft) => ids.includes(nft.id)) });
  }),
  http.put("/api/favorites/:nftId", async ({ request, params }) => {
    await delay(350);
    const user = authenticatedUser(request);
    if (!user) return authError();
    if (request.headers.get("X-Mock-Scenario") === "favorite-error") return HttpResponse.json({ message: "Falha temporária." }, { status: 503 });
    const nftId = String(params.nftId);
    if (!catalogNfts.some((nft) => nft.id === nftId)) return HttpResponse.json({ message: "NFT não encontrado." }, { status: 404 });
    const ids = [...new Set([...favoritesFor(user.id), nftId])];
    localStorage.setItem(`kurio-favorites-${user.id}`, JSON.stringify(ids));
    return HttpResponse.json({ ids });
  }),
  http.delete("/api/favorites/:nftId", async ({ request, params }) => {
    await delay(350);
    const user = authenticatedUser(request);
    if (!user) return authError();
    if (request.headers.get("X-Mock-Scenario") === "favorite-error") return HttpResponse.json({ message: "Falha temporária." }, { status: 503 });
    const ids = favoritesFor(user.id).filter((id) => id !== params.nftId);
    localStorage.setItem(`kurio-favorites-${user.id}`, JSON.stringify(ids));
    return HttpResponse.json({ ids });
  }),
];
