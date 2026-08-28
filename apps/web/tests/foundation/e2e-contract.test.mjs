import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Playwright smoke suite covers locale and route boundaries", async () => {
  const [config, shellSpec, calculatorSpec, accessibilitySpec] = await Promise.all([
    readFile("apps/web/playwright.config.ts", "utf8"),
    readFile("apps/web/tests/e2e/locale-shell.spec.ts", "utf8"),
    readFile("apps/web/tests/e2e/phase-03-calculators.spec.ts", "utf8"),
    readFile("apps/web/tests/e2e/phase-03-accessibility.spec.ts", "utf8"),
  ]);

  assert.match(config, /baseURL/);
  assert.match(config, /webServer/);
  assert.match(shellSpec, /page\.goto\("\/"\)/);
  assert.match(shellSpec, /page\.goto\("\/id"\)/);
  assert.match(shellSpec, /page\.goto\("\/en"\)/);
  assert.match(shellSpec, /\/id\/workspace/);
  assert.match(shellSpec, /\/en\/admin/);

  for (const route of [
    "/id/calculators",
    "/en/calculators",
    "/id/calculators/discount",
    "/en/calculators/business-margin",
    "/en/calculators/synthetic-rule-reference",
  ]) {
    assert.match(calculatorSpec + accessibilitySpec, new RegExp(route.replaceAll("/", "\\/")));
  }

  assert.match(calculatorSpec, /Ganti bahasa: EN/);
  assert.match(calculatorSpec, /scenario-impact/);
  assert.match(accessibilitySpec, /aria-invalid/);
  assert.match(accessibilitySpec, /getByRole\("status"\)/);
  assert.match(accessibilitySpec, /width: 390/);
});
