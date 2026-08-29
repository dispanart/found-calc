import { expect, test } from "@playwright/test";

test("synthetic calculator disables calculation when the published rule feed is unavailable", async ({ page }) => {
  await page.route("**/api/rules/reference.synthetic-rate/versions", async (route) => {
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "storage-unavailable" } }) });
  });
  await page.goto("/en/calculators/synthetic-rule-reference");
  await expect(page.getByRole("alert")).toContainText(/published rule versions are currently unavailable/i);
  await expect(page.getByRole("button", { name: "Calculate reference" })).toBeDisabled();
});
