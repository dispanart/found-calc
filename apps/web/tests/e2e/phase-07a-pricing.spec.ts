import { expect, test } from "@playwright/test";

const uniqueEmail = () => `phase07a-pricing-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;

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

test("authenticated Besties pricing CTA starts the trial directly before returning to billing", async ({ page }) => {
  await page.goto("/en/pricing");
  const signUpStatus = await page.evaluate(async ({ accountEmail, accountPassword }) => {
    const response = await fetch("/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        name: "Phase 07A Pricing",
        email: accountEmail,
        password: accountPassword,
      }),
    });
    return response.status;
  }, { accountEmail: uniqueEmail(), accountPassword: "phase07a-pricing-test-password" });
  expect(signUpStatus).toBe(200);

  let trialMethod: string | null = null;
  await page.route("**/api/billing/trial", async (route) => {
    trialMethod = route.request().method();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ trial: { startedAt: 1, endsAt: 2, convertedAt: null, eligible: false } }),
    });
  });

  await page.reload();
  const trialButton = page.getByRole("button", { name: "Try Besties free for 14 days" });
  await expect(trialButton).toBeVisible();
  await trialButton.click();

  expect(trialMethod).toBe("POST");
  await expect(page).toHaveURL(/\/en\/workspace\/billing$/);
});
