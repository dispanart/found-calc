import {
  businessMarginCalculatorDefinition,
  compareDecimal,
  decimalFromUnits,
  discountCalculatorDefinition,
  parseDecimal,
  syntheticRuleCalculatorDefinition,
} from "@found-calc/engine";

export const MAX_PERSISTED_STATE_BYTES = 16 * 1024;
export const MAX_DISCOUNT_STEPS = 20;

export type SupportedCalculatorId =
  | "reference.discount"
  | "reference.business-margin"
  | "reference.synthetic-rule";

export type PersistedCalculatorState =
  | {
      readonly calculatorId: "reference.discount";
      readonly calculatorVersion: string;
      readonly input: {
        readonly baseAmount: string;
        readonly discountPercentages: readonly string[];
      };
    }
  | {
      readonly calculatorId: "reference.business-margin";
      readonly calculatorVersion: string;
      readonly input: {
        readonly sellingPrice: string;
        readonly productCost: string;
        readonly variableSellingCostPerOrder?: string;
        readonly scenarioVariableSellingCostPerOrder?: string;
      };
    }
  | {
      readonly calculatorId: "reference.synthetic-rule";
      readonly calculatorVersion: string;
      readonly input: {
        readonly baseAmount: string;
        readonly effectiveDate: string;
      };
    };

export type PersistedStateParseResult =
  | { readonly ok: true; readonly value: PersistedCalculatorState }
  | { readonly ok: false; readonly code: "invalid-state" | "payload-too-large" };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (value: Record<string, unknown>, allowed: readonly string[]): boolean => {
  const allowedSet = new Set(allowed);
  return Object.keys(value).every((key) => allowedSet.has(key));
};

const isCanonicalDecimal = (value: unknown, scale: number): value is string =>
  typeof value === "string" && parseDecimal(value, scale).ok;

const isNonNegative = (value: string, scale: number): boolean => {
  const parsed = parseDecimal(value, scale);
  return parsed.ok && compareDecimal(parsed.value, decimalFromUnits(0n, scale)) >= 0;
};

const isPositiveMoney = (value: string): boolean => {
  const parsed = parseDecimal(value, 2);
  return parsed.ok && compareDecimal(parsed.value, decimalFromUnits(0n, 2)) > 0;
};

const isPercentage = (value: string): boolean => {
  const parsed = parseDecimal(value, 4);
  if (!parsed.ok) return false;
  return (
    compareDecimal(parsed.value, decimalFromUnits(0n, 4)) >= 0 &&
    compareDecimal(parsed.value, decimalFromUnits(1_000_000n, 4)) <= 0
  );
};

const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

const versionFor = (calculatorId: SupportedCalculatorId): string => {
  switch (calculatorId) {
    case "reference.discount":
      return discountCalculatorDefinition.version.version;
    case "reference.business-margin":
      return businessMarginCalculatorDefinition.version.version;
    case "reference.synthetic-rule":
      return syntheticRuleCalculatorDefinition.version.version;
  }
};

export const isSupportedCalculatorId = (value: string): value is SupportedCalculatorId =>
  value === "reference.discount" ||
  value === "reference.business-margin" ||
  value === "reference.synthetic-rule";

const validateDiscount = (
  calculatorVersion: string,
  input: Record<string, unknown>,
): PersistedCalculatorState | null => {
  if (calculatorVersion !== versionFor("reference.discount")) return null;
  if (!hasOnlyKeys(input, ["baseAmount", "discountPercentages"])) return null;
  if (!isCanonicalDecimal(input.baseAmount, 2) || !isNonNegative(input.baseAmount, 2)) return null;
  if (!Array.isArray(input.discountPercentages)) return null;
  if (input.discountPercentages.length < 1 || input.discountPercentages.length > MAX_DISCOUNT_STEPS) return null;
  if (!input.discountPercentages.every((value) => typeof value === "string" && isPercentage(value))) return null;

  return {
    calculatorId: "reference.discount",
    calculatorVersion,
    input: {
      baseAmount: input.baseAmount,
      discountPercentages: [...input.discountPercentages] as string[],
    },
  };
};

const validateBusinessMargin = (
  calculatorVersion: string,
  input: Record<string, unknown>,
): PersistedCalculatorState | null => {
  if (calculatorVersion !== versionFor("reference.business-margin")) return null;
  if (!hasOnlyKeys(input, [
    "sellingPrice",
    "productCost",
    "variableSellingCostPerOrder",
    "scenarioVariableSellingCostPerOrder",
  ])) return null;
  if (!isCanonicalDecimal(input.sellingPrice, 2) || !isPositiveMoney(input.sellingPrice)) return null;
  if (!isCanonicalDecimal(input.productCost, 2) || !isNonNegative(input.productCost, 2)) return null;

  const variable = input.variableSellingCostPerOrder;
  if (variable !== undefined && (!isCanonicalDecimal(variable, 2) || !isNonNegative(variable, 2))) return null;
  const scenario = input.scenarioVariableSellingCostPerOrder;
  if (scenario !== undefined && (!isCanonicalDecimal(scenario, 2) || !isNonNegative(scenario, 2))) return null;

  return {
    calculatorId: "reference.business-margin",
    calculatorVersion,
    input: {
      sellingPrice: input.sellingPrice,
      productCost: input.productCost,
      ...(typeof variable === "string" ? { variableSellingCostPerOrder: variable } : {}),
      ...(typeof scenario === "string" ? { scenarioVariableSellingCostPerOrder: scenario } : {}),
    },
  };
};

const validateSyntheticRule = (
  calculatorVersion: string,
  input: Record<string, unknown>,
): PersistedCalculatorState | null => {
  if (calculatorVersion !== versionFor("reference.synthetic-rule")) return null;
  if (!hasOnlyKeys(input, ["baseAmount", "effectiveDate"])) return null;
  if (!isCanonicalDecimal(input.baseAmount, 2) || !isNonNegative(input.baseAmount, 2)) return null;
  if (!isIsoDate(input.effectiveDate)) return null;

  return {
    calculatorId: "reference.synthetic-rule",
    calculatorVersion,
    input: { baseAmount: input.baseAmount, effectiveDate: input.effectiveDate },
  };
};

export const parsePersistedCalculatorState = (value: unknown): PersistedStateParseResult => {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return { ok: false, code: "invalid-state" };
  }
  if (new TextEncoder().encode(serialized).byteLength > MAX_PERSISTED_STATE_BYTES) {
    return { ok: false, code: "payload-too-large" };
  }

  if (!isRecord(value) || !hasOnlyKeys(value, ["calculatorId", "calculatorVersion", "input"])) {
    return { ok: false, code: "invalid-state" };
  }
  if (typeof value.calculatorId !== "string" || !isSupportedCalculatorId(value.calculatorId)) {
    return { ok: false, code: "invalid-state" };
  }
  if (typeof value.calculatorVersion !== "string" || !isRecord(value.input)) {
    return { ok: false, code: "invalid-state" };
  }

  const parsed =
    value.calculatorId === "reference.discount"
      ? validateDiscount(value.calculatorVersion, value.input)
      : value.calculatorId === "reference.business-margin"
        ? validateBusinessMargin(value.calculatorVersion, value.input)
        : validateSyntheticRule(value.calculatorVersion, value.input);

  return parsed === null ? { ok: false, code: "invalid-state" } : { ok: true, value: parsed };
};
