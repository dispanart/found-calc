import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const url = (path) => new URL(`../../${path}`, import.meta.url);
const read = (path) => readFileSync(url(path), "utf8");
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("Phase 07B owns a fail-fast verification superset, browser gate, and Worker smoke", () => {
  for (const path of [
    "scripts/verify-phase-07b.mjs",
    "scripts/smoke-phase-07b-worker.sh",
    ".github/workflows/phase-07b-verification.yml",
  ]) {
    assert.equal(existsSync(url(path)), true, `${path} must exist`);
  }

  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts["verify:phase07b"], "node scripts/verify-phase-07b.mjs");

  const verify = read("scripts/verify-phase-07b.mjs");
  const inheritedIndex = verify.indexOf("verify:phase07a");
  assert.notEqual(inheritedIndex, -1, "Phase 07B verification must invoke verify:phase07a");
  for (const required of [
    "test:foundation",
    "test:unit",
    "test:cloudflare",
    "phase-07b-widget-runtime.spec.ts",
    "phase-07b-widget-accessibility.spec.ts",
    "--repeat-each=2",
    "--retries=0",
    "build",
    "vinext:check",
    "build:vinext",
    "smoke-phase-07b-worker.sh",
  ]) {
    const index = verify.indexOf(required);
    assert.notEqual(index, -1, `verify:phase07b must include ${required}`);
    assert.ok(index > inheritedIndex || required === "test:foundation", `${required} must be part of the Phase 07B superset after inherited verification`);
  }

  const workflow = read(".github/workflows/phase-07b-verification.yml");
  assert.match(workflow, /pull_request\s*:/);
  assert.match(workflow, /branches:\s*\n\s*- main/);
  assert.match(workflow, /workflow_dispatch\s*:/);
  assert.doesNotMatch(workflow, /^\s*push\s*:/m);
  assert.match(workflow, /pnpm verify:phase07b/);
  assert.match(workflow, /worker-smoke:/);
  assert.match(workflow, /scripts\/smoke-phase-07b-worker\.sh/);

  for (const migration of [
    "0001_phase04_auth_and_calculator_state.sql",
    "0002_phase05_rule_platform_admin.sql",
    "0003_phase06_workspace.sql",
    "0004_phase07_billing.sql",
    "0005_phase07a_commercial_auth_amendment.sql",
    "0006_phase07b_widget_platform.sql",
  ]) {
    assert.match(workflow, new RegExp(escapeRegex(migration)));
  }
});

test("Phase 07B supersedes the completed Phase 07A main-PR workflow without duplicate CI", () => {
  const predecessor = read(".github/workflows/phase-07a-verification.yml");
  assert.doesNotMatch(predecessor, /\bpull_request\s*:/);
  assert.match(predecessor, /phase-07a-commercial-auth-amendment/);
  assert.match(predecessor, /workflow_dispatch\s*:/);
});

test("Phase 07B local verification documents non-secret dedicated embed and loopback fixture settings", () => {
  const vars = read("apps/web/.dev.vars.example");
  assert.match(vars, /^FOUNDCALC_EMBED_ORIGIN=$/m);
  assert.match(vars, /^FOUNDCALC_WIDGET_LOCAL_PORTS=$/m);
  assert.doesNotMatch(vars, /https?:\/\/[^\s]*(?:token|secret|key)=/i);

  const smoke = read("scripts/smoke-phase-07b-worker.sh");
  for (const required of [
    "0001_phase04_auth_and_calculator_state.sql",
    "0002_phase05_rule_platform_admin.sql",
    "0003_phase06_workspace.sql",
    "0004_phase07_billing.sql",
    "0005_phase07a_commercial_auth_amendment.sql",
    "0006_phase07b_widget_platform.sql",
    "/embed/",
    "/api/rules/",
    "/api/auth/",
    "/api/workspace/",
  ]) assert.match(smoke, new RegExp(escapeRegex(required)));

  assert.match(smoke, /3101/);
  assert.match(smoke, /3102/);
  assert.match(smoke, /frame-ancestors/);
  assert.doesNotMatch(smoke, /--var NODE_ENV:/);
});

test("Phase 07B verification keeps migrations 0001 through 0005 canonical and treats 0006 as the additive widget migration", () => {
  for (const migration of [
    "apps/web/migrations/0001_phase04_auth_and_calculator_state.sql",
    "apps/web/migrations/0002_phase05_rule_platform_admin.sql",
    "apps/web/migrations/0003_phase06_workspace.sql",
    "apps/web/migrations/0004_phase07_billing.sql",
    "apps/web/migrations/0005_phase07a_commercial_auth_amendment.sql",
    "apps/web/migrations/0006_phase07b_widget_platform.sql",
  ]) assert.equal(existsSync(url(migration)), true, `${migration} must remain in the canonical chain`);

  const widgetMigration = read("apps/web/migrations/0006_phase07b_widget_platform.sql");
  assert.match(widgetMigration, /widget/i);
});

test("Phase 07B closure artifacts and handoff metadata are part of the canonical tree", () => {
  for (const path of [
    "docs/verification/phase-07b-verification.md",
    ".github/workflows/phase-07b-baseline-artifact.yml",
  ]) assert.equal(existsSync(url(path)), true, `${path} must exist before closure`);

  const baseline = read("BASELINE.md");
  const handoff = read("PHASE_HANDOFF.md");
  const template = read("PHASE_CHAT_TEMPLATE.md");
  assert.match(baseline, /Last canonical completed phase:\*\* Phase 07B/);
  assert.match(handoff, /Last canonical completed phase:\*\* Phase 07B/);
  assert.match(template, /latest completed portable baseline is Phase 07B/i);
  assert.match(baseline, /found-calc-phase-07b-widget-platform-foundation\.zip/);
  assert.match(handoff, /found-calc-phase-07b-widget-platform-foundation\.zip/);
});

test("widget origin validation remains credential-safe without secret-scanner false-positive property access", () => {
  for (const path of [
    "apps/web/src/lib/widgets/domain.ts",
    "apps/web/src/lib/widgets/security.ts",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /\.password\b/, `${path} must not rely on direct .password access`);
    assert.match(source, /userinfo|credentials/i, `${path} should keep credential rejection explicit`);
  }
});