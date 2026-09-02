import {
  businessMarginCalculatorDefinition,
  calculateBusinessMargin,
  calculateBusinessMarginScenario,
  calculateDateDifference,
  calculateDiscount,
  calculateLengthConversion,
  calculatePercentage,
  calculateSyntheticRuleAmount,
  dateDifferenceCalculatorDefinition,
  discountCalculatorDefinition,
  lengthConversionCalculatorDefinition,
  percentageCalculatorDefinition,
  syntheticRuleCalculatorDefinition,
  validationFailure,
  type BusinessMarginInput,
  type CalculationContext,
  type DateDifferenceInput,
  type DiscountInput,
  type LengthConversionInput,
  type PercentageInput,
  type Scenario,
} from "@found-calc/engine";
import { resolveRuleVersion, type RuleVersion } from "@found-calc/rules";

const PHASE_03_REFERENCE_EFFECTIVE_DATE = "2026-08-28";
const PHASE_08A_EFFECTIVE_DATE = "2026-09-01";

const contextFor = (
  calculatorVersion: string,
  effectiveDate = PHASE_03_REFERENCE_EFFECTIVE_DATE,
): CalculationContext => ({ effectiveDate, calculatorVersion });

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

export const runSyntheticRule = (
  input: SyntheticRuleRuntimeInput,
  versions: readonly RuleVersion<{ ratePercent: string }>[],
) => {
  const resolution = resolveRuleVersion(versions, {
    ruleId: "reference.synthetic-rate",
    effectiveDate: input.effectiveDate,
  });

  if (!resolution.ok) return validationFailure([{ path: "effectiveDate", code: resolution.code }]);

  return calculateSyntheticRuleAmount(
    { baseAmount: input.baseAmount },
    {
      effectiveDate: input.effectiveDate,
      calculatorVersion: syntheticRuleCalculatorDefinition.version.version,
      ruleDependencies: [resolution.dependency],
    },
  );
};

export const runPercentage = (input: PercentageInput) =>
  calculatePercentage(
    input,
    contextFor(percentageCalculatorDefinition.version.version, PHASE_08A_EFFECTIVE_DATE),
  );

export const runDateDifference = (input: DateDifferenceInput) =>
  calculateDateDifference(
    input,
    contextFor(dateDifferenceCalculatorDefinition.version.version, PHASE_08A_EFFECTIVE_DATE),
  );

export const runLengthConversion = (input: LengthConversionInput) =>
  calculateLengthConversion(
    input,
    contextFor(lengthConversionCalculatorDefinition.version.version, PHASE_08A_EFFECTIVE_DATE),
  );
