import { describe, expect, it } from "vitest";
import type { CalculationContext } from "../contracts";
import { calculateLengthConversion, type LengthConversionInput } from "./length-conversion";

const context: CalculationContext = { effectiveDate: "2026-09-01", calculatorVersion: "1.0.0" };
const converted = (input: LengthConversionInput) => {
  const result = calculateLengthConversion(input, context);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.result.primaryAnswer.value;
};

describe("length conversion calculator", () => {
  it("uses exact international length factors", () => {
    expect(converted({ value: "1", fromUnit: "in", toUnit: "cm" })).toBe("2.54000000");
    expect(converted({ value: "1", fromUnit: "mi", toUnit: "km" })).toBe("1.60934400");
    expect(converted({ value: "1", fromUnit: "m", toUnit: "mm" })).toBe("1000.00000000");
    expect(converted({ value: "3", fromUnit: "ft", toUnit: "yd" })).toBe("1.00000000");
    expect(converted({ value: "12.345678", fromUnit: "m", toUnit: "m" })).toBe("12.34567800");
  });

  it("rejects negative values and unsupported units at runtime", () => {
    expect(calculateLengthConversion({ value: "-1", fromUnit: "m", toUnit: "cm" }, context)).toEqual({ ok: false, issues: [{ path: "value", code: "out-of-range" }] });
    expect(calculateLengthConversion({ value: "1", fromUnit: "parsec" as never, toUnit: "m" }, context)).toEqual({ ok: false, issues: [{ path: "fromUnit", code: "invalid-combination" }] });
  });
});
