import {
  validationFailure,
  type CalculationContext,
  type CalculationOutcome,
  type CalculatorDefinition,
} from "../contracts";

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
  inputs: [],
  ruleDependencies: [{ ruleId: "reference.synthetic-rate", required: true }],
};

export const calculateSyntheticRuleAmount = (
  _input: SyntheticRuleInput,
  _context: CalculationContext,
): CalculationOutcome => validationFailure([{ path: "ruleDependencies", code: "rule-unavailable" }]);
