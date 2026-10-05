import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.locator(".site-header__inner").waitFor({ state: "visible" });
  const resetSucceeded = await page.evaluate(async () => {
    const response = await fetch("/api/mock/reset", { method: "POST" });
    return response.ok;
  });
  expect(resetSucceeded).toBeTruthy();
});

test("catalog search and sort are represented in the URL", async ({ page }) => {
  await page.goto("/?q=Emerald%20Ape&sort=price-asc");

  await expect(page.getByRole("link", { name: /Ver detalhes de Emerald Ape #042/ })).toBeVisible();
  await expect(page.locator(".catalog-sort select")).toHaveValue("price-asc");
  await expect(page).toHaveURL(/q=Emerald%20Ape/);
});

test("empty and failed catalog scenarios show distinct recoverable states", async ({ page }) => {
  await page.goto("/?mock=empty");
  await expect(page.getByRole("heading", { name: "Nenhum NFT encontrado" })).toBeVisible();

  await page.goto("/?mock=error");
  await expect(page.getByRole("alert").getByRole("heading", { name: "Não foi possível carregar os NFTs" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
});

test("detail supports direct navigation, gallery, and missing NFTs", async ({ page }) => {
  await page.goto("/nft/emerald-ape-0042");
  await expect(page.getByRole("heading", { name: "Emerald Ape #042" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Escolha a edição" })).toBeVisible();

  await page.goto("/nft/does-not-exist");
  await expect(page.getByRole("heading", { name: "NFT não encontrado" })).toBeVisible();
});

test("adding an NFT and applying a coupon persists in the cart", async ({ page }) => {
  await page.goto("/nft/emerald-ape-0042");
  await page.getByRole("button", { name: /COMPRAR|Comprar NFT/ }).first().click();

  await expect(page.getByRole("heading", { name: "Carrinho de NFTs" })).toBeVisible();
  await expect(page.locator(".cart-page__item")).toContainText("Emerald Ape #042");
  await page.getByLabel("Código promocional").fill("KURIO10");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("Cupom KURIO10 aplicado")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Cupom KURIO10 aplicado")).toBeVisible();
});

test("checkout requires a session and preserves its return path", async ({ page }) => {
  await page.goto("/checkout");

  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await expect(page).toHaveURL(/login\?.*returnTo/);
});

test("production preview: direct detail route serves its responsive NFT artwork", async ({ page }) => {
  await page.goto("/nft/emerald-ape-0042");

  await expect(page.getByRole("heading", { name: "Emerald Ape #042" })).toBeVisible();
  const artwork = page.getByAltText("Visão completa de Emerald Ape #042");
  await expect(artwork).toBeVisible();
  await expect.poll(() => artwork.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
});
