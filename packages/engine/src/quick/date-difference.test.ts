import { describe, expect, it } from "vitest";
import type { CalculationContext } from "../contracts";
import { calculateDateDifference } from "./date-difference";

const context: CalculationContext = { effectiveDate: "2026-09-01", calculatorVersion: "1.0.0" };

const days = (startDate: string, endDate: string) => {
  const result = calculateDateDifference({ startDate, endDate }, context);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.result.primaryAnswer.value;
};

describe("date difference calculator", () => {
  it("handles leap years, non-leap years, and equal dates", () => {
    expect(days("2024-02-28", "2024-03-01")).toBe("2");
    expect(days("2025-02-28", "2025-03-01")).toBe("1");
    expect(days("2026-01-01", "2026-01-01")).toBe("0");
    expect(days("2026-01-01", "2026-01-02")).toBe("1");
  });

  it("returns exact weeks and remaining days", () => {
    const result = calculateDateDifference({ startDate: "2026-01-01", endDate: "2026-01-17" }, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.primaryAnswer.value).toBe("16");
    expect(result.result.sections[0]?.values.map((value) => [value.id, value.value])).toEqual([
      ["wholeWeeks", "2"],
      ["remainingDays", "2"],
    ]);
  });

  it("rejects impossible dates and reverse intervals", () => {
    expect(calculateDateDifference({ startDate: "2025-02-29", endDate: "2025-03-01" }, context)).toEqual({ ok: false, issues: [{ path: "startDate", code: "invalid-effective-date" }] });
    expect(calculateDateDifference({ startDate: "2026-02-02", endDate: "2026-02-01" }, context)).toEqual({ ok: false, issues: [{ path: "endDate", code: "invalid-date-order" }] });
  });
});
