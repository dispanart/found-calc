import { describe, expect, it } from "vitest";

import { runDateDifference, runLengthConversion, runPercentage } from "./runtime";

describe("Phase 08A calculator runtime", () => {
  it("runs the three new deterministic calculators through the shared runtime boundary", () => {
    const percentage = runPercentage({ baseValue: "250", percentage: "12.5" });
    expect(percentage.ok && percentage.result.primaryAnswer.value).toBe("31.250000");

    const date = runDateDifference({ startDate: "2024-02-28", endDate: "2024-03-01" });
    expect(date.ok && date.result.primaryAnswer.value).toBe("2");

    const conversion = runLengthConversion({ value: "1", fromUnit: "in", toUnit: "cm" });
    expect(conversion.ok && conversion.result.primaryAnswer.value).toBe("2.54000000");
  });
});
