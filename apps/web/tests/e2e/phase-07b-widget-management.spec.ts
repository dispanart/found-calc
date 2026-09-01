import { execFileSync } from "node:child_process";

import { expect, test, type Page } from "@playwright/test";

const password = "phase07b-widget-test-password";
const uniqueEmail = (role: string) => `phase07b-widget-${role}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
const sqlLiteral = (value: string) => `'${value.replaceAll("'", "''")}'`;

function markLocalAccountEmailVerified(email: string) {
  const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  execFileSync(pnpm, [
    "exec",
    "wrangler",
    "d1",
    "execute",
    "found-calc-local",
    "--local",
    "--command",
    `UPDATE user SET email_verified = 1 WHERE email = ${sqlLiteral(email)};`,
    "--yes",
  ], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "pipe",
  });
}

async function createAccount(page: Page, name: string, email: string) {
  await page.goto("/en/auth");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.locator("form").getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
}

test("widget management signed-out state is optional, localized, and narrow-screen safe", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/workspace/widgets");
  await expect(page.getByRole("heading", { level: 1, name: "Website calculators" })).toBeVisible();
  await expect(page.getByText("Sign in to manage website calculators", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test("widget management creates a Friends widget, gates embed on verified domain, and supports disable/rotate", async ({ page }) => {
  await createAccount(page, "Widget Owner", uniqueEmail("owner"));
  await page.goto("/en/workspace/widgets");
  await page.getByRole("button", { name: "Create website calculator" }).click();
  await page.getByLabel("Widget name").fill("Store discount");
  await page.getByLabel(/^Calculator/).selectOption("reference.discount");
  await page.getByLabel("Widget language").selectOption("en");
  await page.getByLabel("Domain origin").fill("http://127.0.0.1:3000");
  await page.getByRole("button", { name: "Add domain" }).click();
  await expect(page.getByText("Verified", { exact: true })).toBeVisible();
  await expect(page.getByText("Friends keeps Powered by Found Calc visible.", { exact: true })).toBeVisible();
  await page.getByLabel("Starting price default").fill("125");
  await page.getByRole("button", { name: "Create widget" }).click();
  await expect(page.getByText("Embed code is ready.", { exact: true })).toBeVisible();
  const snippet = page.getByTestId("widget-embed-code");
  await expect(snippet).toContainText("embed.js");
  await expect(snippet).toContainText("data-foundcalc-widget");
  await expect(snippet).not.toContainText("hideBranding");

  await page.getByRole("link", { name: "Manage Store discount" }).click();
  await page.getByRole("button", { name: "Disable widget" }).click();
  await expect(page.getByText("Disabled", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Enable widget" }).click();
  await page.getByRole("button", { name: "Rotate public key" }).click();
  await page.getByRole("button", { name: "Confirm key rotation" }).click();
  await expect(page.getByText("Public key rotated. Replace the old embed code.", { exact: true })).toBeVisible();
});

test("Besties trial exposes controlled appearance and standard analytics", async ({ page }) => {
  const email = uniqueEmail("besties");
  await createAccount(page, "Besties Widget Owner", email);
  markLocalAccountEmailVerified(email);
  const trial = await page.request.post("/api/billing/trial", { data: {} });
  expect(trial.ok()).toBe(true);
  await page.goto("/en/workspace/widgets");
  await page.getByRole("button", { name: "Create website calculator" }).click();
  await expect(page.getByLabel("Appearance")).toBeEnabled();
  await expect(page.getByLabel("Accent")).toBeEnabled();
  await expect(page.getByText("Besties", { exact: true }).first()).toBeVisible();
});
