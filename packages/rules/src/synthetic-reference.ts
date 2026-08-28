import type { RuleVersion } from "./rule-version";

export const syntheticRateRuleVersions: readonly RuleVersion<{ ratePercent: string }>[] = [
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
