import {
  calculationSuccess,
  validationFailure,
  type CalculationContext,
  type CalculationOutcome,
  type CalculatorDefinition,
  type ResultValue,
  type ValidationIssue,
} from "../contracts";
import { decimalFromUnits, formatDecimal } from "../decimal";

export interface DateDifferenceInput {
  readonly startDate: string;
  readonly endDate: string;
}

export interface CalendarDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export const dateDifferenceCalculatorDefinition: CalculatorDefinition = {
  id: "quick.date-difference",
  version: {
    id: "quick.date-difference@1.0.0",
    calculatorId: "quick.date-difference",
    version: "1.0.0",
  },
  classification: "exact/deterministic",
  inputs: [
    { id: "startDate", kind: "date", requirement: "required", min: "0001-01-01", max: "9999-12-31" },
    { id: "endDate", kind: "date", requirement: "required", min: "0001-01-01", max: "9999-12-31" },
  ],
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

const isLeapYear = (year: number): boolean =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

export const parseIsoCalendarDate = (value: string): CalendarDate | null => {
  const match = ISO_DATE.exec(value);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || year < 1 || year > 9999) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  const baseMaximum = DAYS_IN_MONTH[month - 1];
  const maximum = month === 2 && isLeapYear(year) ? 29 : baseMaximum;
  if (!Number.isInteger(day) || day < 1 || maximum === undefined || day > maximum) return null;
  return { year, month, day };
};

const dayOrdinal = ({ year, month, day }: CalendarDate): number => {
  const previousYear = year - 1;
  let ordinal = previousYear * 365 + Math.floor(previousYear / 4) - Math.floor(previousYear / 100) + Math.floor(previousYear / 400);
  for (let index = 1; index < month; index += 1) {
    const monthDays = DAYS_IN_MONTH[index - 1];
    if (monthDays !== undefined) ordinal += monthDays;
    if (index === 2 && isLeapYear(year)) ordinal += 1;
  }
  return ordinal + day - 1;
};

export const isIsoCalendarDate = (value: unknown): value is string =>
  typeof value === "string" && parseIsoCalendarDate(value) !== null;

export const compareIsoCalendarDates = (left: string, right: string): -1 | 0 | 1 | null => {
  const parsedLeft = parseIsoCalendarDate(left);
  const parsedRight = parseIsoCalendarDate(right);
  if (parsedLeft === null || parsedRight === null) return null;
  const leftOrdinal = dayOrdinal(parsedLeft);
  const rightOrdinal = dayOrdinal(parsedRight);
  return leftOrdinal < rightOrdinal ? -1 : leftOrdinal > rightOrdinal ? 1 : 0;
};

const integerResult = (id: string, value: number): ResultValue => ({
  id,
  kind: "decimal",
  value: formatDecimal(decimalFromUnits(BigInt(value), 0)),
  scale: 0,
  unit: "day",
});

export const calculateDateDifference = (
  input: DateDifferenceInput,
  context: CalculationContext,
): CalculationOutcome => {
  const issues: ValidationIssue[] = [];
  const start = parseIsoCalendarDate(input.startDate);
  const end = parseIsoCalendarDate(input.endDate);
  if (start === null) issues.push({ path: "startDate", code: "invalid-effective-date" });
  if (end === null) issues.push({ path: "endDate", code: "invalid-effective-date" });
  if (issues.length > 0 || start === null || end === null) return validationFailure(issues);

  const startOrdinal = dayOrdinal(start);
  const endOrdinal = dayOrdinal(end);
  if (endOrdinal < startOrdinal) {
    return validationFailure([{ path: "endDate", code: "invalid-date-order" }]);
  }

  const totalDays = endOrdinal - startOrdinal;
  const wholeWeeks = Math.floor(totalDays / 7);
  const remainingDays = totalDays % 7;

  return calculationSuccess({
    calculatorId: dateDifferenceCalculatorDefinition.id,
    calculatorVersion: context.calculatorVersion,
    classification: dateDifferenceCalculatorDefinition.classification,
    normalizedInputs: { startDate: input.startDate, endDate: input.endDate },
    assumptions: context.assumptions ?? [],
    primaryAnswer: integerResult("totalDays", totalDays),
    sections: [{
      id: "breakdown",
      values: [integerResult("wholeWeeks", wholeWeeks), integerResult("remainingDays", remainingDays)],
    }],
  });
};
