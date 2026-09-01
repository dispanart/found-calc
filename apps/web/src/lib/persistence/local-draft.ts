import { isLocale, type Locale } from "../../i18n/locales";

export const LOCAL_DRAFT_SCHEMA_VERSION = 1 as const;
export const LOCAL_DRAFT_KEY_PREFIX = "found-calc:draft:v1:";

export type LocalCalculatorDraft =
  | {
      readonly calculatorId: "reference.discount";
      readonly locale: Locale;
      readonly fields: {
        readonly baseAmount: string;
        readonly discounts: readonly string[];
      };
    }
  | {
      readonly calculatorId: "reference.business-margin";
      readonly locale: Locale;
      readonly fields: {
        readonly sellingPrice: string;
        readonly productCost: string;
        readonly variableCost: string;
        readonly scenarioVariableCost: string;
      };
    }
  | {
      readonly calculatorId: "reference.synthetic-rule";
      readonly locale: Locale;
      readonly fields: {
        readonly baseAmount: string;
        readonly effectiveDate: string;
      };
    }
  | {
      readonly calculatorId: "quick.percentage";
      readonly locale: Locale;
      readonly fields: {
        readonly baseValue: string;
        readonly percentage: string;
      };
    }
  | {
      readonly calculatorId: "quick.date-difference";
      readonly locale: Locale;
      readonly fields: {
        readonly startDate: string;
        readonly endDate: string;
      };
    }
  | {
      readonly calculatorId: "quick.length-conversion";
      readonly locale: Locale;
      readonly fields: {
        readonly value: string;
        readonly fromUnit: string;
        readonly toUnit: string;
      };
    };

export type LocalDraftCalculatorId = LocalCalculatorDraft["calculatorId"];

export interface LocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface LocalDraftEnvelope {
  readonly schemaVersion: typeof LOCAL_DRAFT_SCHEMA_VERSION;
  readonly calculatorId: LocalDraftCalculatorId;
  readonly locale: Locale;
  readonly fields: LocalCalculatorDraft["fields"];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (value: Record<string, unknown>, allowed: readonly string[]) => {
  const set = new Set(allowed);
  return Object.keys(value).every((key) => set.has(key));
};

const allStrings = (values: unknown): values is string[] =>
  Array.isArray(values) && values.every((value) => typeof value === "string");

const parseFields = (
  calculatorId: LocalDraftCalculatorId,
  fields: unknown,
): LocalCalculatorDraft["fields"] | null => {
  if (!isRecord(fields)) return null;

  switch (calculatorId) {
    case "reference.discount":
      if (!hasOnlyKeys(fields, ["baseAmount", "discounts"])) return null;
      if (typeof fields.baseAmount !== "string" || !allStrings(fields.discounts)) return null;
      return { baseAmount: fields.baseAmount, discounts: [...fields.discounts] };

    case "reference.business-margin":
      if (!hasOnlyKeys(fields, ["sellingPrice", "productCost", "variableCost", "scenarioVariableCost"])) return null;
      if (
        typeof fields.sellingPrice !== "string" ||
        typeof fields.productCost !== "string" ||
        typeof fields.variableCost !== "string" ||
        typeof fields.scenarioVariableCost !== "string"
      ) return null;
      return {
        sellingPrice: fields.sellingPrice,
        productCost: fields.productCost,
        variableCost: fields.variableCost,
        scenarioVariableCost: fields.scenarioVariableCost,
      };

    case "reference.synthetic-rule":
      if (!hasOnlyKeys(fields, ["baseAmount", "effectiveDate"])) return null;
      if (typeof fields.baseAmount !== "string" || typeof fields.effectiveDate !== "string") return null;
      return { baseAmount: fields.baseAmount, effectiveDate: fields.effectiveDate };

    case "quick.percentage":
      if (!hasOnlyKeys(fields, ["baseValue", "percentage"])) return null;
      if (typeof fields.baseValue !== "string" || typeof fields.percentage !== "string") return null;
      return { baseValue: fields.baseValue, percentage: fields.percentage };

    case "quick.date-difference":
      if (!hasOnlyKeys(fields, ["startDate", "endDate"])) return null;
      if (typeof fields.startDate !== "string" || typeof fields.endDate !== "string") return null;
      return { startDate: fields.startDate, endDate: fields.endDate };

    case "quick.length-conversion":
      if (!hasOnlyKeys(fields, ["value", "fromUnit", "toUnit"])) return null;
      if (
        typeof fields.value !== "string" ||
        typeof fields.fromUnit !== "string" ||
        typeof fields.toUnit !== "string"
      ) return null;
      return { value: fields.value, fromUnit: fields.fromUnit, toUnit: fields.toUnit };
  }
};

const resolveStorage = (storage?: LocalStorageLike): LocalStorageLike | null => {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const localDraftKey = (calculatorId: LocalDraftCalculatorId) =>
  `${LOCAL_DRAFT_KEY_PREFIX}${calculatorId}`;

export const readLocalDraft = (
  calculatorId: LocalDraftCalculatorId,
  storage?: LocalStorageLike,
): LocalCalculatorDraft | null => {
  const target = resolveStorage(storage);
  if (!target) return null;

  let raw: string | null;
  try {
    raw = target.getItem(localDraftKey(calculatorId));
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || !hasOnlyKeys(parsed, ["schemaVersion", "calculatorId", "locale", "fields"])) return null;
  if (parsed.schemaVersion !== LOCAL_DRAFT_SCHEMA_VERSION || parsed.calculatorId !== calculatorId) return null;
  if (typeof parsed.locale !== "string" || !isLocale(parsed.locale)) return null;
  const fields = parseFields(calculatorId, parsed.fields);
  if (!fields) return null;

  return {
    calculatorId,
    locale: parsed.locale,
    fields,
  } as LocalCalculatorDraft;
};

export const writeLocalDraft = (
  draft: LocalCalculatorDraft,
  storage?: LocalStorageLike,
): boolean => {
  const target = resolveStorage(storage);
  if (!target) return false;
  const envelope: LocalDraftEnvelope = {
    schemaVersion: LOCAL_DRAFT_SCHEMA_VERSION,
    calculatorId: draft.calculatorId,
    locale: draft.locale,
    fields: draft.fields,
  };
  try {
    target.setItem(localDraftKey(draft.calculatorId), JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
};

export const removeLocalDraft = (
  calculatorId: LocalDraftCalculatorId,
  storage?: LocalStorageLike,
): boolean => {
  const target = resolveStorage(storage);
  if (!target) return false;
  try {
    target.removeItem(localDraftKey(calculatorId));
    return true;
  } catch {
    return false;
  }
};
