import {
  businessMarginCalculatorDefinition,
  compareDecimal,
  compareIsoCalendarDates,
  dateDifferenceCalculatorDefinition,
  discountCalculatorDefinition,
  formatDecimal,
  isIsoCalendarDate,
  lengthConversionCalculatorDefinition,
  parseDecimal,
  percentageCalculatorDefinition,
  syntheticRuleCalculatorDefinition,
  type CalculatorDefinition,
  type DecimalInputDefinition,
  type DecimalListInputDefinition,
  type InputDefinition,
} from "@found-calc/engine";

export type SupportedCalculatorId =
  | "reference.discount"
  | "reference.business-margin"
  | "reference.synthetic-rule"
  | "quick.percentage"
  | "quick.date-difference"
  | "quick.length-conversion";

export type WidgetDefaultConfiguration = Readonly<Record<string, string | readonly string[]>>;

export type WidgetDefaultsParseResult =
  | { readonly ok: true; readonly value: WidgetDefaultConfiguration }
  | {
      readonly ok: false;
      readonly code: "invalid-defaults" | "unsupported-default-field" | "invalid-default-value";
    };

const DEFINITIONS: Readonly<Record<SupportedCalculatorId, CalculatorDefinition>> = {
  "reference.discount": discountCalculatorDefinition,
  "reference.business-margin": businessMarginCalculatorDefinition,
  "reference.synthetic-rule": syntheticRuleCalculatorDefinition,
  "quick.percentage": percentageCalculatorDefinition,
  "quick.date-difference": dateDifferenceCalculatorDefinition,
  "quick.length-conversion": lengthConversionCalculatorDefinition,
};

const SAFE_FIELDS: Readonly<Record<SupportedCalculatorId, ReadonlySet<string>>> = {
  "reference.discount": new Set(["baseAmount", "discountPercentages"]),
  "reference.business-margin": new Set([
    "sellingPrice",
    "productCost",
    "variableSellingCostPerOrder",
  ]),
  "reference.synthetic-rule": new Set(["baseAmount"]),
  "quick.percentage": new Set(["baseValue", "percentage"]),
  "quick.date-difference": new Set(["startDate", "endDate"]),
  "quick.length-conversion": new Set(["value", "fromUnit", "toUnit"]),
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const definitionFor = (calculatorId: string): CalculatorDefinition | null =>
  calculatorId in DEFINITIONS ? DEFINITIONS[calculatorId as SupportedCalculatorId] : null;

const canonicalDecimal = (
  definition: DecimalInputDefinition | DecimalListInputDefinition,
  value: unknown,
): string | null => {
  if (typeof value !== "string") return null;
  const parsed = parseDecimal(value, definition.scale);
  if (!parsed.ok) return null;

  if (definition.min !== undefined) {
    const minimum = parseDecimal(definition.min, definition.scale);
    if (!minimum.ok || compareDecimal(parsed.value, minimum.value) < 0) return null;
  }
  if (definition.max !== undefined) {
    const maximum = parseDecimal(definition.max, definition.scale);
    if (!maximum.ok || compareDecimal(parsed.value, maximum.value) > 0) return null;
  }
  return formatDecimal(parsed.value);
};

const canonicalValue = (
  definition: InputDefinition,
  value: unknown,
): string | readonly string[] | null => {
  switch (definition.kind) {
    case "decimal":
      return canonicalDecimal(definition, value);
    case "decimal-list": {
      if (!Array.isArray(value)) return null;
      if (definition.maxItems !== undefined && value.length > definition.maxItems) return null;
      const normalized: string[] = [];
      for (const entry of value) {
        const canonical = canonicalDecimal(definition, entry);
        if (canonical === null) return null;
        normalized.push(canonical);
      }
      return normalized;
    }
    case "date":
      if (typeof value !== "string" || !isIsoCalendarDate(value)) return null;
      if (definition.min !== undefined && value < definition.min) return null;
      if (definition.max !== undefined && value > definition.max) return null;
      return value;
    case "select":
      return typeof value === "string" && definition.options.includes(value) ? value : null;
  }
};

export const parseWidgetDefaults = (
  calculatorId: SupportedCalculatorId,
  value: unknown,
): WidgetDefaultsParseResult => {
  if (!isRecord(value)) return { ok: false, code: "invalid-defaults" };

  const definition = definitionFor(calculatorId);
  if (definition === null) return { ok: false, code: "invalid-defaults" };
  const safeFields = SAFE_FIELDS[calculatorId];

  const keys = Object.keys(value);
  if (keys.some((key) => !safeFields.has(key))) {
    return { ok: false, code: "unsupported-default-field" };
  }

  const inputDefinitions = new Map(definition.inputs.map((input) => [input.id, input] as const));
  const normalized: Record<string, string | readonly string[]> = {};
  for (const key of keys) {
    const input = inputDefinitions.get(key);
    if (input === undefined) return { ok: false, code: "unsupported-default-field" };
    const canonical = canonicalValue(input, value[key]);
    if (canonical === null) return { ok: false, code: "invalid-default-value" };
    normalized[key] = canonical;
  }

  if (
    calculatorId === "quick.date-difference" &&
    typeof normalized.startDate === "string" &&
    typeof normalized.endDate === "string"
  ) {
    const order = compareIsoCalendarDates(normalized.startDate, normalized.endDate);
    if (order === null || order > 0) return { ok: false, code: "invalid-default-value" };
  }

  return { ok: true, value: normalized };
};
