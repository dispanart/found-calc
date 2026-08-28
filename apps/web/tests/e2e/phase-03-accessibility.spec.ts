import { expect, test } from "@playwright/test";

test("discount controls are keyboard operable and result updates use a live status region", async ({ page }) => {
  await page.goto("/en/calculators/discount");
  await page.getByLabel("Starting price").fill("100.00");
  await page.getByLabel("Discount 1").fill("10");

  const addButton = page.getByRole("button", { name: "Add discount" });
  await addButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Discount 2")).toBeVisible();

  await page.getByLabel("Discount 2").fill("20");
  const calculate = page.getByRole("button", { name: "Calculate discount" });
  await calculate.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("72.00");
});

test("field validation is associated with its control", async ({ page }) => {
  await page.goto("/en/calculators/discount");
  const startingPrice = page.getByLabel("Starting price");
  await startingPrice.fill("not-a-number");
  await page.getByRole("button", { name: "Calculate discount" }).click();

  await expect(startingPrice).toHaveAttribute("aria-invalid", "true");
  const describedBy = await startingPrice.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();
  await expect(page.locator(`#${describedBy}`)).toBeVisible();
});

for (const path of [
  "/id/calculators",
  "/en/calculators/discount",
  "/en/calculators/business-margin",
  "/en/calculators/synthetic-rule-reference",
]) {
  test(`Phase 03 surface has no horizontal overflow at 390px: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    const hasPageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasPageOverflow).toBe(false);
  });
}
