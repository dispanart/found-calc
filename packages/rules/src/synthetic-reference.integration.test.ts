import { describe, expect, it } from "vitest";
import { calculateSyntheticRuleAmount } from "@found-calc/engine";
import { resolveRuleVersion } from "./resolve-rule";
import { syntheticRateRuleVersions } from "./synthetic-reference";
import type { RuleVersion } from "./rule-version";

const calculateFor = (
  versions: readonly RuleVersion<{ ratePercent: string }>[],
  effectiveDate: string,
  pinnedVersionId?: string,
) => {
  const resolution = resolveRuleVersion(versions, {
    ruleId: "reference.synthetic-rate",
    effectiveDate,
    ...(pinnedVersionId === undefined ? {} : { pinnedVersionId }),
  });

  expect(resolution.ok).toBe(true);
  if (!resolution.ok) {
    throw new Error(`expected resolution success: ${resolution.code}`);
  }

  const calculation = calculateSyntheticRuleAmount(
    { baseAmount: "100.00" },
    {
      effectiveDate,
      calculatorVersion: "1.0.0",
      ruleDependencies: [resolution.dependency],
    },
  );

  expect(calculation.ok).toBe(true);
  if (!calculation.ok) {
    throw new Error(`expected calculation success: ${JSON.stringify(calculation.issues)}`);
  }

  return { dependency: resolution.dependency, result: calculation.result };
};

describe("synthetic historical rule reproducibility", () => {
  it("resolves 2025 and 2026 fixtures to their known answers", () => {
    const historical = calculateFor(syntheticRateRuleVersions, "2025-06-01");
    expect(historical.dependency.versionId).toBe("2025-a");
    expect(historical.result.primaryAnswer.value).toBe("5.00");

    const current = calculateFor(syntheticRateRuleVersions, "2026-06-01");
    expect(current.dependency.versionId).toBe("2026-a");
    expect(current.result.primaryAnswer.value).toBe("7.50");
  });

  it("keeps explicit historical version pinning reproducible", () => {
    const pinned = calculateFor(syntheticRateRuleVersions, "2025-06-01", "2025-a");
    expect(pinned.dependency.versionId).toBe("2025-a");
    expect(pinned.result.primaryAnswer.value).toBe("5.00");
    expect(pinned.result.ruleDependencies).toEqual([pinned.dependency]);
  });

  it("does not rewrite historical fixtures or results when a future version is appended", () => {
    const historicalVersionSnapshot = structuredClone(syntheticRateRuleVersions[0]);
    const historicalBefore = calculateFor(syntheticRateRuleVersions, "2025-06-01", "2025-a");
    const withFuture: readonly RuleVersion<{ ratePercent: string }>[] = [
      ...syntheticRateRuleVersions,
      {
        ruleId: "reference.synthetic-rate",
        versionId: "2027-a",
        effectiveFrom: "2027-01-01",
        payload: { ratePercent: "9" },
        provenance: { sourceId: "synthetic-reference-fixture" },
      },
    ];
    const historicalAfter = calculateFor(withFuture, "2025-06-01", "2025-a");
    expect(syntheticRateRuleVersions[0]).toEqual(historicalVersionSnapshot);
    expect(historicalAfter).toEqual(historicalBefore);
  });
});
