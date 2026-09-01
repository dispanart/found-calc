import { describe, expect, it } from "vitest";
import type { CalculationContext } from "../contracts";
import { calculatePercentage } from "./percentage";

const context: CalculationContext = { effectiveDate: "2026-09-01", calculatorVersion: "1.0.0" };

describe("percentage calculator", () => {
  it("calculates the known-answer percentage and comparison values", () => {
    const outcome = calculatePercentage({ baseValue: "250", percentage: "12.5" }, context);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.primaryAnswer).toMatchObject({ id: "percentageAmount", value: "31.250000" });
    expect(outcome.result.sections[0]?.values.map((value) => [value.id, value.value])).toEqual([
      ["increasedValue", "281.250000"],
      ["decreasedValue", "218.750000"],
    ]);
    expect(outcome.result.normalizedInputs).toEqual({ baseValue: "250.000000", percentage: "12.5000" });
  });

  it("rejects invalid percentage bounds and malformed input", () => {
    expect(calculatePercentage({ baseValue: "10", percentage: "-0.1" }, context)).toEqual({ ok: false, issues: [{ path: "percentage", code: "out-of-range" }] });
    expect(calculatePercentage({ baseValue: "10", percentage: "100001" }, context)).toEqual({ ok: false, issues: [{ path: "percentage", code: "out-of-range" }] });
    expect(calculatePercentage({ baseValue: "1,5", percentage: "10" }, context)).toEqual({ ok: false, issues: [{ path: "baseValue", code: "malformed-number" }] });
  });
});
