import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("successful authentication claims guest drafts without rolling back the session", () => {
  const authPanel = read("apps/web/src/components/auth/auth-panel.tsx");
  assert.match(authPanel, /\/api\/guest\/claim/);
  assert.match(authPanel, /claimGuestDrafts/);
  assert.match(authPanel, /retryClaim/);
  assert.match(authPanel, /preserv|pertahan/i);
  assert.match(authPanel, /await refetch\(\)/);
});

test("workspace is an auth-aware three-calculator persistence summary, not projects/history", () => {
  const summaryPath = "apps/web/src/components/workspace/persistence-summary.tsx";
  assert.equal(existsSync(url(summaryPath)), true, `${summaryPath} must exist`);
  const summary = read(summaryPath);
  assert.match(summary, /reference\.discount/);
  assert.match(summary, /reference\.business-margin/);
  assert.match(summary, /reference\.synthetic-rule/);
  assert.match(summary, /useSession/);
  assert.match(summary, /\/api\/calculator-state\//);
  assert.doesNotMatch(summary, /project|history|collaborat/i);

  const page = read("apps/web/src/app/[locale]/(workspace)/workspace/page.tsx");
  assert.match(page, /PersistenceSummary/);
});

test("Phase 04 browser verification uses vinext with the Cloudflare Vite runtime and exposes CI auth env", () => {
  const playwright = read("apps/web/playwright.config.ts");
  assert.match(playwright, /vite dev/);
  assert.match(playwright, /--host 127\.0\.0\.1/);
  assert.match(playwright, /--port 3000/);
  assert.match(playwright, /CLOUDFLARE_INCLUDE_PROCESS_ENV/);

  const vite = read("apps/web/vite.config.ts");
  assert.match(vite, /vinext\(\)/);
  assert.match(vite, /cloudflare\(/);
});
