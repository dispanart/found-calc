export interface RuleEffectivePeriod {
  readonly effectiveFrom: string;
  readonly effectiveUntil?: string;
}

export type RuleEffectivePeriodValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: "invalid-effective-period" };

interface RuleInterval extends RuleEffectivePeriod {
  readonly ruleId: string;
}

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

export const isValidRuleIsoDate = (value: string): boolean => {
  const match = ISO_DATE_ONLY.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
};

export const validateRuleEffectivePeriod = (period: RuleEffectivePeriod): RuleEffectivePeriodValidation => {
  if (!isValidRuleIsoDate(period.effectiveFrom)) {
    return { ok: false, code: "invalid-effective-period" };
  }
  if (period.effectiveUntil !== undefined) {
    if (!isValidRuleIsoDate(period.effectiveUntil) || period.effectiveUntil < period.effectiveFrom) {
      return { ok: false, code: "invalid-effective-period" };
    }
  }
  return { ok: true };
};

const intervalsOverlap = (left: RuleEffectivePeriod, right: RuleEffectivePeriod): boolean => {
  const leftEndsBeforeRight = left.effectiveUntil !== undefined && left.effectiveUntil < right.effectiveFrom;
  const rightEndsBeforeLeft = right.effectiveUntil !== undefined && right.effectiveUntil < left.effectiveFrom;
  return !leftEndsBeforeRight && !rightEndsBeforeLeft;
};

export const findOverlappingRuleVersion = <TVersion extends RuleInterval>(
  existing: readonly TVersion[],
  candidate: RuleInterval,
): TVersion | undefined =>
  existing.find((version) => version.ruleId === candidate.ruleId && intervalsOverlap(version, candidate));
