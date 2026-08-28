import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const exists = (path) => {
  try { read(path); return true; } catch { return false; }
};

test("Phase 04 verification surface is wired", () => {
  const root = JSON.parse(read("package.json"));
  const web = JSON.parse(read("apps/web/package.json"));

  assert.equal(root.scripts["verify:phase04"], "node scripts/verify-phase-04.mjs");
  assert.equal(web.dependencies["better-auth"], "1.6.29");
  assert.equal(web.dependencies["drizzle-orm"], "0.45.2");

  for (const path of [
    "docs/superpowers/specs/2026-08-28-found-calc-phase-04-persistence-auth-guest-preservation-design.md",
    "docs/superpowers/plans/2026-08-28-found-calc-phase-04-persistence-auth-guest-preservation.md",
    "docs/verification/phase-04-verification.md",
    "apps/web/migrations/0001_phase04_auth_and_calculator_state.sql",
    "apps/web/src/lib/persistence/state.ts",
    "apps/web/src/lib/persistence/repository.ts",
    "apps/web/src/lib/auth/server.ts",
    "apps/web/src/app/api/auth/[...all]/route.ts",
    "apps/web/src/app/api/calculator-state/[calculatorId]/route.ts",
    "apps/web/src/app/api/guest/claim/route.ts",
    "apps/web/src/lib/persistence/local-draft.ts",
    "apps/web/tests/cloudflare/phase-04-persistence.test.ts",
    "apps/web/tests/e2e/phase-04-auth-guest.spec.ts",
    ".github/workflows/phase-04-verification.yml",
    ".github/workflows/phase-04-baseline-artifact.yml",
  ]) {
    assert.equal(exists(path), true, `missing Phase 04 artifact: ${path}`);
  }
});

test("Phase 04 clears canonical Next build artifacts before inherited regression gates", () => {
  const verification = read("scripts/verify-phase-04.mjs");
  assert.match(verification, /rmSync/);
  assert.match(verification, /apps\/web\/\.next/);

  const cleanupIndex = verification.indexOf('apps/web/.next');
  const inheritedGateIndex = verification.indexOf('complete Phase 03 regression gate');
  assert.ok(cleanupIndex >= 0, "Phase 04 must define cleanup for apps/web/.next");
  assert.ok(inheritedGateIndex > cleanupIndex, "Next build artifacts must be cleared before the inherited Phase 03 gate");
});

test("Phase 04 closure records a portable canonical handoff", () => {
  const baseline = read("BASELINE.md");
  const handoff = read("PHASE_HANDOFF.md");
  const artifactWorkflow = read(".github/workflows/phase-04-baseline-artifact.yml");

  assert.match(baseline, /Found Calc Phase 04 — Persistence, Auth & Guest Preservation/);
  assert.match(baseline, /Phase state:\*\* COMPLETE/);
  assert.match(handoff, /Last canonical completed phase:\*\* Phase 04 — Persistence, Auth & Guest Preservation/);
  assert.match(handoff, /Phase 05/);
  assert.match(handoff, /canonical Phase Workflow/i);

  assert.equal(exists(".github/workflows/phase-04-lockfile.yml"), false, "temporary Phase 04 lockfile workflow must be removed at closure");

  assert.match(artifactWorkflow, /branches:\s*\n\s*- main/);
  assert.match(artifactWorkflow, /found-calc-phase-04-persistence-auth-guest-preservation\.zip/);
  assert.match(artifactWorkflow, /GITHUB_SHA/);
  assert.match(artifactWorkflow, /git archive/);
  assert.match(artifactWorkflow, /SHA256SUMS/);
  assert.match(artifactWorkflow, /ARTIFACT_VERIFICATION\.txt/);
});
