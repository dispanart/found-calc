import { describe, expect, it } from "vitest";
import type { CalculationContext, CalculationResult, Scenario } from "../contracts";
import {
  calculateBusinessMargin,
  calculateBusinessMarginScenario,
  type BusinessMarginInput,
} from "./business-margin";

const context: CalculationContext = {
  effectiveDate: "2026-08-28",
  calculatorVersion: "1.0.0",
};

const expectSuccess = (outcome: ReturnType<typeof calculateBusinessMargin>): CalculationResult => {
  expect(outcome.ok).toBe(true);
  if (!outcome.ok) {
    throw new Error(`expected success: ${JSON.stringify(outcome.issues)}`);
  }
  return outcome.result;
};

const valueById = (result: CalculationResult, id: string): string | undefined => {
  if (result.primaryAnswer.id === id) {
    return result.primaryAnswer.value;
  }
  return result.sections.flatMap((section) => section.values).find((value) => value.id === id)?.value;
};

describe("business margin reference calculator", () => {
  it("returns the baseline known answer from required inputs", () => {
    const result = expectSuccess(calculateBusinessMargin({ sellingPrice: "100.00", productCost: "60.00" }, context));
    expect(valueById(result, "grossProfit")).toBe("40.00");
    expect(valueById(result, "grossMarginPercent")).toBe("40.0000");
    expect(result.sections.map((section) => section.id)).toEqual(["gross"]);
    expect(result.primaryAnswer.id).toBe("grossProfit");
  });

  it("handles break-even and permits a negative gross result", () => {
    const breakEven = expectSuccess(calculateBusinessMargin({ sellingPrice: "100.00", productCost: "100.00" }, context));
    expect(valueById(breakEven, "grossProfit")).toBe("0.00");
    expect(valueById(breakEven, "grossMarginPercent")).toBe("0.0000");

    const loss = expectSuccess(calculateBusinessMargin({ sellingPrice: "100.00", productCost: "125.00" }, context));
    expect(valueById(loss, "grossProfit")).toBe("-25.00");
    expect(valueById(loss, "grossMarginPercent")).toBe("-25.0000");
  });

  it("validates selling price and non-negative costs", () => {
    expect(calculateBusinessMargin({ sellingPrice: "0.00", productCost: "0.00" }, context)).toEqual({
      ok: false,
      issues: [{ path: "sellingPrice", code: "out-of-range" }],
    });
    expect(
      calculateBusinessMargin(
        { sellingPrice: "100.00", productCost: "-1.00", variableSellingCostPerOrder: "-2.00" },
        context,
      ),
    ).toEqual({
      ok: false,
      issues: [
        { path: "productCost", code: "out-of-range" },
        { path: "variableSellingCostPerOrder", code: "out-of-range" },
      ],
    });
  });

  it("progressively adds contribution metrics when contextual cost is supplied", () => {
    const result = expectSuccess(
      calculateBusinessMargin(
        { sellingPrice: "100.00", productCost: "60.00", variableSellingCostPerOrder: "15.00" },
        context,
      ),
    );
    expect(valueById(result, "grossProfit")).toBe("40.00");
    expect(valueById(result, "grossMarginPercent")).toBe("40.0000");
    expect(valueById(result, "contributionProfit")).toBe("25.00");
    expect(valueById(result, "contributionMarginPercent")).toBe("25.0000");
    expect(result.sections.map((section) => section.id)).toEqual(["gross", "contribution"]);
    expect(result.primaryAnswer).toMatchObject({ id: "contributionProfit", value: "25.00" });
  });

  it("rounds amount and percentage outputs at declared boundaries", () => {
    const result = expectSuccess(
      calculateBusinessMargin(
        { sellingPrice: "3.00", productCost: "1.00", variableSellingCostPerOrder: "1.00" },
        context,
      ),
    );
    expect(valueById(result, "grossMarginPercent")).toBe("66.6667");
    expect(valueById(result, "contributionMarginPercent")).toBe("33.3333");
  });

  it("evaluates a scenario without mutating baseline input/result", () => {
    const baselineInput: BusinessMarginInput = {
      sellingPrice: "100.00",
      productCost: "60.00",
      variableSellingCostPerOrder: "15.00",
    };
    const baselineInputSnapshot = structuredClone(baselineInput);
    const baselineResult = expectSuccess(calculateBusinessMargin(baselineInput, context));
    const baselineResultSnapshot = structuredClone(baselineResult);
    const scenario: Scenario = {
      id: "reduce-variable-cost",
      changes: { variableSellingCostPerOrder: "10.00" },
    };

    const outcome = calculateBusinessMarginScenario(baselineInput, context, scenario);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok || !("baseline" in outcome.result)) {
      throw new Error("expected scenario success");
    }
    expect(outcome.result.baseline).toEqual(baselineResultSnapshot);
    expect(outcome.result.scenario.scenarioId).toBe("reduce-variable-cost");
    expect(valueById(outcome.result.scenario, "contributionProfit")).toBe("30.00");
    expect(outcome.result.impact).toMatchObject({ id: "profitImpact", value: "5.00", scale: 2 });
    expect(baselineInput).toEqual(baselineInputSnapshot);
    expect(baselineResult).toEqual(baselineResultSnapshot);
  });

  it("rejects unknown scenario changes", () => {
    const outcome = calculateBusinessMarginScenario(
      { sellingPrice: "100.00", productCost: "60.00" },
      context,
      { id: "unknown", changes: { mysteryInput: "1.00" } },
    );
    expect(outcome).toEqual({
      ok: false,
      issues: [{ path: "scenario.changes.mysteryInput", code: "invalid-combination" }],
    });
  });

  it("emits the quantified 10% reference recommendation only when feasible", () => {
    const triggered = expectSuccess(
      calculateBusinessMargin(
        { sellingPrice: "100.00", productCost: "85.00", variableSellingCostPerOrder: "10.00" },
        context,
      ),
    );
    expect(triggered.recommendations).toEqual([
      {
        id: "simulate-variable-cost-to-10pct-contribution-margin",
        triggerId: "contribution-margin-below-reference-10pct",
        estimatedImpact: { id: "contributionProfitImpact", kind: "decimal", value: "5.00", scale: 2 },
        tradeOffCode: "feasibility-not-modeled",
        changes: { variableSellingCostPerOrder: "-5.00" },
      },
    ]);

    const alreadyHealthy = expectSuccess(
      calculateBusinessMargin(
        { sellingPrice: "100.00", productCost: "60.00", variableSellingCostPerOrder: "10.00" },
        context,
      ),
    );
    expect(alreadyHealthy.recommendations).toBeUndefined();

    const noContext = expectSuccess(calculateBusinessMargin({ sellingPrice: "100.00", productCost: "85.00" }, context));
    expect(noContext.recommendations).toBeUndefined();

    const infeasible = expectSuccess(
      calculateBusinessMargin(
        { sellingPrice: "100.00", productCost: "95.00", variableSellingCostPerOrder: "10.00" },
        context,
      ),
    );
    expect(infeasible.recommendations).toBeUndefined();
  });

  it("normalizes canonical inputs and remains deterministic", () => {
    const input = { sellingPrice: "100", productCost: "60.5", variableSellingCostPerOrder: "5" } as const;
    const first = calculateBusinessMargin(input, context);
    const second = calculateBusinessMargin(input, context);
    expect(first).toEqual(second);
    const result = expectSuccess(first);
    expect(result.normalizedInputs).toEqual({
      sellingPrice: "100.00",
      productCost: "60.50",
      variableSellingCostPerOrder: "5.00",
    });
  });
});
