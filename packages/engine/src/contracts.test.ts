import { describe, expect, it } from "vitest";
import {
  calculationSuccess,
  validationFailure,
  type CalculationContext,
  type CalculationResult,
  type InputDefinition,
  type RuleDependency,
} from "./contracts";

describe("calculation contracts", () => {
  it("keeps result truth semantic and reproducible", () => {
    const dependency: RuleDependency<{ ratePercent: string }> = {
      ruleId: "reference.synthetic-rate",
      versionId: "2025-a",
      effectiveFrom: "2025-01-01",
      effectiveUntil: "2025-12-31",
      payload: { ratePercent: "5" },
      provenance: { sourceId: "synthetic-reference-fixture" },
    };
    const context: CalculationContext = {
      effectiveDate: "2025-06-01",
      calculatorVersion: "1.0.0",
      ruleDependencies: [dependency],
    };
    const result: CalculationResult = {
      calculatorId: "reference.synthetic",
      calculatorVersion: context.calculatorVersion,
      classification: "rule-based",
      normalizedInputs: { baseAmount: "100.00" },
      assumptions: [],
      primaryAnswer: { id: "calculatedAmount", kind: "decimal", value: "5.00", scale: 2 },
      sections: [],
      ruleDependencies: [dependency],
    };

    expect(calculationSuccess(result)).toEqual({ ok: true, result });
    expect(validationFailure([{ path: "baseAmount", code: "out-of-range" }])).toEqual({
      ok: false,
      issues: [{ path: "baseAmount", code: "out-of-range" }],
    });
  });

  it("supports date and select inputs without pretending they are decimals", () => {
    const date = {
      id: "startDate",
      kind: "date",
      required: true,
      min: "0001-01-01",
      max: "9999-12-31",
    } satisfies InputDefinition;
    const select = {
      id: "fromUnit",
      kind: "select",
      required: true,
      options: ["m", "km"] as const,
    } satisfies InputDefinition;

    expect(date.kind).toBe("date");
    expect(select.kind).toBe("select");
  });
});
