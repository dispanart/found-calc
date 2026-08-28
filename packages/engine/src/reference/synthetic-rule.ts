import {
  calculationSuccess,
  validationFailure,
  type CalculationContext,
  type CalculationOutcome,
  type CalculatorDefinition,
  type RuleDependency,
} from "../contracts";
import {
  compareDecimal,
  decimalFromUnits,
  divideDecimal,
  formatDecimal,
  multiplyDecimal,
  parseDecimal,
} from "../decimal";

export interface SyntheticRuleInput {
  readonly baseAmount: string;
}

export const syntheticRuleCalculatorDefinition: CalculatorDefinition = {
  id: "reference.synthetic-rule",
  version: {
    id: "reference.synthetic-rule@1.0.0",
    calculatorId: "reference.synthetic-rule",
    version: "1.0.0",
  },
  classification: "rule-based",
  inputs: [
    {
      id: "baseAmount",
      kind: "decimal",
      requirement: "required",
      scale: 2,
      min: "0.00",
    },
  ],
  ruleDependencies: [{ ruleId: "reference.synthetic-rate", required: true }],
};

const ZERO_MONEY = decimalFromUnits(0n, 2);
const ZERO_PERCENT = decimalFromUnits(0n, 4);
const HUNDRED_PERCENT = decimalFromUnits(1_000_000n, 4);
const RATE_PATH = "ruleDependencies.reference.synthetic-rate.payload.ratePercent";

const isSyntheticRateDependency = (
  dependency: RuleDependency,
): dependency is RuleDependency<{ ratePercent: string }> =>
  dependency.ruleId === "reference.synthetic-rate" &&
  typeof dependency.payload === "object" &&
  dependency.payload !== null &&
  "ratePercent" in dependency.payload &&
  typeof (dependency.payload as { ratePercent?: unknown }).ratePercent === "string";

export const calculateSyntheticRuleAmount = (
  input: SyntheticRuleInput,
  context: CalculationContext,
): CalculationOutcome => {
  const dependency = context.ruleDependencies?.find(isSyntheticRateDependency);
  if (!dependency) {
    return validationFailure([{ path: "ruleDependencies", code: "rule-unavailable" }]);
  }

  const baseAmount = parseDecimal(input.baseAmount, 2);
  if (!baseAmount.ok) {
    return validationFailure([{ path: "baseAmount", code: baseAmount.code }]);
  }
  if (compareDecimal(baseAmount.value, ZERO_MONEY) < 0) {
    return validationFailure([{ path: "baseAmount", code: "out-of-range" }]);
  }

  const rate = parseDecimal(dependency.payload.ratePercent, 4);
  if (
    !rate.ok ||
    compareDecimal(rate.value, ZERO_PERCENT) < 0 ||
    compareDecimal(rate.value, HUNDRED_PERCENT) > 0
  ) {
    return validationFailure([{ path: RATE_PATH, code: "invalid-combination" }]);
  }

  const weightedAmount = multiplyDecimal(baseAmount.value, rate.value, 6);
  const calculatedAmount = divideDecimal(weightedAmount, HUNDRED_PERCENT, 2);

  return calculationSuccess({
    calculatorId: syntheticRuleCalculatorDefinition.id,
    calculatorVersion: context.calculatorVersion,
    classification: syntheticRuleCalculatorDefinition.classification,
    normalizedInputs: { baseAmount: formatDecimal(baseAmount.value) },
    assumptions: context.assumptions ?? [],
    primaryAnswer: {
      id: "calculatedAmount",
      kind: "decimal",
      value: formatDecimal(calculatedAmount),
      scale: 2,
    },
    sections: [],
    ruleDependencies: [dependency],
  });
};
