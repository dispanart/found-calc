import { expect, test, type Page } from "@playwright/test";

const MAIN_ORIGIN = "http://127.0.0.1:3000";
const EMBED_ORIGIN = "http://localhost:3000";
const VALID_HOST = "http://localhost:3101";
const UNAUTHORIZED_HOST = "http://localhost:3102";
const password = "phase07b-widget-test-password";

const uniqueEmail = (name: string) => `phase07b-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;

async function createAccount(page: Page, name: string) {
  const email = uniqueEmail(name.toLowerCase().replaceAll(" ", "-"));
  await page.goto(`${MAIN_ORIGIN}/en/auth`);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.locator("form").getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
}

async function createHostedWidget(
  page: Page,
  input: {
    calculatorId: "reference.discount" | "reference.business-margin" | "reference.synthetic-rule";
    locale?: "id" | "en";
    defaults?: Record<string, string | string[]>;
  },
) {
  const domainResponse = await page.request.post(`${MAIN_ORIGIN}/api/workspace/widget-domains`, {
    data: { origin: VALID_HOST },
  });
  expect(domainResponse.status()).toBe(201);
  const domainPayload = await domainResponse.json() as {
    domain: { id: string; status: string; verifiedAt: number | null };
    verification: { method: string };
  };
  expect(domainPayload.verification.method).toBe("local_development");
  expect(domainPayload.domain.status).toBe("active");
  expect(domainPayload.domain.verifiedAt).not.toBeNull();

  const widgetResponse = await page.request.post(`${MAIN_ORIGIN}/api/workspace/widgets`, {
    data: {
      name: `Runtime ${input.calculatorId}`,
      calculatorId: input.calculatorId,
      locale: input.locale ?? "en",
      domainIds: [domainPayload.domain.id],
      defaults: input.defaults ?? {},
    },
  });
  expect(widgetResponse.status()).toBe(201);
  const widgetPayload = await widgetResponse.json() as {
    widget: { publicWidgetKey: string };
  };
  expect(widgetPayload.widget.publicWidgetKey).toMatch(/^fcw_/);
  return widgetPayload.widget.publicWidgetKey;
}

const hostUrl = (origin: string, key: string, title = "Found Calc test widget", width = "100%") =>
  `${origin}/host?key=${encodeURIComponent(key)}&title=${encodeURIComponent(title)}&embedOrigin=${encodeURIComponent(EMBED_ORIGIN)}&width=${encodeURIComponent(width)}`;

const embedResponseFor = (page: Page, key: string) =>
  page.waitForResponse((response) => response.url().startsWith(`${EMBED_ORIGIN}/embed/${encodeURIComponent(key)}`));

const iframeHeight = async (page: Page) => page.locator("iframe").evaluate((element) => {
  const value = Number.parseInt(getComputedStyle(element).height, 10);
  return Number.isFinite(value) ? value : 0;
});

const embeddedFrame = (page: Page, key: string) => page.frames().find((frame) => frame.url().includes(`/embed/${key}`));
const liveResult = (frame: ReturnType<Page["frameLocator"]>) => frame.locator('section[role="status"][aria-live="polite"]');

test("Phase 07B widget runtime allows the verified host, rejects copied use, and ignores spoofed resize messages", async ({ page }) => {
  await createAccount(page, "Widget Security Owner");
  const key = await createHostedWidget(page, {
    calculatorId: "reference.discount",
    defaults: { baseAmount: "100", discountPercentages: ["10"] },
  });

  const validResponsePromise = embedResponseFor(page, key);
  await page.goto(hostUrl(VALID_HOST, key));
  const validResponse = await validResponsePromise;
  expect(validResponse.status()).toBe(200);
  const csp = validResponse.headers()["content-security-policy"] ?? "";
  expect(csp).toContain(`frame-ancestors ${VALID_HOST}`);
  expect(csp).not.toContain("frame-ancestors *");

  const iframe = page.locator("iframe");
  await expect(iframe).toBeVisible();
  await expect(iframe).toHaveAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox");
  const sandbox = (await iframe.getAttribute("sandbox")) ?? "";
  expect(sandbox).not.toContain("allow-top-navigation");
  expect(sandbox).not.toContain("allow-forms");
  expect(sandbox).not.toContain("allow-storage-access-by-user-activation");

  const frame = page.frameLocator("iframe");
  await expect(frame.getByRole("heading", { level: 1, name: "Stacked Discount Calculator" })).toBeVisible();
  await expect(frame.getByRole("link", { name: "Powered by Found Calc" })).toBeVisible();

  const crossOriginIsolated = await page.evaluate(() => {
    const element = document.querySelector("iframe");
    if (!(element instanceof HTMLIFrameElement)) return false;
    try {
      void element.contentWindow?.document.body;
      return false;
    } catch {
      return true;
    }
  });
  expect(crossOriginIsolated).toBe(true);

  const beforeSpoof = await iframeHeight(page);
  await page.evaluate(({ embedOrigin, widgetKey }) => {
    const element = document.querySelector("iframe");
    if (!(element instanceof HTMLIFrameElement)) throw new Error("iframe missing");
    const source = element.contentWindow;
    const payloads = [
      { origin: "https://attacker.example", source, data: { type: "foundcalc:resize", protocolVersion: 1, widgetKey, heightPx: 999 } },
      { origin: embedOrigin, source: window, data: { type: "foundcalc:resize", protocolVersion: 1, widgetKey, heightPx: 999 } },
      { origin: embedOrigin, source, data: { type: "foundcalc:resize", protocolVersion: 1, widgetKey: `${widgetKey}x`, heightPx: 999 } },
      { origin: embedOrigin, source, data: { type: "foundcalc:resize", protocolVersion: 2, widgetKey, heightPx: 999 } },
      { origin: embedOrigin, source, data: { type: "foundcalc:command", protocolVersion: 1, widgetKey, heightPx: 999 } },
    ];
    for (const item of payloads) {
      window.dispatchEvent(new MessageEvent("message", item));
    }
  }, { embedOrigin: EMBED_ORIGIN, widgetKey: key });
  await expect.poll(() => iframeHeight(page)).toBe(beforeSpoof);

  const deniedResponsePromise = embedResponseFor(page, key);
  await page.goto(hostUrl(UNAUTHORIZED_HOST, key));
  const deniedResponse = await deniedResponsePromise;
  expect(deniedResponse.status()).toBe(404);
  await expect(page.frameLocator("iframe").getByRole("heading", { name: "Stacked Discount Calculator" })).toHaveCount(0);
});

test("Phase 07B widget runtime resizes dynamic Discount content and matches public calculation truth", async ({ page }) => {
  await createAccount(page, "Widget Discount Owner");
  const key = await createHostedWidget(page, {
    calculatorId: "reference.discount",
    defaults: { baseAmount: "100", discountPercentages: ["10"] },
  });
  await page.goto(hostUrl(VALID_HOST, key));
  const frame = page.frameLocator("iframe");
  await expect(frame.getByLabel("Starting price")).toHaveValue("100.00");
  await expect(frame.getByLabel("Discount 1")).toHaveValue("10.0000");

  const initialHeight = await iframeHeight(page);
  await frame.getByRole("button", { name: "Add discount" }).click();
  await frame.getByLabel("Discount 2").fill("20");
  await expect.poll(() => iframeHeight(page)).toBeGreaterThan(initialHeight);

  await frame.getByRole("button", { name: "Calculate discount" }).click();
  await expect(liveResult(frame)).toContainText("72.00");

  const concreteFrame = embeddedFrame(page, key);
  expect(concreteFrame).toBeTruthy();
  await expect.poll(async () => concreteFrame?.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 2)).toBe(true);

  await page.goto(`${MAIN_ORIGIN}/en/calculators/discount`);
  await page.getByLabel("Starting price").fill("100");
  await page.getByLabel("Discount 1").fill("10");
  await page.getByRole("button", { name: "Add discount" }).click();
  await page.getByLabel("Discount 2").fill("20");
  await page.getByRole("button", { name: "Calculate discount" }).click();
  await expect(page.locator('section[role="status"][aria-live="polite"]')).toContainText("72.00");
});

test("Phase 07B widget runtime renders Business Margin expansion and synthetic rule provenance from the shared runtime", async ({ page }) => {
  await createAccount(page, "Widget Business Owner");
  const businessKey = await createHostedWidget(page, {
    calculatorId: "reference.business-margin",
    defaults: { sellingPrice: "200", productCost: "80", variableSellingCostPerOrder: "20" },
  });
  await page.goto(hostUrl(VALID_HOST, businessKey));
  let frame = page.frameLocator("iframe");
  await expect(frame.getByLabel("Selling price")).toHaveValue("200.00");
  await frame.getByRole("button", { name: /calculate/i }).click();
  await expect(liveResult(frame)).toContainText("Margin result");
  const businessFrame = embeddedFrame(page, businessKey);
  await expect.poll(async () => businessFrame?.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 2)).toBe(true);

  await page.goto(`${MAIN_ORIGIN}/en/auth`);
  await page.getByRole("button", { name: "Sign out" }).click();
  await createAccount(page, "Widget Synthetic Owner");
  const syntheticKey = await createHostedWidget(page, {
    calculatorId: "reference.synthetic-rule",
    defaults: { baseAmount: "100" },
  });
  await page.goto(hostUrl(VALID_HOST, syntheticKey));
  frame = page.frameLocator("iframe");
  await expect(frame.getByRole("heading", { level: 1, name: "Versioned Rule Reference" })).toBeVisible();
  await expect(frame.getByText("synthetic test fixture data", { exact: false })).toBeVisible();
  await frame.getByLabel("Effective date").fill("2026-08-31");
  const calculate = frame.getByRole("button", { name: "Calculate reference" });
  await expect(calculate).toBeEnabled();
  await calculate.click();
  await expect(frame.getByRole("heading", { name: "Rule provenance" })).toBeVisible();
  await expect(frame.getByText("2026-a", { exact: true })).toBeVisible();
  await expect(frame.getByText("synthetic-reference-fixture", { exact: true })).toBeVisible();
});
