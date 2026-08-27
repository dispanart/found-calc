import { expect, test } from "@playwright/test";

test("root redirects to the Indonesian launch locale", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/id$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/keputusan/i);
});

test("public shells render native Indonesian and English copy", async ({ page }) => {
  await page.goto("/id");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/keputusan/i);
  await expect(page.getByRole("link", { name: /Ganti bahasa: EN/i })).toBeVisible();

  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/decision/i);
  await expect(page.getByRole("link", { name: /Change language: ID/i })).toBeVisible();
});

test("workspace and admin route groups keep stable locale URLs", async ({ page }) => {
  await page.goto("/id/workspace");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Ruang kerja/i);

  await page.goto("/en/admin");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Found Calc admin/i);
});

test("public shell keeps its primary content usable at a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Change language: ID/i })).toBeVisible();

  const hasPageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasPageOverflow).toBe(false);
});
