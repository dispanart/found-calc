import { describe, expect, it } from "vitest";

import {
  runBusinessMargin,
  runBusinessMarginScenario,
  runDiscount,
  runSyntheticRule,
} from "./runtime";

const valueById = (
  result: { primaryAnswer: { id: string; value: string }; sections: readonly { values: readonly { id: string; value: string }[] }[] },
  id: string,
): string | undefined => {
  if (result.primaryAnswer.id === id) return result.primaryAnswer.value;
  return result.sections.flatMap((section) => section.values).find((value) => value.id === id)?.value;
};

describe("Phase 03 calculator runtime adapters", () => {
  it("delegates stacked discount truth to the Phase 02 engine", () => {
    const outcome = runDiscount({ baseAmount: "100.00", discountPercentages: ["10", "20"] });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error("expected discount success");
    expect(outcome.result.primaryAnswer.value).toBe("72.00");
    expect(valueById(outcome.result, "absoluteSaving")).toBe("28.00");
    expect(valueById(outcome.result, "effectiveDiscountPercent")).toBe("28.0000");
  });

  it("keeps progressive business margin and scenario arithmetic inside the engine", () => {
    const baselineInput = {
      sellingPrice: "100.00",
      productCost: "60.00",
      variableSellingCostPerOrder: "15.00",
    } as const;
    const baseline = runBusinessMargin(baselineInput);
    expect(baseline.ok).toBe(true);
    if (!baseline.ok) throw new Error("expected margin success");
    expect(valueById(baseline.result, "grossProfit")).toBe("40.00");
    expect(valueById(baseline.result, "contributionProfit")).toBe("25.00");

    const scenario = runBusinessMarginScenario(baselineInput, {
      id: "reduce-variable-cost",
      changes: { variableSellingCostPerOrder: "10.00" },
    });
    expect(scenario.ok).toBe(true);
    if (!scenario.ok || !("baseline" in scenario.result)) throw new Error("expected scenario success");
    expect(scenario.result.impact.value).toBe("5.00");
    expect(valueById(scenario.result.scenario, "contributionProfit")).toBe("30.00");
  });

  it("resolves synthetic rule versions explicitly from effective date", () => {
    const in2025 = runSyntheticRule({ baseAmount: "100.00", effectiveDate: "2025-06-01" });
    expect(in2025.ok).toBe(true);
    if (!in2025.ok) throw new Error("expected 2025 synthetic success");
    expect(in2025.result.primaryAnswer.value).toBe("5.00");
    expect(in2025.result.ruleDependencies?.[0]?.versionId).toBe("2025-a");

    const in2026 = runSyntheticRule({ baseAmount: "100.00", effectiveDate: "2026-06-01" });
    expect(in2026.ok).toBe(true);
    if (!in2026.ok) throw new Error("expected 2026 synthetic success");
    expect(in2026.result.primaryAnswer.value).toBe("7.50");
    expect(in2026.result.ruleDependencies?.[0]?.versionId).toBe("2026-a");
  });

  it("maps invalid and unavailable effective dates to typed calculation failures", () => {
    expect(runSyntheticRule({ baseAmount: "100.00", effectiveDate: "2026-02-30" })).toEqual({
      ok: false,
      issues: [{ path: "effectiveDate", code: "invalid-effective-date" }],
    });
    expect(runSyntheticRule({ baseAmount: "100.00", effectiveDate: "2024-06-01" })).toEqual({
      ok: false,
      issues: [{ path: "effectiveDate", code: "rule-unavailable" }],
    });
  });
});
