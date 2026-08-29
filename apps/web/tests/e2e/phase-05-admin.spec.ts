import { expect, test } from "@playwright/test";

test("admin core is localized and explains the synthetic-only boundary", async ({ page }) => {
  await page.goto("/id/admin");
  await expect(page.getByRole("heading", { level: 1, name: "Admin Found Calc" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Platform aturan berversi" })).toBeVisible();
  await expect(page.getByText(/Data sintetis saja/i)).toBeVisible();
  await expect(page.getByText(/Masuk dengan akun admin/i)).toBeVisible();

  await page.goto("/en/admin");
  await expect(page.getByRole("heading", { level: 1, name: "Found Calc admin" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Versioned rule platform" })).toBeVisible();
  await expect(page.getByText(/Synthetic data only/i)).toBeVisible();
  await expect(page.getByText(/Sign in with an admin account/i)).toBeVisible();
});

test("admin core has no horizontal overflow at 390 px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/admin");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
