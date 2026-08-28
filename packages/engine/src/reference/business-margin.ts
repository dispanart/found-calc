import {
  validationFailure,
  type CalculationContext,
  type CalculationFailure,
  type CalculationOutcome,
  type CalculationResult,
  type CalculatorDefinition,
  type ResultValue,
  type Scenario,
} from "../contracts";

export interface BusinessMarginInput {
  readonly sellingPrice: string;
  readonly productCost: string;
  readonly variableSellingCostPerOrder?: string;
}

export interface BusinessMarginScenarioResult {
  readonly baseline: CalculationResult;
  readonly scenario: CalculationResult;
  readonly impact: ResultValue;
}

export type BusinessMarginScenarioOutcome =
  | CalculationFailure
  | { readonly ok: true; readonly result: BusinessMarginScenarioResult };

export const businessMarginCalculatorDefinition: CalculatorDefinition = {
  id: "reference.business-margin",
  version: {
    id: "reference.business-margin@1.0.0",
    calculatorId: "reference.business-margin",
    version: "1.0.0",
  },
  classification: "exact/deterministic",
  inputs: [],
};

export const calculateBusinessMargin = (
  _input: BusinessMarginInput,
  _context: CalculationContext,
): CalculationOutcome => validationFailure([]);

export const calculateBusinessMarginScenario = (
  _baselineInput: BusinessMarginInput,
  _context: CalculationContext,
  _scenario: Scenario,
): BusinessMarginScenarioOutcome => validationFailure([]);
