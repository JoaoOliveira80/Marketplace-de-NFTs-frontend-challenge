import { delay, http, HttpResponse } from "msw";
import { catalogNfts } from "@/features/catalog/catalog-data";

interface MockUser { id: string; name: string; email: string; passwordHash: string; username?: string; ensName?: string; walletNickname?: string; avatar?: string | null }
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
  const stored = readStored<MockUser[]>(USERS_KEY, []);
  return [...seededUsers.map((seed) => stored.find((entry) => entry.id === seed.id) ?? seed), ...stored.filter((entry) => !seededUsers.some((seed) => seed.id === entry.id))];
}

function saveUser(user: MockUser) {
  const stored = readStored<MockUser[]>(USERS_KEY, []);
  localStorage.setItem(USERS_KEY, JSON.stringify([...stored.filter((entry) => entry.id !== user.id), user]));
}

function sessions(): Record<string, MockSession> {
  return readStored<Record<string, MockSession>>(SESSIONS_KEY, {});
}

function publicUser(user: MockUser) {
  return { id: user.id, name: user.name, email: user.email };
}

export function authError(code = "SESSION_EXPIRED") {
  return HttpResponse.json<MockError>({ message: "Sua sessão expirou. Entre novamente para continuar.", code }, { status: 401 });
}

export function tokenFrom(request: Request) {
  return request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
}

export function authenticatedUser(request: Request): MockUser | null {
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
      const walletKey = `kurio-wallet-state-${activeSessions[token].userId}`;
      try {
        const wallets = JSON.parse(localStorage.getItem(walletKey) ?? "") as { wallets?: unknown[]; connectedWalletId?: string | null };
        if (Array.isArray(wallets.wallets)) localStorage.setItem(walletKey, JSON.stringify({ ...wallets, connectedWalletId: null, connectedProvider: null }));
      } catch { /* No saved wallet connection. */ }
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
    if (users().some((user) => user.email === email || (user.username ?? user.name.toLowerCase()) === name.toLowerCase())) {
      return HttpResponse.json<MockError>({
        message: "Este e-mail ou nome de usuário já está em uso.",
        code: "ACCOUNT_CONFLICT",
        fields: { [users().some((user) => user.email === email) ? "email" : "name"]: "Já cadastrado." },
      }, { status: 409 });
    }
    const user: MockUser = { id: crypto.randomUUID(), name, username: name.toLowerCase(), email, passwordHash: await hashPassword(password) };
    saveUser(user);
    return HttpResponse.json(createSession(user), { status: 201 });
  }),
  http.get("/api/profile", async ({ request }) => {
    await delay(160);
    const user = authenticatedUser(request);
    if (!user) return authError();
    if (request.headers.get("X-Mock-Scenario") === "profile-error") return HttpResponse.json({ message: "Perfil temporariamente indisponível." }, { status: 503 });
    return HttpResponse.json({ displayName: user.name, username: user.username ?? user.name.toLowerCase(), email: user.email,
      ensName: user.ensName ?? "", walletNickname: user.walletNickname ?? "", avatar: user.avatar ?? null });
  }),
  http.put("/api/profile", async ({ request }) => {
    await delay(220);
    const user = authenticatedUser(request);
    if (!user) return authError();
    if (request.headers.get("X-Mock-Scenario") === "profile-error") return HttpResponse.json({ message: "Não foi possível salvar o perfil." }, { status: 503 });
    const input = await request.json() as { displayName?: string; username?: string; email?: string; ensName?: string; walletNickname?: string; avatar?: string | null };
    const displayName = input.displayName?.trim() ?? "";
    const username = input.username?.trim().toLowerCase() ?? "";
    const email = input.email?.trim().toLowerCase() ?? "";
    const ensName = input.ensName?.trim().toLowerCase() ?? "";
    const walletNickname = input.walletNickname?.trim() ?? "";
    const fields: Record<string, string> = {};
    if (displayName.length < 2 || displayName.length > 50) fields.displayName = "Use de 2 a 50 caracteres.";
    if (!/^[\p{L}\p{N}_]{3,24}$/u.test(username)) fields.username = "Use de 3 a 24 letras, números ou _.";
    if (!emailValid(email)) fields.email = "Informe um e-mail válido.";
    if (!/^[a-z0-9.-]{3,63}$/.test(ensName)) fields.ensName = "Informe um nome ENS válido, sem .eth.";
    if (walletNickname.length < 2 || walletNickname.length > 40) fields.walletNickname = "Use de 2 a 40 caracteres.";
    if (input.avatar !== null && input.avatar !== undefined && (!/^data:image\/(png|jpeg|webp);base64,/.test(input.avatar) || input.avatar.length > 700_000)) fields.avatar = "Use PNG, JPG ou WebP de até 500 KB.";
    if (Object.keys(fields).length) return HttpResponse.json({ message: "Revise os campos indicados.", code: "VALIDATION_ERROR", fields }, { status: 422 });
    const conflict = users().find((entry) => entry.id !== user.id && (entry.email === email || (entry.username ?? entry.name.toLowerCase()) === username));
    if (conflict) return HttpResponse.json({ message: "E-mail ou nome de usuário já cadastrado.", code: "PROFILE_CONFLICT",
      fields: { [conflict.email === email ? "email" : "username"]: "Já cadastrado." } }, { status: 409 });
    saveUser({ ...user, name: displayName, username, email, ensName, walletNickname, avatar: input.avatar ?? null });
    return HttpResponse.json({ displayName, username, email, ensName, walletNickname, avatar: input.avatar ?? null });
  }),
  http.put("/api/profile/password", async ({ request }) => {
    await delay(220);
    const user = authenticatedUser(request);
    if (!user) return authError();
    if (request.headers.get("X-Mock-Scenario") === "profile-error") return HttpResponse.json({ message: "Não foi possível alterar a senha." }, { status: 503 });
    const input = await request.json() as { currentPassword?: string; newPassword?: string; confirmPassword?: string };
    const fields: Record<string, string> = {};
    if (await hashPassword(input.currentPassword ?? "") !== user.passwordHash) fields.currentPassword = "Senha atual incorreta.";
    if (!input.newPassword || input.newPassword.length < 8 || !/[A-Z]/.test(input.newPassword) || !/[a-z]/.test(input.newPassword) || !/\d/.test(input.newPassword)) fields.newPassword = "Use 8 caracteres ou mais, com maiúscula, minúscula e número.";
    if (input.confirmPassword !== input.newPassword) fields.confirmPassword = "As senhas não coincidem.";
    if (Object.keys(fields).length) return HttpResponse.json({ message: "Não foi possível alterar a senha.", code: "PASSWORD_VALIDATION", fields }, { status: 422 });
    saveUser({ ...user, passwordHash: await hashPassword(input.newPassword ?? "") });
    return HttpResponse.json({ success: true });
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
