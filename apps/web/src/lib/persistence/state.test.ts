import { describe, expect, it } from "vitest";

import { parsePersistedCalculatorState } from "./state";

describe("parsePersistedCalculatorState", () => {
  it("accepts the three canonical Phase 03 state shapes", () => {
    expect(parsePersistedCalculatorState({
      calculatorId: "reference.discount",
      calculatorVersion: "1.0.0",
      input: { baseAmount: "100.00", discountPercentages: ["10.0000", "5.5000"] },
    })).toEqual({
      ok: true,
      value: {
        calculatorId: "reference.discount",
        calculatorVersion: "1.0.0",
        input: { baseAmount: "100.00", discountPercentages: ["10.0000", "5.5000"] },
      },
    });

    expect(parsePersistedCalculatorState({
      calculatorId: "reference.business-margin",
      calculatorVersion: "1.0.0",
      input: {
        sellingPrice: "125.00",
        productCost: "80.00",
        variableSellingCostPerOrder: "5.00",
        scenarioVariableSellingCostPerOrder: "4.00",
      },
    }).ok).toBe(true);

    expect(parsePersistedCalculatorState({
      calculatorId: "reference.synthetic-rule",
      calculatorVersion: "1.0.0",
      input: { baseAmount: "250.00", effectiveDate: "2026-08-28" },
    }).ok).toBe(true);
  });

  it("rejects localized, exponent, leading-zero, over-scale, out-of-range and unknown input", () => {
    const invalidStates = [
      { calculatorId: "reference.discount", calculatorVersion: "1.0.0", input: { baseAmount: "1.000,00", discountPercentages: ["10.0000"] } },
      { calculatorId: "reference.discount", calculatorVersion: "1.0.0", input: { baseAmount: "1e2", discountPercentages: ["10.0000"] } },
      { calculatorId: "reference.discount", calculatorVersion: "1.0.0", input: { baseAmount: "01.00", discountPercentages: ["10.0000"] } },
      { calculatorId: "reference.discount", calculatorVersion: "1.0.0", input: { baseAmount: "10.001", discountPercentages: ["10.0000"] } },
      { calculatorId: "reference.discount", calculatorVersion: "1.0.0", input: { baseAmount: "10.00", discountPercentages: ["100.0001"] } },
      { calculatorId: "reference.business-margin", calculatorVersion: "1.0.0", input: { sellingPrice: "0.00", productCost: "0.00" } },
      { calculatorId: "reference.synthetic-rule", calculatorVersion: "1.0.0", input: { baseAmount: "1.00", effectiveDate: "2026-02-30" } },
      { calculatorId: "reference.unknown", calculatorVersion: "1.0.0", input: {} },
      { calculatorId: "reference.discount", calculatorVersion: "2.0.0", input: { baseAmount: "10.00", discountPercentages: ["10.0000"] } },
      { calculatorId: "reference.discount", calculatorVersion: "1.0.0", input: { baseAmount: "10.00", discountPercentages: ["10.0000"], extra: "no" } },
    ];

    for (const value of invalidStates) {
      expect(parsePersistedCalculatorState(value).ok).toBe(false);
    }
  });

  it("caps sequential discount state to prevent oversized arrays", () => {
    expect(parsePersistedCalculatorState({
      calculatorId: "reference.discount",
      calculatorVersion: "1.0.0",
      input: { baseAmount: "10.00", discountPercentages: Array.from({ length: 21 }, () => "1.0000") },
    })).toEqual({ ok: false, code: "invalid-state" });
  });
});
