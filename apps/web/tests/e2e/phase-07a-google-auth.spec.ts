import { expect, test } from "@playwright/test";

const uniqueEmail = () => `phase07a-google-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;

test("Google entry stays keyboard-usable and a controlled social callback preserves a guest draft without live Google", async ({ page }) => {
  const email = uniqueEmail();
  const password = "phase07a-google-test-password";

  await page.goto("/en/calculators/discount");
  await page.getByLabel("Starting price").fill("321.00");
  await page.getByLabel("Discount 1").fill("12");
  await page.getByRole("button", { name: "Calculate discount" }).click();
  await page.getByTestId("save-draft").click();
  await expect(page.getByTestId("persistence-status")).toContainText("Draft saved");

  const returnTo = "/en/calculators/discount?scenario=oauth#results";
  await page.goto(`/en/auth?returnTo=${encodeURIComponent(returnTo)}`);
  const google = page.getByRole("button", { name: "Continue with Google" });
  await expect(google).toBeVisible();
  await google.focus();
  await expect(google).toBeFocused();

  const signUp = await page.request.post("/api/auth/sign-up/email", {
    data: { name: "Phase 07A Google", email, password },
  });
  expect(signUp.status()).toBe(200);

  await page.goto(`/en/auth?social=google&returnTo=${encodeURIComponent(returnTo)}`);
  await expect(page).toHaveURL(/\/en\/calculators\/discount\?scenario=oauth#results$/);

  await page.getByTestId("load-draft").click();
  await expect(page.getByLabel("Starting price")).toHaveValue("321.00");
  await expect(page.getByTestId("persistence-status")).toContainText("loaded");
});
