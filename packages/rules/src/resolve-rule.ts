import type { RuleVersion } from "./rule-version";

export type RuleResolutionFailureCode =
  | "invalid-effective-date"
  | "rule-unavailable"
  | "rule-ambiguous";

export interface ResolveRuleVersionRequest {
  readonly ruleId: string;
  readonly effectiveDate: string;
  readonly pinnedVersionId?: string;
}

export type RuleResolutionResult<TPayload> =
  | { readonly ok: true; readonly dependency: RuleVersion<TPayload> }
  | { readonly ok: false; readonly code: RuleResolutionFailureCode };

export const resolveRuleVersion = <TPayload>(
  _versions: readonly RuleVersion<TPayload>[],
  _request: ResolveRuleVersionRequest,
): RuleResolutionResult<TPayload> => ({ ok: false, code: "rule-unavailable" });
