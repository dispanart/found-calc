import { describe, expect, it } from "vitest";
import {
  addDecimal,
  compareDecimal,
  decimalFromUnits,
  divideDecimal,
  formatDecimal,
  multiplyDecimal,
  parseDecimal,
  rescaleHalfUp,
  subtractDecimal,
} from "./decimal";

describe("canonical decimal arithmetic", () => {
  it("parses locale-independent canonical decimals at an explicit scale", () => {
    expect(parseDecimal("0", 2)).toEqual({ ok: true, value: { units: 0n, scale: 2 } });
    expect(parseDecimal("10.5", 2)).toEqual({ ok: true, value: { units: 1050n, scale: 2 } });
    expect(parseDecimal("10.50", 2)).toEqual({ ok: true, value: { units: 1050n, scale: 2 } });
    expect(parseDecimal("-1.25", 2)).toEqual({ ok: true, value: { units: -125n, scale: 2 } });
  });

  it("rejects locale, exponent, and excess-scale numeric forms", () => {
    expect(parseDecimal("1,5", 2)).toEqual({ ok: false, code: "malformed-number" });
    expect(parseDecimal("1e2", 2)).toEqual({ ok: false, code: "malformed-number" });
    expect(parseDecimal("01.00", 2)).toEqual({ ok: false, code: "malformed-number" });
    expect(parseDecimal("10.005", 2)).toEqual({ ok: false, code: "scale-exceeded" });
  });

  it("formats exactly at the stored scale", () => {
    expect(formatDecimal(decimalFromUnits(1050n, 2))).toBe("10.50");
    expect(formatDecimal(decimalFromUnits(-5n, 2))).toBe("-0.05");
    expect(formatDecimal(decimalFromUnits(5n, 0))).toBe("5");
  });

  it("adds and subtracts deterministically across scales", () => {
    expect(formatDecimal(addDecimal(decimalFromUnits(125n, 2), decimalFromUnits(25n, 1)))).toBe("3.75");
    expect(formatDecimal(subtractDecimal(decimalFromUnits(500n, 2), decimalFromUnits(125n, 2)))).toBe("3.75");
  });

  it("multiplies and divides to an explicit target scale using round-half-up", () => {
    expect(formatDecimal(multiplyDecimal(decimalFromUnits(1999n, 2), decimalFromUnits(1250n, 2), 2))).toBe("249.88");
    expect(formatDecimal(divideDecimal(decimalFromUnits(100n, 2), decimalFromUnits(300n, 2), 4))).toBe("0.3333");
  });

  it("rounds half up symmetrically for positive and negative values", () => {
    expect(formatDecimal(rescaleHalfUp(decimalFromUnits(1005n, 3), 2))).toBe("1.01");
    expect(formatDecimal(rescaleHalfUp(decimalFromUnits(-1005n, 3), 2))).toBe("-1.01");
    expect(formatDecimal(rescaleHalfUp(decimalFromUnits(1004n, 3), 2))).toBe("1.00");
  });

  it("compares numeric value rather than representation scale", () => {
    expect(compareDecimal(decimalFromUnits(100n, 2), decimalFromUnits(10n, 1))).toBe(0);
    expect(compareDecimal(decimalFromUnits(101n, 2), decimalFromUnits(10n, 1))).toBe(1);
    expect(compareDecimal(decimalFromUnits(99n, 2), decimalFromUnits(10n, 1))).toBe(-1);
  });

  it("fails fast on division by zero", () => {
    expect(() => divideDecimal(decimalFromUnits(100n, 2), decimalFromUnits(0n, 2), 2)).toThrow("division by zero");
  });
});
