import assert from "node:assert/strict";
import test from "node:test";

import {
  findOverlappingRuleVersion,
  validateRuleEffectivePeriod,
} from "../../packages/rules/src/publication.ts";

const version = (overrides: Partial<{ ruleId: string; versionId: string; effectiveFrom: string; effectiveUntil: string }> = {}) => ({
  ruleId: "reference.synthetic-rate",
  versionId: "2025-a",
  effectiveFrom: "2025-01-01",
  effectiveUntil: "2025-12-31",
  payload: { ratePercent: "5" },
  provenance: { sourceId: "synthetic-reference-fixture" },
  ...overrides,
});

test("Phase 05 effective periods require valid ISO date-only bounds", () => {
  assert.deepEqual(validateRuleEffectivePeriod({ effectiveFrom: "2026-01-01" }), { ok: true });
  assert.deepEqual(validateRuleEffectivePeriod({ effectiveFrom: "2026-01-01", effectiveUntil: "2026-12-31" }), { ok: true });
  for (const effectiveFrom of ["2026/01/01", "2026-01-01T00:00:00Z", "2026-02-30"]) {
    assert.deepEqual(validateRuleEffectivePeriod({ effectiveFrom }), { ok: false, code: "invalid-effective-period" });
  }
  assert.deepEqual(
    validateRuleEffectivePeriod({ effectiveFrom: "2026-07-01", effectiveUntil: "2026-06-30" }),
    { ok: false, code: "invalid-effective-period" },
  );
});

test("Phase 05 publication overlap uses inclusive periods and ignores other rules", () => {
  const published = [version()];
  assert.equal(findOverlappingRuleVersion(published, version({ versionId: "2026-a", effectiveFrom: "2026-01-01", effectiveUntil: "2026-12-31" })), undefined);
  assert.equal(findOverlappingRuleVersion(published, version({ versionId: "overlap", effectiveFrom: "2025-12-31" }))?.versionId, "2025-a");
  assert.equal(findOverlappingRuleVersion(published, version({ versionId: "open", effectiveFrom: "2025-06-01", effectiveUntil: undefined }))?.versionId, "2025-a");
  assert.equal(findOverlappingRuleVersion(published, version({ ruleId: "other.rule", versionId: "other", effectiveFrom: "2025-06-01" })), undefined);
});
