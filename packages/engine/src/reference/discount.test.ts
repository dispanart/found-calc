import { describe, expect, it } from "vitest";
import type { CalculationContext, CalculationResult } from "../contracts";
import { calculateDiscount } from "./discount";

const context: CalculationContext = {
  effectiveDate: "2026-08-28",
  calculatorVersion: "1.0.0",
};

const expectSuccess = (outcome: ReturnType<typeof calculateDiscount>): CalculationResult => {
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

describe("discount reference calculator", () => {
  it("calculates a known-answer single discount", () => {
    const result = expectSuccess(calculateDiscount({ baseAmount: "100.00", discountPercentages: ["10"] }, context));
    expect(result.primaryAnswer).toMatchObject({ id: "finalAmount", value: "90.00", scale: 2 });
    expect(valueById(result, "absoluteSaving")).toBe("10.00");
    expect(valueById(result, "effectiveDiscountPercent")).toBe("10.0000");
  });

  it("stacks discounts sequentially rather than summing percentages", () => {
    const result = expectSuccess(
      calculateDiscount({ baseAmount: "100.00", discountPercentages: ["10", "20"] }, context),
    );
    expect(result.primaryAnswer.value).toBe("72.00");
    expect(valueById(result, "absoluteSaving")).toBe("28.00");
    expect(valueById(result, "effectiveDiscountPercent")).toBe("28.0000");
    expect(valueById(result, "remainingAmountAfterDiscount.0")).toBe("90.00");
    expect(valueById(result, "remainingAmountAfterDiscount.1")).toBe("72.00");
  });

  it("handles zero amount, 0%, 100%, and an empty discount list", () => {
    expect(expectSuccess(calculateDiscount({ baseAmount: "0.00", discountPercentages: ["25"] }, context)).primaryAnswer.value).toBe("0.00");
    expect(expectSuccess(calculateDiscount({ baseAmount: "10.00", discountPercentages: ["0"] }, context)).primaryAnswer.value).toBe("10.00");
    expect(expectSuccess(calculateDiscount({ baseAmount: "10.00", discountPercentages: ["100"] }, context)).primaryAnswer.value).toBe("0.00");
    expect(expectSuccess(calculateDiscount({ baseAmount: "10.00", discountPercentages: [] }, context)).primaryAnswer.value).toBe("10.00");
  });

  it("returns typed validation failures for invalid amounts and percentages", () => {
    expect(calculateDiscount({ baseAmount: "-1.00", discountPercentages: ["10"] }, context)).toEqual({
      ok: false,
      issues: [{ path: "baseAmount", code: "out-of-range" }],
    });
    expect(calculateDiscount({ baseAmount: "10.00", discountPercentages: ["-1", "101"] }, context)).toEqual({
      ok: false,
      issues: [
        { path: "discountPercentages[0]", code: "out-of-range" },
        { path: "discountPercentages[1]", code: "out-of-range" },
      ],
    });
    expect(calculateDiscount({ baseAmount: "10,00", discountPercentages: ["10.00000"] }, context)).toEqual({
      ok: false,
      issues: [
        { path: "baseAmount", code: "malformed-number" },
        { path: "discountPercentages[0]", code: "scale-exceeded" },
      ],
    });
  });

  it("rounds remaining money after each stacked-discount step", () => {
    const result = expectSuccess(calculateDiscount({ baseAmount: "0.05", discountPercentages: ["10", "10"] }, context));
    expect(valueById(result, "remainingAmountAfterDiscount.0")).toBe("0.05");
    expect(valueById(result, "remainingAmountAfterDiscount.1")).toBe("0.05");
    expect(result.primaryAnswer.value).toBe("0.05");
  });

  it("normalizes inputs and is structurally deterministic", () => {
    const input = { baseAmount: "100", discountPercentages: ["10.5", "20"] } as const;
    const first = calculateDiscount(input, context);
    const second = calculateDiscount(input, context);
    expect(first).toEqual(second);
    const result = expectSuccess(first);
    expect(result.normalizedInputs).toEqual({
      baseAmount: "100.00",
      discountPercentages: ["10.5000", "20.0000"],
    });
    expect(result.classification).toBe("exact/deterministic");
  });
});
