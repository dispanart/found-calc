import { expect, test, type Page } from "@playwright/test";

const MAIN_ORIGIN = "http://127.0.0.1:3000";
const EMBED_ORIGIN = "http://localhost:3000";
const VALID_HOST = "http://localhost:3101";
const password = "phase07b-widget-a11y-password";

const uniqueEmail = (locale: string) => `phase07b-a11y-${locale}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;

async function createAccount(page: Page, locale: "id" | "en") {
  const email = uniqueEmail(locale);
  await page.goto(`${MAIN_ORIGIN}/${locale}/auth`);
  const createLabel = locale === "id" ? "Buat akun" : "Create account";
  await page.getByRole("button", { name: createLabel }).click();
  await page.getByLabel(locale === "id" ? "Nama" : "Name").fill(`A11y ${locale.toUpperCase()}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(locale === "id" ? "Kata sandi" : "Password").fill(password);
  await page.locator("form").getByRole("button", { name: createLabel }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
}

async function createDiscountWidget(page: Page, locale: "id" | "en") {
  const domainResponse = await page.request.post(`${MAIN_ORIGIN}/api/workspace/widget-domains`, {
    data: { origin: VALID_HOST },
  });
  expect(domainResponse.status()).toBe(201);
  const domain = await domainResponse.json() as { domain: { id: string; verifiedAt: number | null } };
  expect(domain.domain.verifiedAt).not.toBeNull();
  const widgetResponse = await page.request.post(`${MAIN_ORIGIN}/api/workspace/widgets`, {
    data: {
      name: `Accessible ${locale} discount`,
      calculatorId: "reference.discount",
      locale,
      domainIds: [domain.domain.id],
      defaults: { baseAmount: "100", discountPercentages: ["10"] },
    },
  });
  expect(widgetResponse.status()).toBe(201);
  const widget = await widgetResponse.json() as { widget: { publicWidgetKey: string } };
  return widget.widget.publicWidgetKey;
}

const hostUrl = (key: string, width: number) =>
  `${VALID_HOST}/host?key=${encodeURIComponent(key)}&title=${encodeURIComponent("Accessible Found Calc widget")}&embedOrigin=${encodeURIComponent(EMBED_ORIGIN)}&width=${width}px`;

for (const scenario of [
  { locale: "en" as const, width: 320, title: "Stacked Discount Calculator", baseLabel: "Starting price", baseValue: "100.00", discountLabel: "Discount 1", calculate: "Calculate discount", required: "This field is required." },
  { locale: "id" as const, width: 390, title: "Kalkulator Diskon Bertingkat", baseLabel: "Harga awal", baseValue: "100,00", discountLabel: "Diskon 1", calculate: "Hitung diskon", required: "Kolom ini wajib diisi." },
]) {
  test(`Phase 07B widget accessibility keeps ${scenario.locale.toUpperCase()} usable at ${scenario.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: scenario.width, height: 844 });
    await createAccount(page, scenario.locale);
    const key = await createDiscountWidget(page, scenario.locale);
    await page.goto(hostUrl(key, scenario.width));

    const iframe = page.locator("iframe");
    await expect(iframe).toBeVisible();
    const frame = page.frameLocator("iframe");
    await expect(frame.getByRole("heading", { level: 1, name: scenario.title })).toBeVisible();
    await expect(frame.getByLabel(scenario.baseLabel)).toHaveValue(scenario.baseValue);
    await expect(frame.getByLabel(scenario.discountLabel)).toBeVisible();
    await expect(frame.getByRole("link", { name: "Powered by Found Calc" })).toBeVisible();

    const hostOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(hostOverflow).toBe(false);
    const embedded = page.frames().find((candidate) => candidate.url().includes(`/embed/${key}`));
    expect(embedded).toBeTruthy();
    const frameOverflow = await embedded?.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(frameOverflow).toBe(false);

    const baseInput = frame.getByLabel(scenario.baseLabel);
    await baseInput.focus();
    expect(await baseInput.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
    const outline = await baseInput.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe("none");

    await baseInput.fill("");
    await frame.getByRole("button", { name: scenario.calculate }).click();
    await expect(baseInput).toHaveAttribute("aria-invalid", "true");
    await expect(baseInput).toHaveAttribute("aria-describedby", /discount-base-amount-error/);
    await expect(frame.locator("#discount-base-amount-error")).toHaveText(scenario.required);
    await expect(frame.getByRole("alert")).toContainText(scenario.required);

    await baseInput.fill("100");
    await frame.getByRole("button", { name: scenario.calculate }).click();
    const liveResult = frame.locator('section[role="status"][aria-live="polite"]');
    await expect(liveResult).toBeVisible();
    await expect(liveResult).toHaveAttribute("aria-atomic", "true");
    await expect(liveResult).toContainText("90");

    await expect.poll(async () => embedded?.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 2)).toBe(true);
  });
}
