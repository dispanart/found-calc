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
  addDecimal,
  compareDecimal,
  decimalFromUnits,
  divideDecimal,
  formatDecimal,
  multiplyDecimal,
  parseDecimal,
  subtractDecimal,
  type Decimal,
} from "../decimal";

export interface PercentageInput {
  readonly baseValue: string;
  readonly percentage: string;
}

export const percentageCalculatorDefinition: CalculatorDefinition = {
  id: "quick.percentage",
  version: {
    id: "quick.percentage@1.0.0",
    calculatorId: "quick.percentage",
    version: "1.0.0",
  },
  classification: "exact/deterministic",
  inputs: [
    { id: "baseValue", kind: "decimal", requirement: "required", scale: 6 },
    {
      id: "percentage",
      kind: "decimal",
      requirement: "required",
      scale: 4,
      min: "0.0000",
      max: "100000.0000",
      unit: "percent",
    },
  ],
};

const ZERO_PERCENT = decimalFromUnits(0n, 4);
const MAX_PERCENT = decimalFromUnits(1_000_000_000n, 4);
const HUNDRED = decimalFromUnits(100n, 0);

const resultValue = (id: string, value: Decimal, scale: number): ResultValue => ({
  id,
  kind: "decimal",
  value: formatDecimal(value),
  scale,
});

export const calculatePercentage = (
  input: PercentageInput,
  context: CalculationContext,
): CalculationOutcome => {
  const issues: ValidationIssue[] = [];
  const parsedBase = parseDecimal(input.baseValue, 6);
  if (!parsedBase.ok) issues.push({ path: "baseValue", code: parsedBase.code });

  const parsedPercentage = parseDecimal(input.percentage, 4);
  if (!parsedPercentage.ok) {
    issues.push({ path: "percentage", code: parsedPercentage.code });
  } else if (
    compareDecimal(parsedPercentage.value, ZERO_PERCENT) < 0 ||
    compareDecimal(parsedPercentage.value, MAX_PERCENT) > 0
  ) {
    issues.push({ path: "percentage", code: "out-of-range" });
  }

  if (issues.length > 0 || !parsedBase.ok || !parsedPercentage.ok) return validationFailure(issues);

  const weighted = multiplyDecimal(parsedBase.value, parsedPercentage.value, 10);
  const percentageAmount = divideDecimal(weighted, HUNDRED, 6);
  const increasedValue = addDecimal(parsedBase.value, percentageAmount);
  const decreasedValue = subtractDecimal(parsedBase.value, percentageAmount);

  return calculationSuccess({
    calculatorId: percentageCalculatorDefinition.id,
    calculatorVersion: context.calculatorVersion,
    classification: percentageCalculatorDefinition.classification,
    normalizedInputs: {
      baseValue: formatDecimal(parsedBase.value),
      percentage: formatDecimal(parsedPercentage.value),
    },
    assumptions: context.assumptions ?? [],
    primaryAnswer: resultValue("percentageAmount", percentageAmount, 6),
    sections: [{
      id: "comparison",
      values: [
        resultValue("increasedValue", increasedValue, 6),
        resultValue("decreasedValue", decreasedValue, 6),
      ],
    }],
  });
};
