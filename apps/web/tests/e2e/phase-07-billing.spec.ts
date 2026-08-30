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
  await expect(page).toHaveURL(/\/en\/workspace$/);
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
      pendingPlanId: null,
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


test("billing lifecycle keeps pending, past-due, and inactive states entitlement-free", async ({ page }) => {
  await createAccount(page);
  const plan = {
    id: "fixture-pro",
    displayName: { id: "Fixture Pro", en: "Fixture Pro" },
    description: { id: "Plan pengujian saja", en: "Testing-only plan" },
    amount: 10000,
    currency: "IDR",
    interval: "MONTH",
    intervalCount: 1,
  };
  const state = (status: "past_due" | "inactive" | null, checkoutPending = false) => ({
    billing: {
      available: true,
      plans: [plan],
      subscription: status === null ? null : {
        planId: "fixture-pro",
        status,
        latestCycleStatus: null,
        nextCycleAt: null,
        cancellationPending: false,
        pendingPlanId: null,
      },
      checkoutPending,
      entitlements: [],
    },
  });
  let current = state(null, true);
  await page.route("**/api/billing/status", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(current),
  }));

  await page.goto("/id/workspace/billing");
  await expect(page.getByRole("heading", { name: "Menunggu konfirmasi" })).toBeVisible();
  await expect(page.getByText("Tidak ada entitlement berbayar aktif.", { exact: true })).toBeVisible();

  current = state("past_due");
  await page.goto("/en/workspace/billing");
  await expect(page.getByRole("heading", { name: "Payment needs attention" })).toBeVisible();
  await expect(page.getByText("No paid entitlement is active.", { exact: true })).toBeVisible();

  current = state("inactive");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Subscription inactive" })).toBeVisible();
  await expect(page.getByText("No paid entitlement is active.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to Xendit" }).first()).toBeEnabled();
});


test("checkout is keyboard operable and hands localized plan choice to the hosted Xendit URL", async ({ page }) => {
  await createAccount(page);
  await page.route("**/api/billing/status", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
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
        subscription: null,
        checkoutPending: false,
        entitlements: [],
      },
    }),
  }));
  await page.route("**/api/billing/checkout", async (route) => {
    const { planId, locale } = route.request().postDataJSON();
    expect(planId).toBe("fixture-pro");
    expect(locale).toBe("en");
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ checkout: { url: "https://payments.xendit.co/session/phase07-e2e" } }),
    });
  });
  await page.route("https://payments.xendit.co/**", async (route) => route.fulfill({
    status: 200,
    contentType: "text/html",
    body: "<title>Xendit hosted checkout fixture</title><h1>Hosted checkout</h1>",
  }));

  await page.goto("/en/workspace/billing");
  const checkout = page.getByRole("button", { name: "Continue to Xendit" }).first();
  await expect(checkout).toBeVisible();
  for (let index = 0; index < 40 && !(await checkout.evaluate((element) => element === document.activeElement)); index++) {
    await page.keyboard.press("Tab");
  }
  await expect(checkout).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("https://payments.xendit.co/session/phase07-e2e");
});


test("checkout provider failure stays on the billing workspace with a non-secret live status", async ({ page }) => {
  await createAccount(page);
  await page.route("**/api/billing/status", async (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
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
        subscription: null,
        checkoutPending: false,
        entitlements: [],
      },
    }),
  }));
  await page.route("**/api/billing/checkout", async (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: { code: "provider-unavailable" } }),
  }));

  await page.goto("/en/workspace/billing");
  await page.getByRole("button", { name: "Continue to Xendit" }).first().click();
  const status = page.getByRole("status").last();
  await expect(status).toContainText("Billing could not be loaded or updated");
  await expect(status).not.toContainText(/xendit|api|sql|stack/i);
  await expect(page).toHaveURL(/\/en\/workspace\/billing$/);
});