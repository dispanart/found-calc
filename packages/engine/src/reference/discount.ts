import {
  validationFailure,
  type CalculationContext,
  type CalculationOutcome,
  type CalculatorDefinition,
} from "../contracts";

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
  inputs: [],
};

export const calculateDiscount = (_input: DiscountInput, _context: CalculationContext): CalculationOutcome =>
  validationFailure([]);
