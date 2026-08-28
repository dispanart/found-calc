import { expect, test } from "@playwright/test";

test("ID and EN discovery expose the three Phase 03 reference calculators", async ({ page }) => {
  await page.goto("/id/calculators");
  await expect(page.getByRole("heading", { level: 1, name: /kalkulator/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Kalkulator Diskon Bertingkat/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Kalkulator Margin Bisnis/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Referensi Aturan Versi/i })).toBeVisible();

  await page.goto("/en/calculators");
  await expect(page.getByRole("heading", { level: 1, name: /calculators/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Stacked Discount Calculator/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Business Margin Calculator/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Versioned Rule Reference/i })).toBeVisible();
});

test("stacked discount preserves order and localized presentation", async ({ page }) => {
  await page.goto("/id/calculators/discount");
  await page.getByLabel("Harga awal").fill("100,00");
  await page.getByLabel("Diskon 1").fill("10");
  await page.getByRole("button", { name: "Tambah diskon" }).click();
  await page.getByLabel("Diskon 2").fill("20");
  await page.getByRole("button", { name: "Hitung diskon" }).click();

  const result = page.getByRole("status");
  await expect(result).toContainText("72,00");
  await expect(result).toContainText("28,00");
  await expect(result).toContainText("28,0000%");

  await page.getByRole("link", { name: "Ganti bahasa: EN" }).click();
  await expect(page).toHaveURL(/\/en\/calculators\/discount$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Stacked Discount Calculator/i);
});

test("business margin progresses from gross result to contribution and scenario", async ({ page }) => {
  await page.goto("/en/calculators/business-margin");
  await page.getByLabel("Selling price").fill("100.00");
  await page.getByLabel("Product cost").fill("60.00");
  await page.getByRole("button", { name: "Calculate margin" }).click();
  await expect(page.getByRole("status")).toContainText("40.00");
  await expect(page.getByRole("status")).toContainText("40.0000%");

  await page.getByLabel("Variable selling cost per order").fill("15.00");
  await page.getByRole("button", { name: "Calculate margin" }).click();
  await expect(page.getByRole("status")).toContainText("25.00");
  await expect(page.getByRole("status")).toContainText("25.0000%");

  await page.getByLabel("Scenario variable selling cost per order").fill("10.00");
  await page.getByRole("button", { name: "View scenario" }).click();
  await expect(page.getByText("Baseline")).toBeVisible();
  await expect(page.getByText("Scenario", { exact: true })).toBeVisible();
  await expect(page.getByText("Impact", { exact: true })).toBeVisible();
  await expect(page.getByTestId("scenario-impact")).toContainText("5.00");
});

test("synthetic rule reference requires an explicit date and exposes provenance", async ({ page }) => {
  await page.goto("/en/calculators/synthetic-rule-reference");
  await expect(page.getByText(/synthetic test fixture data/i)).toBeVisible();
  await page.getByLabel("Base amount").fill("100.00");
  await page.getByLabel("Effective date").fill("2025-06-01");
  await page.getByRole("button", { name: "Calculate reference" }).click();

  const result = page.getByRole("status");
  await expect(result).toContainText("5.00");
  await expect(result).toContainText("2025-a");
  await expect(result).toContainText("2025-01-01");
  await expect(result).toContainText("synthetic-reference-fixture");
});
