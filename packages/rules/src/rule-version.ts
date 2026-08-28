export interface RuleVersionProvenance {
  readonly sourceId: string;
}

export interface RuleVersion<TPayload> {
  readonly ruleId: string;
  readonly versionId: string;
  readonly effectiveFrom: string;
  readonly effectiveUntil?: string;
  readonly payload: Readonly<TPayload>;
  readonly provenance: RuleVersionProvenance;
}
