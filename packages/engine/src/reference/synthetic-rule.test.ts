import { describe, expect, it } from "vitest";
import type { CalculationContext, CalculationResult, RuleDependency } from "../contracts";
import { calculateSyntheticRuleAmount } from "./synthetic-rule";

const dependency = (ratePercent = "5", versionId = "2025-a"): RuleDependency<{ ratePercent: string }> => ({
  ruleId: "reference.synthetic-rate",
  versionId,
  effectiveFrom: "2025-01-01",
  effectiveUntil: "2025-12-31",
  payload: { ratePercent },
  provenance: { sourceId: "synthetic-reference-fixture" },
});

const contextWith = (resolved: RuleDependency<{ ratePercent: string }>): CalculationContext => ({
  effectiveDate: "2025-06-01",
  calculatorVersion: "1.0.0",
  ruleDependencies: [resolved],
});

const expectSuccess = (outcome: ReturnType<typeof calculateSyntheticRuleAmount>): CalculationResult => {
  expect(outcome.ok).toBe(true);
  if (!outcome.ok) {
    throw new Error(`expected success: ${JSON.stringify(outcome.issues)}`);
  }
  return outcome.result;
};

describe("synthetic rule-dependent reference calculator", () => {
  it("requires a pre-resolved synthetic rate dependency", () => {
    expect(
      calculateSyntheticRuleAmount(
        { baseAmount: "100.00" },
        { effectiveDate: "2025-06-01", calculatorVersion: "1.0.0", ruleDependencies: [] },
      ),
    ).toEqual({ ok: false, issues: [{ path: "ruleDependencies", code: "rule-unavailable" }] });
  });

  it("validates base amount canonically and rejects negative values", () => {
    const context = contextWith(dependency());
    expect(calculateSyntheticRuleAmount({ baseAmount: "10,00" }, context)).toEqual({
      ok: false,
      issues: [{ path: "baseAmount", code: "malformed-number" }],
    });
    expect(calculateSyntheticRuleAmount({ baseAmount: "-0.01" }, context)).toEqual({
      ok: false,
      issues: [{ path: "baseAmount", code: "out-of-range" }],
    });
  });

  it("rejects malformed or out-of-range synthetic rate payloads", () => {
    expect(calculateSyntheticRuleAmount({ baseAmount: "100.00" }, contextWith(dependency("1,5")))).toEqual({
      ok: false,
      issues: [{ path: "ruleDependencies.reference.synthetic-rate.payload.ratePercent", code: "invalid-combination" }],
    });
    expect(calculateSyntheticRuleAmount({ baseAmount: "100.00" }, contextWith(dependency("100.0001")))).toEqual({
      ok: false,
      issues: [{ path: "ruleDependencies.reference.synthetic-rate.payload.ratePercent", code: "invalid-combination" }],
    });
  });

  it("calculates the known answer and preserves exact rule provenance", () => {
    const resolved = dependency("5", "2025-a");
    const result = expectSuccess(calculateSyntheticRuleAmount({ baseAmount: "100.00" }, contextWith(resolved)));
    expect(result.primaryAnswer).toEqual({ id: "calculatedAmount", kind: "decimal", value: "5.00", scale: 2 });
    expect(result.normalizedInputs).toEqual({ baseAmount: "100.00" });
    expect(result.ruleDependencies).toEqual([resolved]);
    expect(result.classification).toBe("rule-based");
  });

  it("uses the supplied dependency identity and payload without resolving versions", () => {
    const supplied = dependency("12.5", "manual-reference-version");
    const result = expectSuccess(calculateSyntheticRuleAmount({ baseAmount: "80.00" }, contextWith(supplied)));
    expect(result.primaryAnswer.value).toBe("10.00");
    expect(result.ruleDependencies).toEqual([supplied]);
  });
});
