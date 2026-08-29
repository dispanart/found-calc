import { describe, expect, it } from "vitest";
import { findOverlappingRuleVersion, validateRuleEffectivePeriod } from "./publication";

const version = (effectiveFrom: string, effectiveUntil?: string) => ({
  ruleId: "reference.synthetic-rate",
  versionId: effectiveFrom,
  effectiveFrom,
  ...(effectiveUntil === undefined ? {} : { effectiveUntil }),
});

describe("rule publication invariants", () => {
  it("validates strict date-only effective periods", () => {
    expect(validateRuleEffectivePeriod({ effectiveFrom: "2026-01-01" })).toEqual({ ok: true });
    expect(validateRuleEffectivePeriod({ effectiveFrom: "2026-02-30" })).toEqual({ ok: false, code: "invalid-effective-period" });
    expect(validateRuleEffectivePeriod({ effectiveFrom: "2026-06-02", effectiveUntil: "2026-06-01" })).toEqual({ ok: false, code: "invalid-effective-period" });
  });

  it("detects inclusive interval overlap", () => {
    const existing = [version("2025-01-01", "2025-12-31")];
    expect(findOverlappingRuleVersion(existing, version("2026-01-01"))).toBeUndefined();
    expect(findOverlappingRuleVersion(existing, version("2025-12-31"))?.effectiveFrom).toBe("2025-01-01");
  });
});
