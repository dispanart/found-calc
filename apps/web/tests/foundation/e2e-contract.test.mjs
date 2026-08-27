import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Playwright smoke suite covers locale and route boundaries", async () => {
  const config = await readFile("apps/web/playwright.config.ts", "utf8");
  const spec = await readFile("apps/web/tests/e2e/locale-shell.spec.ts", "utf8");

  assert.match(config, /baseURL/);
  assert.match(config, /webServer/);
  assert.match(spec, /page\.goto\("\/"\)/);
  assert.match(spec, /page\.goto\("\/id"\)/);
  assert.match(spec, /page\.goto\("\/en"\)/);
  assert.match(spec, /\/id\/workspace/);
  assert.match(spec, /\/en\/admin/);
});
