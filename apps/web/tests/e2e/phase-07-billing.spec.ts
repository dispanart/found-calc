import { expect, test, type Page } from "@playwright/test";

const password = "phase07-test-password";
const uniqueEmail = () => `phase07-billing-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;

async function createAccount(page: Page) {
  await page.goto("/en/auth");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Name").fill("Phase Seven Billing");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill(password);
  await page.locator("form").getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

const activeBilling = (cancellationPending = false) => ({
  billing: {
    available: true,
    plans: [{
      id: "fixture-pro",
      displayName: { id: "Fixture Pro", en: "Fixture Pro" },
      description: { id: "Plan pengujian saja", en: "Testing-only plan" },
      amount: 10000,
      currency: "IDR",
      interval: "MONTH",
      intervalCount: 1,
    }],
    subscription: {
      planId: "fixture-pro",
      status: "active",
      latestCycleStatus: "SUCCEEDED",
      nextCycleAt: null,
      cancellationPending,
    },
    checkoutPending: false,
    entitlements: ["fixture.export"],
  },
});

test("billing workspace renders first-party active state and cancellation pending without provider identity", async ({ page }) => {
  await createAccount(page);
  let cancelled = false;
  await page.route("**/api/billing/status", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(activeBilling(cancelled)),
  }));
  await page.route("**/api/billing/subscription/cancel", async (route) => {
    expect(route.request().postDataJSON()).toEqual({});
    cancelled = true;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ subscription: { planId: "fixture-pro", status: "active", cancellationPending: true } }) });
  });

  await page.goto("/en/workspace/billing");
  await expect(page.getByRole("heading", { level: 1, name: "Billing and access" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Access active" })).toBeVisible();
  await expect(page.getByTestId("billing-entitlements").getByText("fixture.export")).toBeVisible();
  await expect(page.getByText("Testing-only plan", { exact: true })).toBeVisible();
  await expect(page.getByText(/Returning to this page does not activate access/i)).toBeVisible();
  await page.getByRole("button", { name: "Cancel subscription" }).click();
  await expect(page.getByText(/Cancellation has been requested/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Access active" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel subscription" })).toHaveCount(0);
});

test("billing unavailable state is localized and overflow-safe at 390px", async ({ page }) => {
  await createAccount(page);
  await page.route("**/api/billing/status", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ billing: { available: false, plans: [], subscription: null, checkoutPending: false, entitlements: [] } }),
  }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/id/workspace/billing");
  await expect(page.getByRole("heading", { level: 1, name: "Billing dan akses" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Billing belum tersedia" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
