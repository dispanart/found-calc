export type RequirementLevel = "required" | "recommended" | "advanced" | "contextual";

export type CalculationClassification = "exact/deterministic" | "rule-based";

export interface CalculatorVersion {
  readonly id: string;
  readonly calculatorId: string;
  readonly version: string;
}

export interface InputDefinition {
  readonly id: string;
  readonly kind: "decimal" | "decimal-list";
  readonly requirement: RequirementLevel;
  readonly scale: number;
  readonly min?: string;
  readonly max?: string;
  readonly unit?: string;
  readonly currency?: string;
}

export interface RuleDependencyDeclaration {
  readonly ruleId: string;
  readonly required: boolean;
}

export interface CalculatorDefinition {
  readonly id: string;
  readonly version: CalculatorVersion;
  readonly classification: CalculationClassification;
  readonly inputs: readonly InputDefinition[];
  readonly ruleDependencies?: readonly RuleDependencyDeclaration[];
}

export interface Assumption {
  readonly id: string;
  readonly value: string | boolean;
}

export interface RuleDependency<TPayload = unknown> {
  readonly ruleId: string;
  readonly versionId: string;
  readonly effectiveFrom: string;
  readonly effectiveUntil?: string;
  readonly payload: Readonly<TPayload>;
  readonly provenance: {
    readonly sourceId: string;
    readonly note?: string;
  };
}

export interface CalculationContext {
  readonly effectiveDate: string;
  readonly calculatorVersion: string;
  readonly assumptions?: readonly Assumption[];
  readonly ruleDependencies?: readonly RuleDependency[];
  readonly scenarioId?: string;
}

export interface ResultValue {
  readonly id: string;
  readonly kind: "decimal";
  readonly value: string;
  readonly scale: number;
  readonly unit?: string;
  readonly currency?: string;
}

export interface ResultSection {
  readonly id: string;
  readonly values: readonly ResultValue[];
}

export interface Scenario {
  readonly id: string;
  readonly changes: Readonly<Record<string, string>>;
}

export interface Recommendation {
  readonly id: string;
  readonly triggerId: string;
  readonly estimatedImpact: ResultValue;
  readonly tradeOffCode: string;
  readonly changes: Readonly<Record<string, string>>;
}

export type ValidationIssueCode =
  | "missing-required"
  | "malformed-number"
  | "scale-exceeded"
  | "out-of-range"
  | "invalid-combination"
  | "undefined-result"
  | "invalid-effective-date"
  | "rule-unavailable"
  | "rule-ambiguous";

export interface ValidationIssue {
  readonly path: string;
  readonly code: ValidationIssueCode;
}

export interface CalculationResult {
  readonly calculatorId: string;
  readonly calculatorVersion: string;
  readonly classification: CalculationClassification;
  readonly normalizedInputs: Readonly<Record<string, string | readonly string[]>>;
  readonly assumptions: readonly Assumption[];
  readonly primaryAnswer: ResultValue;
  readonly sections: readonly ResultSection[];
  readonly ruleDependencies?: readonly RuleDependency[];
  readonly recommendations?: readonly Recommendation[];
  readonly scenarioId?: string;
}

export interface CalculationSuccess {
  readonly ok: true;
  readonly result: CalculationResult;
}

export interface CalculationFailure {
  readonly ok: false;
  readonly issues: readonly ValidationIssue[];
}

export type CalculationOutcome = CalculationSuccess | CalculationFailure;

export const calculationSuccess = (result: CalculationResult): CalculationSuccess => ({
  ok: true,
  result,
});

export const validationFailure = (issues: readonly ValidationIssue[]): CalculationFailure => ({
  ok: false,
  issues,
});
