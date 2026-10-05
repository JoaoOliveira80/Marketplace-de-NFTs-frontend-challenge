import { expect, test, type Page } from "@playwright/test";

async function resetDemo(page: Page) {
  await page.goto("/");
  await page.locator(".site-header__inner").waitFor({ state: "visible" });
  const resetSucceeded = await page.evaluate(async () => {
    const response = await fetch("/api/mock/reset", { method: "POST" });
    return response.ok;
  });
  expect(resetSucceeded).toBeTruthy();
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Digite seu e-mail").fill("nova@kurio.dev");
  await page.locator("#auth-password").fill("Kurio123!");
  await page.getByRole("main").getByRole("button", { name: "Entrar" }).click();
  await expect(page.locator(".marketplace-hero")).toBeVisible();
}

async function expectStableFullPage(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot(name, {
    animations: "disabled",
    caret: "hide",
    fullPage: true,
    scale: "css",
  });
}

test.beforeEach(async ({ page }) => resetDemo(page));

test("visual regression baseline: home", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".marketplace-hero")).toBeVisible();
  await expect(page.getByRole("link", { name: /Ver detalhes de Emerald Ape #042/ })).toBeVisible();
  await expectStableFullPage(page, "home.png");
});

test("visual regression baseline: NFT detail", async ({ page }) => {
  await page.goto("/nft/emerald-ape-0042");
  await expect(page.getByRole("heading", { name: "Emerald Ape #042" })).toBeVisible();
  await expectStableFullPage(page, "nft-detail.png");
});

test("visual regression baseline: cart", async ({ page }) => {
  await page.goto("/nft/emerald-ape-0042");
  await page.getByRole("button", { name: /COMPRAR|Comprar NFT/ }).first().click();
  await expect(page.getByRole("heading", { name: "Carrinho de NFTs" })).toBeVisible();
  await expect(page.locator(".cart-page__item")).toContainText("Emerald Ape #042");
  await expectStableFullPage(page, "cart.png");
});

test("visual regression baseline: checkout", async ({ page }) => {
  await signIn(page);
  await page.goto("/nft/emerald-ape-0042");
  await page.getByRole("button", { name: /COMPRAR|Comprar NFT/ }).first().click();
  await expect(page.getByRole("heading", { name: "Carrinho de NFTs" })).toBeVisible();
  await page.getByRole("button", { name: "Conectar e finalizar" }).click();
  await expect(page.getByRole("heading", { name: "Perfil do colecionador" })).toBeVisible();
  await expect(page.getByText("Reserva", { exact: true })).toBeVisible();
  await expectStableFullPage(page, "checkout.png");
});
