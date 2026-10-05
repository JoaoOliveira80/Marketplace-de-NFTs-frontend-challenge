import { expect, test, type Page } from "@playwright/test";

async function resetDemo(page: Page) {
  await page.goto("/");
  await page.locator(".site-header__inner").waitFor({ state: "visible" });
  expect(await page.evaluate(async () => (await fetch("/api/mock/reset", { method: "POST" })).ok)).toBeTruthy();
}

async function signIn(page: Page, email = "nova@kurio.dev", password = "Kurio123!") {
  await page.goto("/login");
  await page.getByLabel("Digite seu e-mail").fill(email);
  await page.locator("#auth-password").fill(password);
  await page.getByRole("main").getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator(".marketplace-hero")).toBeVisible();
}

async function addEmerald(page: Page) {
  await page.goto("/nft/emerald-ape-0042");
  await expect(page.getByRole("heading", { name: "Emerald Ape #042" })).toBeVisible();
  await page.getByRole("button", { name: /COMPRAR|Comprar NFT/ }).first().click();
  await expect(page.getByRole("heading", { name: "Carrinho de NFTs" })).toBeVisible();
}

async function openCheckout(page: Page, mock?: string) {
  await page.goto(`/checkout${mock ? `?mock=${mock}` : ""}`);
  await expect(page.getByRole("heading", { name: "Perfil do colecionador" })).toBeVisible();
  await page.getByRole("button", { name: /Reserva/ }).click();
  await page.locator("#checkout-display-name").fill("Nova Kurio");
  await page.locator("#checkout-username").fill("nova");
  await page.locator("#checkout-profile-name").fill("Coleção Nova");
  await page.locator("#checkout-wallet-address").fill("nova.kurio.eth");
  await page.locator("#checkout-wallet-type").selectOption("Coinbase Wallet");
  await page.locator("#checkout-referral").fill("KURIO2026");
  await page.locator("#checkout-email").fill("nova@kurio.dev");
  await page.locator("#checkout-ens").fill("nova-kurio");
  await page.getByRole("button", { name: "Conectar carteira" }).click();
  if (mock === "wallet-refused") {
    await expect(page.getByRole("alert")).toContainText("Conexão recusada");
    return;
  }
  await expect(page.locator(".checkout-wallets__connection")).toContainText("Reserva conectada");
}

async function completeOrderReview(page: Page) {
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByRole("heading", { name: "Revisão da compra" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar revisão" }).click();
  await expect(page.getByRole("button", { name: "Enviar pedido" })).toBeVisible();
}

test.beforeEach(async ({ page }) => resetDemo(page));

test("authentication validates registration, rejects conflicts, and restores session after refresh", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Nome de usuário").fill("Nova pessoa");
  await page.getByLabel("Digite seu e-mail").fill("nova@kurio.dev");
  await page.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await page.getByLabel("Confirmar senha").fill("Kurio123!");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("alert")).toContainText("já está em uso");

  await signIn(page);
  await page.reload();
  await expect(page.locator(".marketplace-hero")).toBeVisible();
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Perfil do colecionador" })).toBeVisible();
  await expect(page.locator("#profile-email")).toHaveValue("nova@kurio.dev");
});

test("a valid registration creates a session and opens the collector profile", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Nome de usuário").fill("Kai Collector");
  await page.getByLabel("Digite seu e-mail").fill("kai.e2e@kurio.dev");
  await page.getByLabel("Senha", { exact: true }).fill("Collector123!");
  await page.getByLabel("Confirmar senha").fill("Collector123!");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.locator(".marketplace-hero")).toBeVisible();
  await page.goto("/profile");
  await expect(page.locator("#profile-email")).toHaveValue("kai.e2e@kurio.dev");
});

test("expired sessions return to login and preserve the requested page", async ({ page }) => {
  await signIn(page);
  await page.goto("/profile?mock=session-expired");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Sua sessão expirou");
  await expect(page).toHaveURL(/returnTo=%2Fprofile/);
});

test("favorite mutation persists on success and rolls back when the API fails", async ({ page }) => {
  await signIn(page);
  await page.goto("/nft/emerald-ape-0042");
  const favorite = page.getByRole("button", { name: "Adicionar aos favoritos" }).last();
  const favoriteSaved = page.waitForResponse((response) => response.url().endsWith("/api/favorites/emerald-ape-0042") && response.status() === 200);
  await favorite.click();
  await favoriteSaved;
  await expect(page.getByRole("button", { name: "Remover dos favoritos" }).last()).toHaveAttribute("aria-pressed", "true");
  await page.goto("/favorites");
  await expect(page.getByRole("heading", { name: "Meus favoritos" })).toBeVisible();
  await expect(page.getByText("Emerald Ape #042")).toBeVisible();

  await page.goto("/nft/emerald-ape-0042?mock=favorite-error");
  const removeFavorite = page.getByRole("button", { name: "Remover dos favoritos" }).last();
  const favoriteRejected = page.waitForResponse((response) => response.url().endsWith("/api/favorites/emerald-ape-0042") && response.status() === 503);
  await removeFavorite.click();
  await favoriteRejected;
  await expect(page.getByRole("alert")).toContainText("Não foi possível atualizar os favoritos");
  await expect(page.getByRole("button", { name: "Remover dos favoritos" }).last()).toHaveAttribute("aria-pressed", "true");
});

test("logout clears the session and a second user cannot see the first user's favorites", async ({ page }) => {
  await signIn(page);
  await page.goto("/nft/emerald-ape-0042");
  const saved = page.waitForResponse((response) => response.url().endsWith("/api/favorites/emerald-ape-0042") && response.status() === 200);
  await page.getByRole("button", { name: "Adicionar aos favoritos" }).last().click();
  await saved;
  await page.goto("/profile");
  await page.getByLabel("Meu perfil").getByRole("button", { name: "Sair" }).click();
  await expect(page.locator(".marketplace-hero")).toBeVisible();
  await signIn(page, "sam@kurio.dev");
  await page.goto("/favorites");
  await expect(page.getByText("Você ainda não salvou nenhum NFT.")).toBeVisible();
});

test("guest cart quantity, coupon, refresh, and login merge preserve the purchase", async ({ page }) => {
  await addEmerald(page);
  const quantity = page.getByRole("group", { name: /Quantidade de Emerald Ape/ });
  await quantity.getByRole("button", { name: /Aumentar/ }).click();
  await expect(quantity).toContainText("2");
  await page.goto("/nft/violet-nomad-0314");
  await page.getByRole("button", { name: /COMPRAR|Comprar NFT/ }).first().click();
  const violetRow = page.locator(".cart-page__item").filter({ hasText: "Violet Nomad #314" });
  await expect(violetRow).toBeVisible();
  await violetRow.getByRole("button", { name: /Remover Violet Nomad/ }).click();
  await expect(violetRow).toHaveCount(0);
  await expect(page.locator(".cart-page__item")).toHaveCount(1);

  await page.getByLabel("Código promocional").fill("INVÁLIDO");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByRole("alert")).toContainText("Código promocional inválido");
  await page.getByLabel("Código promocional").fill("KURIO10");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("Cupom KURIO10 aplicado")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Cupom KURIO10 aplicado")).toBeVisible();
  await page.getByRole("button", { name: "Conectar e finalizar" }).click();
  await page.getByLabel("Digite seu e-mail").fill("nova@kurio.dev");
  await page.locator("#auth-password").fill("Kurio123!");
  await page.getByRole("main").getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Perfil do colecionador" })).toBeVisible();
  await expect(page.locator(".checkout-summary__item")).toContainText("Emerald Ape #042");
  await expect(page.getByText("Cupom KURIO10 aplicado")).toBeVisible();
});

test("profile and wallet edits persist after refresh, with field validation", async ({ page }) => {
  await signIn(page);
  await page.goto("/profile");
  await page.locator("#profile-displayName").fill("Nova Colecionadora");
  await page.locator("#profile-ensName").fill("nova-kurio");
  await page.locator("#profile-walletNickname").fill("Carteira Nova");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Perfil salvo.")).toBeVisible();
  await page.reload();
  await expect(page.locator("#profile-displayName")).toHaveValue("Nova Colecionadora");

  await page.goto("/wallets");
  await page.locator("#wallet-primary-network").selectOption("");
  await page.getByRole("button", { name: "Salvar carteira" }).first().click();
  await expect(page.locator("#wallet-primary-network")).toHaveAttribute("aria-invalid", "true");
  await page.locator("#wallet-primary-network").selectOption("Ethereum");
  await page.locator("#wallet-primary-nickname").fill("Reserva Principal");
  await page.locator("#wallet-primary-referralCode").fill("KURIO2026");
  await page.getByRole("button", { name: "Salvar carteira" }).first().click();
  await expect(page.getByRole("status").filter({ hasText: "Carteira salva." })).toBeVisible();
  await page.reload();
  await expect(page.locator("#wallet-primary-nickname")).toHaveValue("Reserva Principal");

  await page.goto("/profile");
  await page.locator("#profile-ensName").fill("");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.locator("#profile-ensName")).toHaveAttribute("aria-invalid", "true");
  await page.locator("#profile-ensName").fill("nova-kurio");
  await page.locator("#profile-avatar").setInputFiles("public/nfts/emerald-ape-500.webp");
  await expect(page.getByAltText("Avatar atual")).toBeVisible();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Perfil salvo.")).toBeVisible();
  await page.locator("#profile-currentPassword").fill("Kurio123!");
  await page.locator("#profile-newPassword").fill("Kurio456!");
  await page.locator("#profile-confirmPassword").fill("Kurio456!");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Senha alterada.")).toBeVisible();
  await page.getByLabel("Meu perfil").getByRole("button", { name: "Sair" }).click();
  await signIn(page, "nova@kurio.dev", "Kurio456!");
});

test("wallet refusal blocks checkout until a wallet connects", async ({ page }) => {
  await signIn(page);
  await addEmerald(page);
  await openCheckout(page, "wallet-refused");
  await expect(page.getByRole("alert")).toContainText("Conexão recusada");
  await expect(page.getByRole("button", { name: "Confirmar compra" })).toBeDisabled();
});

test("confirmed purchase creates a receipt once and only then empties the cart", async ({ page }) => {
  await signIn(page);
  await addEmerald(page);
  await openCheckout(page);
  await completeOrderReview(page);
  let orderPosts = 0;
  page.on("request", (request) => { if (request.method() === "POST" && new URL(request.url()).pathname === "/api/orders") orderPosts += 1; });
  await page.getByRole("button", { name: "Enviar pedido" }).dblclick();
  await expect(page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira" })).toBeVisible({ timeout: 10_000 });
  expect(orderPosts).toBe(1);
  await expect(page.getByText("Emerald Ape #042")).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Seu carrinho está vazio" })).toBeVisible();
});

test("refused order keeps the cart available for another attempt", async ({ page }) => {
  await signIn(page);
  await addEmerald(page);
  await openCheckout(page, "order-refused");
  await completeOrderReview(page);
  await page.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page.getByRole("heading", { name: "Pagamento recusado" })).toBeVisible({ timeout: 10_000 });
  await page.goto("/cart");
  await expect(page.locator(".cart-page__item")).toContainText("Emerald Ape #042");
});

test("order timeout recovers the same request instead of creating a duplicate", async ({ page }) => {
  await signIn(page);
  await addEmerald(page);
  await openCheckout(page, "order-timeout");
  await completeOrderReview(page);
  await page.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira" })).toBeVisible({ timeout: 15_000 });
});

test("pending order survives reload and settles through the authenticated realtime event", async ({ page }) => {
  await signIn(page);
  await addEmerald(page);
  await openCheckout(page, "order-pending");
  await completeOrderReview(page);
  await page.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page.getByRole("heading", { name: "Pedido em andamento" })).toBeVisible();
  const orderId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.reload();
  await expect(page.getByRole("heading", { name: "Pedido em andamento" })).toBeVisible();
  expect(await page.evaluate(async (id) => {
    const token = localStorage.getItem("kurio-session-token");
    const response = await fetch(`/api/mock/realtime/orders/${id}/settle`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    return response.ok;
  }, orderId)).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Seus NFTs agora estão na sua carteira" })).toBeVisible({ timeout: 10_000 });
});

test("realtime price changes the checkout quote and requires a fresh review", async ({ page }) => {
  await signIn(page);
  await addEmerald(page);
  await openCheckout(page, "realtime-price");
  await expect(page.getByRole("alert")).toContainText("O preço ou a disponibilidade de um NFT mudou", { timeout: 8_000 });
  await expect(page.getByRole("heading", { name: "Revisão da compra" })).toHaveCount(0);
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByRole("heading", { name: "Revisão da compra" })).toBeVisible();
});

test("realtime sellout invalidates the checkout quote and prevents a review", async ({ page }) => {
  await signIn(page);
  await addEmerald(page);
  await openCheckout(page, "realtime-sold-out");
  await expect(page.locator("#checkout-quote-message")).toContainText("O preço ou a disponibilidade de um NFT mudou", { timeout: 8_000 });
  await expect(page.getByText(/apenas 0 disponível/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar compra" })).toBeDisabled();
});

test("Socket.IO ignores duplicate and stale NFT events, then reconciles after reconnect", async ({ page }) => {
  await page.goto("/nft/emerald-ape-0042");
  await expect(page.getByRole("heading", { name: "Emerald Ape #042" })).toBeVisible();
  const visiblePrice = page.locator(".nft-detail__desktop-price strong:visible, .nft-detail__mobile-buy strong:visible");
  const publish = (priceEth: string, available: number) => page.evaluate(async ({ priceEth, available }) => {
    const response = await fetch("/api/mock/realtime/nfts/emerald-ape-0042", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editionId: "fifty", priceEth, available }),
    });
    return await response.json() as { eventId: string; nftId: string; editionId: string; version: number; priceEth: string; available: number };
  }, { priceEth, available });
  const first = await publish("1.39", 7);
  await expect(visiblePrice).toHaveText("1.39 ETH");
  const replay = (payload: typeof first) => page.evaluate(async (event) => {
    const response = await fetch("/api/mock/realtime/replay", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "nft.updated", payload: event }),
    });
    return response.ok;
  }, payload);
  expect(await replay(first)).toBeTruthy();
  expect(await replay({ ...first, eventId: "stale-copy", version: first.version - 1, priceEth: "1.09" })).toBeTruthy();
  await expect(visiblePrice).toHaveText("1.39 ETH");

  await page.evaluate(async () => { await fetch("/api/mock/realtime/disconnect", { method: "POST" }); });
  await page.waitForTimeout(1300);
  await publish("1.59", 6);
  await expect(visiblePrice).toHaveText("1.59 ETH", { timeout: 8_000 });
});

test("keyboard validation focuses the first invalid checkout field", async ({ page }) => {
  await signIn(page);
  await addEmerald(page);
  await openCheckout(page);
  await page.locator("#checkout-display-name").fill("");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alert")).toContainText("Preencha o nome de exibição");
  await expect(page.locator("#checkout-display-name")).toBeFocused();
});

test("catalog exposes a loading skeleton and a retryable error state", async ({ page }) => {
  let catalogRequests = 0;
  page.on("request", (request) => { if (new URL(request.url()).pathname === "/api/nfts") catalogRequests += 1; });
  await page.goto("/?mock=slow");
  await expect(page.locator(".shimmer").first()).toBeVisible();
  await page.goto("/?mock=retry-once");
  await expect(page.getByRole("alert").getByRole("heading", { name: "Não foi possível carregar os NFTs" })).toBeVisible();
  const attemptsBeforeRetry = catalogRequests;
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect.poll(() => catalogRequests).toBeGreaterThan(attemptsBeforeRetry);
  await expect(page.getByRole("link", { name: /Ver detalhes de Emerald Ape #042/ })).toBeVisible();
});

test("catalog combines filters and browser history restores the previous URL state", async ({ page }) => {
  await page.goto("/");
  const mobile = (page.viewportSize()?.width ?? 1440) <= 640;
  if (mobile) await page.getByRole("button", { name: "Filtros" }).click();
  const filters = mobile ? page.getByRole("dialog", { name: "Filtros do catálogo" }) : page.getByLabel("Filtros do catálogo");
  await filters.getByRole("button", { name: /Arte digital/ }).click();
  await expect(page).toHaveURL(/category=Arte(\+|%20)digital/);
  await filters.getByRole("button", { name: /Ethereum/ }).click();
  await expect(page).toHaveURL(/network=Ethereum/);
  await page.goBack();
  await expect(page).not.toHaveURL(/network=/);
  await expect(page).toHaveURL(/category=Arte(\+|%20)digital/);

  await page.goto("/");
  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.goBack();
  await expect(page).not.toHaveURL(/page=2/);
});

test("gallery zoom traps keyboard focus and returns it to the trigger on close", async ({ page }) => {
  await page.goto("/nft/emerald-ape-0042");
  const trigger = page.getByRole("button", { name: "Ampliar imagem" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Imagem ampliada" });
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole("button", { name: "Fechar imagem ampliada" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
