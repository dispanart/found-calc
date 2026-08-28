import {
  businessMarginCalculatorDefinition,
  calculateBusinessMargin,
  calculateBusinessMarginScenario,
  calculateDiscount,
  calculateSyntheticRuleAmount,
  discountCalculatorDefinition,
  syntheticRuleCalculatorDefinition,
  validationFailure,
  type BusinessMarginInput,
  type CalculationContext,
  type DiscountInput,
  type Scenario,
} from "@found-calc/engine";
import { resolveRuleVersion, syntheticRateRuleVersions } from "@found-calc/rules";

const PHASE_03_REFERENCE_EFFECTIVE_DATE = "2026-08-28";

const contextFor = (
  calculatorVersion: string,
  effectiveDate = PHASE_03_REFERENCE_EFFECTIVE_DATE,
): CalculationContext => ({
  effectiveDate,
  calculatorVersion,
});

export const runDiscount = (input: DiscountInput) =>
  calculateDiscount(input, contextFor(discountCalculatorDefinition.version.version));

export const runBusinessMargin = (input: BusinessMarginInput) =>
  calculateBusinessMargin(input, contextFor(businessMarginCalculatorDefinition.version.version));

export const runBusinessMarginScenario = (input: BusinessMarginInput, scenario: Scenario) =>
  calculateBusinessMarginScenario(
    input,
    contextFor(businessMarginCalculatorDefinition.version.version),
    scenario,
  );

export interface SyntheticRuleRuntimeInput {
  readonly baseAmount: string;
  readonly effectiveDate: string;
}

export const runSyntheticRule = (input: SyntheticRuleRuntimeInput) => {
  const resolution = resolveRuleVersion(syntheticRateRuleVersions, {
    ruleId: "reference.synthetic-rate",
    effectiveDate: input.effectiveDate,
  });

  if (!resolution.ok) {
    return validationFailure([{ path: "effectiveDate", code: resolution.code }]);
  }

  return calculateSyntheticRuleAmount(
    { baseAmount: input.baseAmount },
    {
      effectiveDate: input.effectiveDate,
      calculatorVersion: syntheticRuleCalculatorDefinition.version.version,
      ruleDependencies: [resolution.dependency],
    },
  );
};
