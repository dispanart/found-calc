import type { RuleDependency } from "@found-calc/engine";
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
  | { readonly ok: true; readonly dependency: RuleDependency<TPayload> }
  | { readonly ok: false; readonly code: RuleResolutionFailureCode };

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const isLeapYear = (year: number): boolean => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const daysInMonth = (year: number, month: number): number => {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
};

const isValidIsoDateOnly = (value: string): boolean => {
  const match = ISO_DATE_ONLY.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1 || month < 1 || month > 12 || day < 1) {
    return false;
  }

  return day <= daysInMonth(year, month);
};

const coversEffectiveDate = <TPayload>(version: RuleVersion<TPayload>, effectiveDate: string): boolean =>
  version.effectiveFrom <= effectiveDate &&
  (version.effectiveUntil === undefined || effectiveDate <= version.effectiveUntil);

export const resolveRuleVersion = <TPayload>(
  versions: readonly RuleVersion<TPayload>[],
  request: ResolveRuleVersionRequest,
): RuleResolutionResult<TPayload> => {
  if (!isValidIsoDateOnly(request.effectiveDate)) {
    return { ok: false, code: "invalid-effective-date" };
  }

  const candidates = versions.filter(
    (version) =>
      version.ruleId === request.ruleId &&
      (request.pinnedVersionId === undefined || version.versionId === request.pinnedVersionId) &&
      coversEffectiveDate(version, request.effectiveDate),
  );

  if (candidates.length === 0) {
    return { ok: false, code: "rule-unavailable" };
  }

  if (candidates.length > 1) {
    return { ok: false, code: "rule-ambiguous" };
  }

  return { ok: true, dependency: candidates[0]! };
};
