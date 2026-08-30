import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

test("Phase 07A Google transition preserves a validated return target and reuses guest claim", () => {
  const page = read("apps/web/src/app/[locale]/(public)/auth/page.tsx");
  const panel = read("apps/web/src/components/auth/auth-panel.tsx");

  assert.match(page, /searchParams\s*:\s*Promise/);
  assert.match(page, /await\s+searchParams/);
  assert.match(page, /safeAuthReturnTo/);
  assert.match(page, /<AuthPanel[\s\S]*returnTo=/);

  assert.match(panel, /signIn\.social/);
  assert.match(panel, /provider\s*:\s*["']google["']/);
  assert.match(panel, /callbackURL/);
  assert.match(panel, /\/api\/guest\/claim/);
  assert.match(panel, /finishAuthenticatedTransition/);
  assert.match(panel, /router\.replace\(returnTo\)/);
  assert.match(panel, /useEffect/);
  assert.match(panel, /retryClaim/);
});