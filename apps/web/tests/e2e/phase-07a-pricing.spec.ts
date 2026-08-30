import { expect, test } from "@playwright/test";

test("Phase 07A pricing is localized, keyboard-focusable, and overflow-safe at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/id/pricing");

  await expect(page.getByRole("heading", { level: 1, name: "Semua kalkulator tetap gratis. Upgrade ketika Anda membutuhkan lebih." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Friends" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Besties" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Family" })).toBeVisible();
  await expect(page.getByText("Rp24.900", { exact: false })).toBeVisible();
  await expect(page.getByText("Rp199.000", { exact: false })).toBeVisible();
  await expect(page.getByText("Rp59.000", { exact: false })).toBeVisible();
  await expect(page.getByText("Rp499.000", { exact: false })).toBeVisible();
  await expect(page.getByText(/Widget Platform.*belum tersedia/i)).toBeVisible();

  const trialLink = page.getByRole("link", { name: /Coba Besties gratis 14 hari/i });
  await trialLink.focus();
  await expect(trialLink).toBeFocused();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);

  await page.goto("/en/pricing");
  await expect(page.getByRole("heading", { level: 1, name: "Calculate for free. Upgrade when you need more." })).toBeVisible();
  await expect(page.getByText(/Widget Platform.*not yet available/i)).toBeVisible();
});