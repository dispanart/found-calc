import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");

test("Phase 05 admin page mounts localized rule management core", () => {
  const panelPath = "apps/web/src/components/admin/rule-admin-panel.tsx";
  assert.equal(existsSync(url(panelPath)), true, `${panelPath} must exist`);
  const page = read("apps/web/src/app/[locale]/(admin)/admin/page.tsx");
  const panel = read(panelPath);
  const messages = read("apps/web/src/i18n/messages.ts");
  assert.match(page, /RuleAdminPanel/);
  assert.match(panel, /reference\.synthetic-rate/);
  assert.match(panel, /\/api\/admin\/rule-versions/);
  assert.match(panel, /Publish|Publikasikan/);
  assert.match(panel, /synthetic|sintetis/i);
  assert.match(messages, /Phase 05 · Versioned Rule Platform \+ Admin Core/);
});
