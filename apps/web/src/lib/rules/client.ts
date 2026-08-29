import type { RuleVersion } from "@found-calc/rules";
import { parseSupportedRuleDraft, SYNTHETIC_RATE_RULE_ID, type SyntheticRatePayload } from "./payload";

export interface PublishedSyntheticRuleVersion extends RuleVersion<SyntheticRatePayload> {
  readonly provenance: RuleVersion<SyntheticRatePayload>["provenance"] & { readonly sourceUrl?: string };
}

const objectWithOnlyKeys = (value: unknown, keys: readonly string[]): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.keys(value).every((key) => keys.includes(key));
};

export const parsePublishedRuleFeed = (value: unknown): readonly PublishedSyntheticRuleVersion[] | null => {
  if (!objectWithOnlyKeys(value, ["ruleId", "versions"]) || value.ruleId !== SYNTHETIC_RATE_RULE_ID || !Array.isArray(value.versions)) {
    return null;
  }

  const identities = new Set<string>();
  const versions: PublishedSyntheticRuleVersion[] = [];
  for (const candidate of value.versions) {
    if (!objectWithOnlyKeys(candidate, ["ruleId", "versionId", "effectiveFrom", "effectiveUntil", "payload", "provenance"])) {
      return null;
    }
    const parsed = parseSupportedRuleDraft(candidate);
    if (!parsed.ok) return null;
    const identity = `${parsed.value.ruleId}\u0000${parsed.value.versionId}`;
    if (identities.has(identity)) return null;
    identities.add(identity);
    versions.push({
      ruleId: parsed.value.ruleId,
      versionId: parsed.value.versionId,
      effectiveFrom: parsed.value.effectiveFrom,
      ...(parsed.value.effectiveUntil === undefined ? {} : { effectiveUntil: parsed.value.effectiveUntil }),
      payload: parsed.value.payload,
      provenance: parsed.value.provenance,
    });
  }
  return versions;
};

export const fetchPublishedRuleVersions = async (
  ruleId: typeof SYNTHETIC_RATE_RULE_ID,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<readonly PublishedSyntheticRuleVersion[]> => {
  const response = await fetcher(`/api/rules/${encodeURIComponent(ruleId)}/versions`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error("rule-feed-unavailable");
  const parsed = parsePublishedRuleFeed(await response.json());
  if (!parsed) throw new Error("rule-feed-invalid");
  return parsed;
};
