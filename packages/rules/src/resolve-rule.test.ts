import { describe, expect, it } from "vitest";
import { resolveRuleVersion } from "./resolve-rule";
import type { RuleVersion } from "./rule-version";

const versions: readonly RuleVersion<{ ratePercent: string }>[] = [
  {
    ruleId: "reference.synthetic-rate",
    versionId: "2025-a",
    effectiveFrom: "2025-01-01",
    effectiveUntil: "2025-12-31",
    payload: { ratePercent: "5" },
    provenance: { sourceId: "synthetic-reference-fixture" },
  },
  {
    ruleId: "reference.synthetic-rate",
    versionId: "2026-a",
    effectiveFrom: "2026-01-01",
    payload: { ratePercent: "7.5" },
    provenance: { sourceId: "synthetic-reference-fixture" },
  },
];

describe("immutable rule resolution", () => {
  it("resolves exactly one matching effective period", () => {
    expect(resolveRuleVersion(versions, { ruleId: "reference.synthetic-rate", effectiveDate: "2025-06-01" })).toEqual({
      ok: true,
      dependency: {
        ruleId: "reference.synthetic-rate",
        versionId: "2025-a",
        effectiveFrom: "2025-01-01",
        effectiveUntil: "2025-12-31",
        payload: { ratePercent: "5" },
        provenance: { sourceId: "synthetic-reference-fixture" },
      },
    });
  });

  it("rejects malformed, timestamp, and impossible calendar dates", () => {
    for (const effectiveDate of ["2026/01/01", "2026-01-01T00:00:00Z", "2026-02-30"]) {
      expect(resolveRuleVersion(versions, { ruleId: "reference.synthetic-rate", effectiveDate })).toEqual({
        ok: false,
        code: "invalid-effective-date",
      });
    }
  });

  it("returns unavailable for gaps instead of guessing", () => {
    const gapVersions: readonly RuleVersion<{ ratePercent: string }>[] = [
      { ...versions[0]!, effectiveUntil: "2025-06-30" },
      { ...versions[1]!, effectiveFrom: "2026-01-01" },
    ];
    expect(resolveRuleVersion(gapVersions, { ruleId: "reference.synthetic-rate", effectiveDate: "2025-09-01" })).toEqual({
      ok: false,
      code: "rule-unavailable",
    });
  });

  it("returns ambiguous when multiple versions cover the same date", () => {
    const overlapVersions: readonly RuleVersion<{ ratePercent: string }>[] = [
      versions[0]!,
      {
        ...versions[0]!,
        versionId: "2025-overlap",
        effectiveFrom: "2025-06-01",
        effectiveUntil: "2025-12-31",
      },
    ];
    expect(resolveRuleVersion(overlapVersions, { ruleId: "reference.synthetic-rate", effectiveDate: "2025-07-01" })).toEqual({
      ok: false,
      code: "rule-ambiguous",
    });
  });

  it("pins an immutable historical version only inside its effective period", () => {
    expect(
      resolveRuleVersion(versions, {
        ruleId: "reference.synthetic-rate",
        effectiveDate: "2025-06-01",
        pinnedVersionId: "2025-a",
      }),
    ).toMatchObject({ ok: true, dependency: { versionId: "2025-a", payload: { ratePercent: "5" } } });

    expect(
      resolveRuleVersion(versions, {
        ruleId: "reference.synthetic-rate",
        effectiveDate: "2026-06-01",
        pinnedVersionId: "2025-a",
      }),
    ).toEqual({ ok: false, code: "rule-unavailable" });

    expect(
      resolveRuleVersion(versions, {
        ruleId: "reference.synthetic-rate",
        effectiveDate: "2025-06-01",
        pinnedVersionId: "missing",
      }),
    ).toEqual({ ok: false, code: "rule-unavailable" });
  });

  it("does not mutate versions, payloads, or input ordering", () => {
    const mutableCopy = versions.map((version) => ({ ...version, payload: { ...version.payload } }));
    const snapshot = structuredClone(mutableCopy);
    resolveRuleVersion(mutableCopy, { ruleId: "reference.synthetic-rate", effectiveDate: "2026-06-01" });
    expect(mutableCopy).toEqual(snapshot);
  });
});
