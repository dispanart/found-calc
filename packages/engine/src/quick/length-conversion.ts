import {
  calculationSuccess,
  validationFailure,
  type CalculationContext,
  type CalculationOutcome,
  type CalculatorDefinition,
  type ResultValue,
  type ValidationIssue,
} from "../contracts";
import {
  compareDecimal,
  decimalFromUnits,
  divideDecimal,
  formatDecimal,
  multiplyDecimal,
  parseDecimal,
} from "../decimal";

export const LENGTH_UNITS = ["mm", "cm", "m", "km", "in", "ft", "yd", "mi"] as const;
export type LengthUnit = (typeof LENGTH_UNITS)[number];

export interface LengthConversionInput {
  readonly value: string;
  readonly fromUnit: LengthUnit;
  readonly toUnit: LengthUnit;
}

const NANOMETRES_PER_UNIT: Readonly<Record<LengthUnit, bigint>> = {
  mm: 1_000_000n,
  cm: 10_000_000n,
  m: 1_000_000_000n,
  km: 1_000_000_000_000n,
  in: 25_400_000n,
  ft: 304_800_000n,
  yd: 914_400_000n,
  mi: 1_609_344_000_000n,
};

export const lengthConversionCalculatorDefinition: CalculatorDefinition = {
  id: "quick.length-conversion",
  version: {
    id: "quick.length-conversion@1.0.0",
    calculatorId: "quick.length-conversion",
    version: "1.0.0",
  },
  classification: "exact/deterministic",
  inputs: [
    { id: "value", kind: "decimal", requirement: "required", scale: 6, min: "0.000000" },
    { id: "fromUnit", kind: "select", requirement: "required", options: LENGTH_UNITS },
    { id: "toUnit", kind: "select", requirement: "required", options: LENGTH_UNITS },
  ],
};

export const isLengthUnit = (value: unknown): value is LengthUnit =>
  typeof value === "string" && (LENGTH_UNITS as readonly string[]).includes(value);

const resultValue = (id: string, value: string): ResultValue => ({
  id,
  kind: "decimal",
  value,
  scale: 8,
});

export const calculateLengthConversion = (
  input: LengthConversionInput,
  context: CalculationContext,
): CalculationOutcome => {
  const issues: ValidationIssue[] = [];
  const parsedValue = parseDecimal(input.value, 6);
  if (!parsedValue.ok) {
    issues.push({ path: "value", code: parsedValue.code });
  } else if (compareDecimal(parsedValue.value, decimalFromUnits(0n, 6)) < 0) {
    issues.push({ path: "value", code: "out-of-range" });
  }

  if (!isLengthUnit(input.fromUnit)) issues.push({ path: "fromUnit", code: "invalid-combination" });
  if (!isLengthUnit(input.toUnit)) issues.push({ path: "toUnit", code: "invalid-combination" });

  if (issues.length > 0 || !parsedValue.ok || !isLengthUnit(input.fromUnit) || !isLengthUnit(input.toUnit)) {
    return validationFailure(issues);
  }

  const numeratorFactor = decimalFromUnits(NANOMETRES_PER_UNIT[input.fromUnit], 0);
  const denominatorFactor = decimalFromUnits(NANOMETRES_PER_UNIT[input.toUnit], 0);
  const nanometres = multiplyDecimal(parsedValue.value, numeratorFactor, 6);
  const converted = divideDecimal(nanometres, denominatorFactor, 8);

  return calculationSuccess({
    calculatorId: lengthConversionCalculatorDefinition.id,
    calculatorVersion: context.calculatorVersion,
    classification: lengthConversionCalculatorDefinition.classification,
    normalizedInputs: {
      value: formatDecimal(parsedValue.value),
      fromUnit: input.fromUnit,
      toUnit: input.toUnit,
    },
    assumptions: context.assumptions ?? [],
    primaryAnswer: resultValue("convertedValue", formatDecimal(converted)),
    sections: [],
  });
};
