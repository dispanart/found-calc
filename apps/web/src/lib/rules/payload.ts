import { validateRuleEffectivePeriod } from "@found-calc/rules";

export const SYNTHETIC_RATE_RULE_ID = "reference.synthetic-rate" as const;
export const MAX_RULE_REQUEST_BYTES = 16 * 1024;

export interface SyntheticRatePayload {
  readonly ratePercent: string;
}

export interface SupportedRuleDraft {
  readonly ruleId: typeof SYNTHETIC_RATE_RULE_ID;
  readonly versionId: string;
  readonly effectiveFrom: string;
  readonly effectiveUntil?: string;
  readonly payload: SyntheticRatePayload;
  readonly provenance: {
    readonly sourceId: string;
    readonly sourceUrl?: string;
  };
}

export type SupportedRuleDraftParseResult =
  | { readonly ok: true; readonly value: SupportedRuleDraft }
  | { readonly ok: false; readonly code: "invalid-rule-draft" };

const objectWithOnlyKeys = (value: unknown, keys: readonly string[]): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return actual.every((key) => keys.includes(key)) && actual.length === new Set(actual).size;
};

const isCanonicalRatePercent = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,4}))?$/.exec(value);
  if (!match) return false;
  const [integer, fraction = ""] = value.split(".");
  const units = BigInt(integer!) * 10_000n + BigInt(fraction.padEnd(4, "0") || "0");
  return units >= 0n && units <= 1_000_000n;
};

const isHttpUrl = (value: string): boolean => {
  if (value.length > 2048) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const isVersionId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value);

const isSourceId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 120 && value.trim() === value;

export const parseSupportedRuleDraft = (value: unknown): SupportedRuleDraftParseResult => {
  if (!objectWithOnlyKeys(value, ["ruleId", "versionId", "effectiveFrom", "effectiveUntil", "payload", "provenance"])) {
    return { ok: false, code: "invalid-rule-draft" };
  }
  if (value.ruleId !== SYNTHETIC_RATE_RULE_ID || !isVersionId(value.versionId)) {
    return { ok: false, code: "invalid-rule-draft" };
  }
  if (typeof value.effectiveFrom !== "string") return { ok: false, code: "invalid-rule-draft" };
  if (value.effectiveUntil !== undefined && typeof value.effectiveUntil !== "string") {
    return { ok: false, code: "invalid-rule-draft" };
  }
  const period = validateRuleEffectivePeriod({
    effectiveFrom: value.effectiveFrom,
    ...(value.effectiveUntil === undefined ? {} : { effectiveUntil: value.effectiveUntil }),
  });
  if (!period.ok) return { ok: false, code: "invalid-rule-draft" };

  if (!objectWithOnlyKeys(value.payload, ["ratePercent"]) || !isCanonicalRatePercent(value.payload.ratePercent)) {
    return { ok: false, code: "invalid-rule-draft" };
  }
  if (!objectWithOnlyKeys(value.provenance, ["sourceId", "sourceUrl"]) || !isSourceId(value.provenance.sourceId)) {
    return { ok: false, code: "invalid-rule-draft" };
  }
  if (value.provenance.sourceUrl !== undefined &&
      (typeof value.provenance.sourceUrl !== "string" || !isHttpUrl(value.provenance.sourceUrl))) {
    return { ok: false, code: "invalid-rule-draft" };
  }

  return {
    ok: true,
    value: {
      ruleId: SYNTHETIC_RATE_RULE_ID,
      versionId: value.versionId,
      effectiveFrom: value.effectiveFrom,
      ...(value.effectiveUntil === undefined ? {} : { effectiveUntil: value.effectiveUntil }),
      payload: { ratePercent: value.payload.ratePercent },
      provenance: {
        sourceId: value.provenance.sourceId,
        ...(value.provenance.sourceUrl === undefined ? {} : { sourceUrl: value.provenance.sourceUrl }),
      },
    },
  };
};
