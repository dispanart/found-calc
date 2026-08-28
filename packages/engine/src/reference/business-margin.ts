import {
  calculationSuccess,
  validationFailure,
  type CalculationContext,
  type CalculationFailure,
  type CalculationOutcome,
  type CalculationResult,
  type CalculatorDefinition,
  type Recommendation,
  type ResultValue,
  type Scenario,
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
  inputs: [
    { id: "sellingPrice", kind: "decimal", requirement: "required", scale: 2, min: "0.01" },
    { id: "productCost", kind: "decimal", requirement: "required", scale: 2, min: "0.00" },
    {
      id: "variableSellingCostPerOrder",
      kind: "decimal",
      requirement: "contextual",
      scale: 2,
      min: "0.00",
    },
  ],
};

const ZERO_MONEY = decimalFromUnits(0n, 2);
const ZERO_PERCENT = decimalFromUnits(0n, 4);
const HUNDRED_PERCENT = decimalFromUnits(1_000_000n, 4);
const TEN_PERCENT = decimalFromUnits(100_000n, 4);

const resultValue = (id: string, value: Decimal, scale: number): ResultValue => ({
  id,
  kind: "decimal",
  value: formatDecimal(value),
  scale,
});

const percentageOfSellingPrice = (amount: Decimal, sellingPrice: Decimal): Decimal => {
  const scaledAmount = multiplyDecimal(amount, HUNDRED_PERCENT, 6);
  return divideDecimal(scaledAmount, sellingPrice, 4);
};

const parseNonNegativeMoney = (
  value: string,
  path: string,
  issues: ValidationIssue[],
): Decimal | undefined => {
  const parsed = parseDecimal(value, 2);
  if (!parsed.ok) {
    issues.push({ path, code: parsed.code });
    return undefined;
  }
  if (compareDecimal(parsed.value, ZERO_MONEY) < 0) {
    issues.push({ path, code: "out-of-range" });
    return undefined;
  }
  return parsed.value;
};

const recommendationForLowContribution = (
  sellingPrice: Decimal,
  grossProfit: Decimal,
  variableCost: Decimal,
  contributionProfit: Decimal,
  contributionMargin: Decimal,
): Recommendation | undefined => {
  if (compareDecimal(contributionMargin, TEN_PERCENT) >= 0) {
    return undefined;
  }

  const targetContributionWeighted = multiplyDecimal(sellingPrice, TEN_PERCENT, 6);
  const targetContribution = divideDecimal(targetContributionWeighted, HUNDRED_PERCENT, 2);
  const targetVariableCost = subtractDecimal(grossProfit, targetContribution);
  if (compareDecimal(targetVariableCost, ZERO_MONEY) < 0) {
    return undefined;
  }

  const impact = subtractDecimal(targetContribution, contributionProfit);
  if (compareDecimal(impact, ZERO_MONEY) <= 0) {
    return undefined;
  }

  const variableCostChange = subtractDecimal(targetVariableCost, variableCost);

  // This 10% threshold is a Phase 02 contract fixture only, not production business guidance.
  return {
    id: "simulate-variable-cost-to-10pct-contribution-margin",
    triggerId: "contribution-margin-below-reference-10pct",
    estimatedImpact: resultValue("contributionProfitImpact", impact, 2),
    tradeOffCode: "feasibility-not-modeled",
    changes: { variableSellingCostPerOrder: formatDecimal(variableCostChange) },
  };
};

export const calculateBusinessMargin = (
  input: BusinessMarginInput,
  context: CalculationContext,
): CalculationOutcome => {
  const issues: ValidationIssue[] = [];

  const parsedSellingPrice = parseDecimal(input.sellingPrice, 2);
  let sellingPrice: Decimal | undefined;
  if (!parsedSellingPrice.ok) {
    issues.push({ path: "sellingPrice", code: parsedSellingPrice.code });
  } else if (compareDecimal(parsedSellingPrice.value, ZERO_MONEY) <= 0) {
    issues.push({ path: "sellingPrice", code: "out-of-range" });
  } else {
    sellingPrice = parsedSellingPrice.value;
  }

  const productCost = parseNonNegativeMoney(input.productCost, "productCost", issues);
  const variableCost =
    input.variableSellingCostPerOrder === undefined
      ? undefined
      : parseNonNegativeMoney(input.variableSellingCostPerOrder, "variableSellingCostPerOrder", issues);

  if (issues.length > 0 || sellingPrice === undefined || productCost === undefined) {
    return validationFailure(issues);
  }

  const grossProfit = subtractDecimal(sellingPrice, productCost);
  const grossMargin = percentageOfSellingPrice(grossProfit, sellingPrice);
  const grossValues: ResultValue[] = [
    resultValue("grossProfit", grossProfit, 2),
    { ...resultValue("grossMarginPercent", grossMargin, 4), unit: "percent" },
  ];

  const normalizedInputs: Record<string, string> = {
    sellingPrice: formatDecimal(sellingPrice),
    productCost: formatDecimal(productCost),
  };

  if (variableCost === undefined) {
    return calculationSuccess({
      calculatorId: businessMarginCalculatorDefinition.id,
      calculatorVersion: context.calculatorVersion,
      classification: businessMarginCalculatorDefinition.classification,
      normalizedInputs,
      assumptions: context.assumptions ?? [],
      primaryAnswer: resultValue("grossProfit", grossProfit, 2),
      sections: [{ id: "gross", values: grossValues }],
      ...(context.scenarioId === undefined ? {} : { scenarioId: context.scenarioId }),
    });
  }

  normalizedInputs.variableSellingCostPerOrder = formatDecimal(variableCost);
  const contributionProfit = subtractDecimal(grossProfit, variableCost);
  const contributionMargin = percentageOfSellingPrice(contributionProfit, sellingPrice);
  const recommendation = recommendationForLowContribution(
    sellingPrice,
    grossProfit,
    variableCost,
    contributionProfit,
    contributionMargin,
  );

  return calculationSuccess({
    calculatorId: businessMarginCalculatorDefinition.id,
    calculatorVersion: context.calculatorVersion,
    classification: businessMarginCalculatorDefinition.classification,
    normalizedInputs,
    assumptions: context.assumptions ?? [],
    primaryAnswer: resultValue("contributionProfit", contributionProfit, 2),
    sections: [
      { id: "gross", values: grossValues },
      {
        id: "contribution",
        values: [
          resultValue("contributionProfit", contributionProfit, 2),
          { ...resultValue("contributionMarginPercent", contributionMargin, 4), unit: "percent" },
        ],
      },
    ],
    ...(recommendation === undefined ? {} : { recommendations: [recommendation] }),
    ...(context.scenarioId === undefined ? {} : { scenarioId: context.scenarioId }),
  });
};

const profitValue = (result: CalculationResult): Decimal => {
  const preferredId = result.normalizedInputs.variableSellingCostPerOrder === undefined ? "grossProfit" : "contributionProfit";
  const found = [result.primaryAnswer, ...result.sections.flatMap((section) => section.values)].find(
    (value) => value.id === preferredId,
  );
  if (found === undefined) {
    throw new Error(`missing ${preferredId} result invariant`);
  }
  const parsed = parseDecimal(found.value, 2);
  if (!parsed.ok) {
    throw new Error(`invalid ${preferredId} result invariant`);
  }
  return parsed.value;
};

export const calculateBusinessMarginScenario = (
  baselineInput: BusinessMarginInput,
  context: CalculationContext,
  scenario: Scenario,
): BusinessMarginScenarioOutcome => {
  const allowedInputs = new Set(["sellingPrice", "productCost", "variableSellingCostPerOrder"]);
  const unknownKey = Object.keys(scenario.changes).find((key) => !allowedInputs.has(key));
  if (unknownKey !== undefined) {
    return validationFailure([
      { path: `scenario.changes.${unknownKey}`, code: "invalid-combination" },
    ]);
  }

  const baselineOutcome = calculateBusinessMargin(baselineInput, context);
  if (!baselineOutcome.ok) {
    return baselineOutcome;
  }

  const scenarioInput: BusinessMarginInput = {
    sellingPrice: scenario.changes.sellingPrice ?? baselineInput.sellingPrice,
    productCost: scenario.changes.productCost ?? baselineInput.productCost,
    ...((scenario.changes.variableSellingCostPerOrder ?? baselineInput.variableSellingCostPerOrder) === undefined
      ? {}
      : {
          variableSellingCostPerOrder:
            scenario.changes.variableSellingCostPerOrder ?? baselineInput.variableSellingCostPerOrder!,
        }),
  };
  const scenarioOutcome = calculateBusinessMargin(scenarioInput, { ...context, scenarioId: scenario.id });
  if (!scenarioOutcome.ok) {
    return scenarioOutcome;
  }

  const impact = subtractDecimal(profitValue(scenarioOutcome.result), profitValue(baselineOutcome.result));
  return {
    ok: true,
    result: {
      baseline: baselineOutcome.result,
      scenario: scenarioOutcome.result,
      impact: resultValue("profitImpact", impact, 2),
    },
  };
};
