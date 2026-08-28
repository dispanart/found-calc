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
  subtractDecimal,
  type Decimal,
} from "../decimal";

export interface DiscountInput {
  readonly baseAmount: string;
  readonly discountPercentages: readonly string[];
}

export const discountCalculatorDefinition: CalculatorDefinition = {
  id: "reference.discount",
  version: {
    id: "reference.discount@1.0.0",
    calculatorId: "reference.discount",
    version: "1.0.0",
  },
  classification: "exact/deterministic",
  inputs: [
    {
      id: "baseAmount",
      kind: "decimal",
      requirement: "required",
      scale: 2,
      min: "0.00",
    },
    {
      id: "discountPercentages",
      kind: "decimal-list",
      requirement: "required",
      scale: 4,
      min: "0.0000",
      max: "100.0000",
      unit: "percent",
    },
  ],
};

const ZERO_MONEY = decimalFromUnits(0n, 2);
const ZERO_PERCENT = decimalFromUnits(0n, 4);
const HUNDRED_PERCENT = decimalFromUnits(1_000_000n, 4);

const resultValue = (id: string, value: Decimal, scale: number): ResultValue => ({
  id,
  kind: "decimal",
  value: formatDecimal(value),
  scale,
});

export const calculateDiscount = (input: DiscountInput, context: CalculationContext): CalculationOutcome => {
  const issues: ValidationIssue[] = [];

  const parsedBaseAmount = parseDecimal(input.baseAmount, 2);
  if (!parsedBaseAmount.ok) {
    issues.push({ path: "baseAmount", code: parsedBaseAmount.code });
  } else if (compareDecimal(parsedBaseAmount.value, ZERO_MONEY) < 0) {
    issues.push({ path: "baseAmount", code: "out-of-range" });
  }

  const parsedPercentages: Decimal[] = [];
  input.discountPercentages.forEach((percentage, index) => {
    const parsed = parseDecimal(percentage, 4);
    if (!parsed.ok) {
      issues.push({ path: `discountPercentages[${index}]`, code: parsed.code });
      return;
    }
    if (compareDecimal(parsed.value, ZERO_PERCENT) < 0 || compareDecimal(parsed.value, HUNDRED_PERCENT) > 0) {
      issues.push({ path: `discountPercentages[${index}]`, code: "out-of-range" });
      return;
    }
    parsedPercentages.push(parsed.value);
  });

  if (issues.length > 0 || !parsedBaseAmount.ok) {
    return validationFailure(issues);
  }

  let remainingAmount = parsedBaseAmount.value;
  const stepValues: ResultValue[] = [];

  parsedPercentages.forEach((percentage, index) => {
    const remainingPercent = subtractDecimal(HUNDRED_PERCENT, percentage);
    const weightedAmount = multiplyDecimal(remainingAmount, remainingPercent, 6);
    remainingAmount = divideDecimal(weightedAmount, HUNDRED_PERCENT, 2);
    stepValues.push(resultValue(`remainingAmountAfterDiscount.${index}`, remainingAmount, 2));
  });

  const absoluteSaving = subtractDecimal(parsedBaseAmount.value, remainingAmount);
  const summaryValues: ResultValue[] = [resultValue("absoluteSaving", absoluteSaving, 2)];

  if (compareDecimal(parsedBaseAmount.value, ZERO_MONEY) !== 0) {
    const savingRatio = divideDecimal(absoluteSaving, parsedBaseAmount.value, 6);
    const effectiveDiscount = multiplyDecimal(savingRatio, HUNDRED_PERCENT, 4);
    summaryValues.push({
      ...resultValue("effectiveDiscountPercent", effectiveDiscount, 4),
      unit: "percent",
    });
  }

  return calculationSuccess({
    calculatorId: discountCalculatorDefinition.id,
    calculatorVersion: context.calculatorVersion,
    classification: discountCalculatorDefinition.classification,
    normalizedInputs: {
      baseAmount: formatDecimal(parsedBaseAmount.value),
      discountPercentages: parsedPercentages.map(formatDecimal),
    },
    assumptions: context.assumptions ?? [],
    primaryAnswer: resultValue("finalAmount", remainingAmount, 2),
    sections: [
      { id: "summary", values: summaryValues },
      { id: "steps", values: stepValues },
    ],
  });
};
