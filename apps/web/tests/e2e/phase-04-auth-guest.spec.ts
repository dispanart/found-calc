import { expect, test } from "@playwright/test";

const uniqueEmail = () => `phase04-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;

test("an unsaved localized draft survives ID to EN navigation without network persistence", async ({ page }) => {
  await page.goto("/id/calculators/discount");
  await page.getByLabel("Harga awal").fill("1.234,50");
  await page.getByLabel("Diskon 1").fill("10,5");

  await page.getByRole("link", { name: "Ganti bahasa: EN" }).click();
  await expect(page).toHaveURL(/\/en\/calculators\/discount$/);
  await expect(page.getByLabel("Starting price")).toHaveValue("1234.50");
  await expect(page.getByLabel("Discount 1")).toHaveValue("10.5000");
});

test("guest saved state is claimed on account creation, visible in workspace, loadable, and deletable", async ({ page }) => {
  const email = uniqueEmail();
  const password = "phase04-test-password";

  await page.goto("/en/calculators/discount");
  await page.getByLabel("Starting price").fill("100.00");
  await page.getByLabel("Discount 1").fill("10");
  await page.getByRole("button", { name: "Calculate discount" }).click();
  await page.getByTestId("save-draft").click();
  await expect(page.getByTestId("persistence-status")).toContainText("Draft saved");

  await page.goto("/en/auth");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Name").fill("Phase Four");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.locator("form").getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText(/preserv|saved draft/i);

  await page.goto("/en/workspace");
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await expect(page.getByTestId("workspace-state-reference.discount")).toContainText(/saved/i);

  await page.goto("/en/calculators/discount");
  await page.getByLabel("Starting price").fill("250.00");
  await page.getByTestId("load-draft").click();
  await expect(page.getByLabel("Starting price")).toHaveValue("100.00");
  await expect(page.getByTestId("persistence-status")).toContainText("loaded");

  await page.getByTestId("delete-draft").click();
  await expect(page.getByTestId("persistence-status")).toContainText("deleted");
  await page.getByTestId("load-draft").click();
  await expect(page.getByTestId("persistence-status")).toContainText("no saved draft");

  await page.goto("/en/auth");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByText("You are not signed in.")).toBeVisible();
});

test("signed-out workspace provides an auth path and remains usable at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/id/workspace");
  await expect(page.getByRole("link", { name: /masuk/i })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
