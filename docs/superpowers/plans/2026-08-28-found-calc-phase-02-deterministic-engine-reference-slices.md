# Found Calc Phase 02 — Deterministic Engine + Reference Vertical Slices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a pure deterministic calculation engine, generic immutable rule resolver, and three reference calculator slices that prove Found Calc's calculation truth before Phase 03 UI/runtime work begins.

**Architecture:** `@found-calc/engine` owns canonical numeric truth, calculation contracts, validation/results, scenarios, and formulas; it has no dependency on UI, Cloudflare, persistence, catalog, network, locale formatting, or the rule resolver. `@found-calc/rules` owns immutable version/effective-date resolution and may depend on engine contract types so resolved rules can be passed into engine calculations. The three slices are package/test-level reference implementations only.

**Tech Stack:** TypeScript 5.9 strict mode, Vitest 4.1.x, pnpm 11.24.0 workspaces, Node.js 22, existing Next.js 16.2.9 + vinext + Cloudflare Workers regression gate.

**Spec:** `docs/superpowers/specs/2026-08-28-found-calc-phase-02-deterministic-engine-reference-slices-design.md`

## Global Constraints

- Start from branch `phase-02-engine-reference-slices`, based on `main` commit `a64ee22d2c6725e9372ca2aa0e9066e68bb93cae`.
- Preserve Phase 01 repository boundaries: `apps/web`, `packages/engine`, `packages/rules`, `packages/catalog`, and `packages/ui`.
- `@found-calc/engine` must not import React/Next.js, Cloudflare runtime APIs, D1/persistence, network APIs, product catalog metadata, auth/billing, locale formatting, or `@found-calc/rules`.
- `@found-calc/rules` may depend on `@found-calc/engine`; dependency direction must never reverse.
- Numeric truth must be locale-independent. Engine inputs/results use canonical decimal strings and semantic IDs, never ID/EN display copy.
- No `Date.now()`, `Math.random()`, hidden global state, network lookup, environment binding, storage lookup, or locale-sensitive parsing/formatting in the calculation path.
- Reference arithmetic uses source-owned scaled-integer decimal operations with explicit scale and round-half-up boundaries. Do not add a runtime decimal dependency.
- Money-like values use scale 2; computed percentage values use scale 4.
- Discount rounds the remaining amount to scale 2 after each discount step.
- Business margin rounds amount outputs to scale 2 and percentage outputs to scale 4.
- Synthetic rule amount rounds to scale 2.
- User-invalid input returns typed validation failures; invariant/programming failures may throw explicit invariant errors.
- Synthetic rules are explicitly non-production and must never be presented as tax, legal, marketplace, health, payroll, or fiqh guidance.
- Preserve native ID/EN route shells, accessibility contract, privacy/trust constraints, and the Rp0 fixed-infrastructure target excluding domain/payment transaction fees.
- Do not implement Phase 03+ calculator pages, discovery/search, production catalog, auth, persistence schema, billing/Xendit, real regulatory rule packs, Admin, Goals/Projects, or analytics.
- Keep `verify:phase01` intact as a callable historical regression gate; add `verify:phase02` as a superset.
- Every implementation task follows red → green → refactor and ends with a focused commit.

## File Structure

### `packages/engine`

- `package.json` — package metadata, exports, typecheck/test scripts, package-local TypeScript/Vitest dev dependencies.
- `tsconfig.json` — strict package compilation extending the repository base config.
- `vitest.config.ts` — Node-environment package tests.
- `src/contracts.ts` — public calculation contract types and small runtime constructors/guards.
- `src/decimal.ts` — canonical decimal parsing, scaled-integer arithmetic, comparison, explicit round-half-up rescaling, canonical formatting.
- `src/reference/discount.ts` — simple/stacked discount definition and calculation.
- `src/reference/business-margin.ts` — progressive margin/profit calculation, immutable scenario evaluation, reference recommendation.
- `src/reference/synthetic-rule.ts` — rule-dependent reference formula consuming a pre-resolved `RuleDependency`.
- `src/index.ts` — explicit public exports only.
- `src/*.test.ts` and `src/reference/*.test.ts` — known-answer, boundary, determinism, scenario, validation, and provenance tests.

### `packages/rules`

- `package.json` — package metadata/scripts and `workspace:*` dependency on `@found-calc/engine`.
- `tsconfig.json` — strict package compilation.
- `vitest.config.ts` — Node-environment package tests.
- `src/rule-version.ts` — immutable generic rule-version/effective-period types.
- `src/resolve-rule.ts` — validated ISO date-only resolution and explicit version pinning.
- `src/synthetic-reference.ts` — canonical synthetic fixtures `2025-a` and `2026-a`.
- `src/index.ts` — public exports.
- `src/*.test.ts` — resolver gap/overlap/pinning/immutability tests and engine integration test.

### Repository verification/docs

- `package.json` — add package-scoped scripts and `verify:phase02`.
- `scripts/verify-phase-02.mjs` — fail-fast Phase 02 runner that runs engine/rules gates and then the complete Phase 01 gate.
- `tests/foundation/phase-02-verification-contract.test.mjs` — dependency-free guard against CI/scope drift.
- `.github/workflows/phase-02-verification.yml` — Phase 02 branch/PR CI using frozen dependencies, Playwright Chromium, `verify:phase02`, and the existing built Worker smoke.
- `.github/workflows/phase-01-verification.yml` — retain as historical workflow; only change if needed to prevent duplicate PR runs after Phase 02 workflow is introduced.
- `docs/verification/phase-02-verification.md` — final evidence with exact commands/results/commit SHA.
- `BASELINE.md` — final canonical Phase 02 baseline metadata.
- `PHASE_HANDOFF.md` — Phase 03 continuity handoff.
- `PHASE_CHAT_TEMPLATE.md` — next-phase start template aligned to the new baseline if the existing workflow requires it.

---

### Task 1: Scaffold `@found-calc/engine` and lock the public calculation contract

**Files:**
- Create: `packages/engine/package.json`
- Create: `packages/engine/tsconfig.json`
- Create: `packages/engine/vitest.config.ts`
- Create: `packages/engine/src/contracts.ts`
- Create: `packages/engine/src/contracts.test.ts`
- Create: `packages/engine/src/index.ts`
- Modify: `packages/engine/README.md`
- Modify: `pnpm-lock.yaml` via `pnpm install`

**Interfaces:**
- Consumes: repository `tsconfig.base.json`; Vitest `^4.1.10`; TypeScript `^5.9.0`.
- Produces:
  - `RequirementLevel = "required" | "recommended" | "advanced" | "contextual"`
  - `CalculationClassification = "exact/deterministic" | "rule-based"`
  - `CalculatorVersion`, `InputDefinition`, `Assumption`, `RuleDependency<T>`, `CalculationContext`, `ResultValue`, `ResultSection`, `Scenario`, `Recommendation`, `ValidationIssue`, `CalculationResult`, `CalculationOutcome`
  - `validationFailure(issues)` and `calculationSuccess(result)` runtime constructors.

- [ ] **Step 1: Add the failing public-contract test**

Create `packages/engine/src/contracts.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  calculationSuccess,
  validationFailure,
  type CalculationContext,
  type CalculationResult,
  type RuleDependency,
} from "./contracts";

describe("calculation contracts", () => {
  it("keeps result truth semantic and reproducible", () => {
    const dependency: RuleDependency<{ ratePercent: string }> = {
      ruleId: "reference.synthetic-rate",
      versionId: "2025-a",
      effectiveFrom: "2025-01-01",
      effectiveUntil: "2025-12-31",
      payload: { ratePercent: "5" },
      provenance: { sourceId: "synthetic-reference-fixture" },
    };
    const context: CalculationContext = {
      effectiveDate: "2025-06-01",
      calculatorVersion: "1.0.0",
      ruleDependencies: [dependency],
    };
    const result: CalculationResult = {
      calculatorId: "reference.synthetic",
      calculatorVersion: context.calculatorVersion,
      classification: "rule-based",
      normalizedInputs: { baseAmount: "100.00" },
      assumptions: [],
      primaryAnswer: { id: "calculatedAmount", kind: "decimal", value: "5.00", scale: 2 },
      sections: [],
      ruleDependencies: [dependency],
    };

    expect(calculationSuccess(result)).toEqual({ ok: true, result });
    expect(validationFailure([{ path: "baseAmount", code: "out-of-range" }])).toEqual({
      ok: false,
      issues: [{ path: "baseAmount", code: "out-of-range" }],
    });
  });
});
```

- [ ] **Step 2: Run the test and confirm red**

Run:

```bash
pnpm --filter @found-calc/engine test
```

Expected: FAIL because `@found-calc/engine` package/test script and `src/contracts.ts` do not yet exist.

- [ ] **Step 3: Add package config and minimal contract implementation**

Create `packages/engine/package.json`:

```json
{
  "name": "@found-calc/engine",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run --config vitest.config.ts"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "vitest": "^4.1.10"
  }
}
```

Create `packages/engine/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*.ts", "vitest.config.ts"]
}
```

Create `packages/engine/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    watch: false,
  },
});
```

Implement `contracts.ts` with the exact exported names above. `ValidationIssue["code"]` must include:

```ts
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
```

Use immutable/readonly fields throughout. `ResultValue` is decimal-only in Phase 02:

```ts
export interface ResultValue {
  readonly id: string;
  readonly kind: "decimal";
  readonly value: string;
  readonly scale: number;
  readonly unit?: string;
  readonly currency?: string;
}
```

`CalculationResult.normalizedInputs` must accept canonical scalar or ordered-list values:

```ts
readonly normalizedInputs: Readonly<Record<string, string | readonly string[]>>;
```

Implement constructors exactly:

```ts
export const calculationSuccess = (result: CalculationResult): CalculationOutcome => ({ ok: true, result });
export const validationFailure = (issues: readonly ValidationIssue[]): CalculationOutcome => ({ ok: false, issues });
```

Export all public contract names from `src/index.ts` and update the README to state the engine is runtime-agnostic and locale-independent.

- [ ] **Step 4: Install, run tests, and typecheck**

Run:

```bash
pnpm install
pnpm --filter @found-calc/engine test
pnpm --filter @found-calc/engine typecheck
```

Expected: PASS; lockfile changes only for package workspace/devDependency metadata already present in the repository dependency graph where possible.

- [ ] **Step 5: Commit**

```bash
git add packages/engine pnpm-lock.yaml
git commit -m "feat(engine): define deterministic calculation contracts"
```

---

### Task 2: Implement canonical decimal/scaled-integer arithmetic

**Files:**
- Create: `packages/engine/src/decimal.ts`
- Create: `packages/engine/src/decimal.test.ts`
- Modify: `packages/engine/src/index.ts`

**Interfaces:**
- Consumes: no runtime dependencies.
- Produces:
  - `Decimal = Readonly<{ units: bigint; scale: number }>`
  - `parseDecimal(value: string, scale: number): DecimalParseResult`
  - `formatDecimal(value: Decimal): string`
  - `addDecimal(left, right)`, `subtractDecimal(left, right)`, `compareDecimal(left, right)`
  - `multiplyDecimal(left, right, targetScale)`, `divideDecimal(numerator, denominator, targetScale)`
  - `rescaleHalfUp(value, targetScale)`
  - `decimalFromUnits(units, scale)` for internal/tests.

- [ ] **Step 1: Write failing decimal tests**

Cover canonical parsing (`"0"`, `"10.5"`, `"10.50"`), rejection of locale/exponent/over-scale forms (`"1,5"`, `"1e2"`, `"10.005"` at scale 2), negative values, addition/subtraction across equal scales, multiplication/division to explicit scales, half-up positive and negative rounding, comparison, and zero-denominator rejection.

Representative assertions:

```ts
expect(parseDecimal("10.5", 2)).toEqual({ ok: true, value: { units: 1050n, scale: 2 } });
expect(parseDecimal("1,5", 2)).toEqual({ ok: false, code: "malformed-number" });
expect(formatDecimal(multiplyDecimal({ units: 1999n, scale: 2 }, { units: 1250n, scale: 2 }, 2))).toBe("249.88");
expect(formatDecimal(rescaleHalfUp({ units: 1005n, scale: 3 }, 2))).toBe("1.01");
expect(() => divideDecimal({ units: 100n, scale: 2 }, { units: 0n, scale: 2 }, 2)).toThrow("division by zero");
```

- [ ] **Step 2: Run and confirm red**

```bash
pnpm --filter @found-calc/engine test -- decimal.test.ts
```

Expected: FAIL because decimal exports are missing.

- [ ] **Step 3: Implement minimal deterministic arithmetic**

Use `bigint` for stored units. Parsing must be locale-independent with a canonical decimal grammar and must reject more fractional digits than the requested scale instead of silently rounding input. `formatDecimal` must always emit exactly `scale` fractional digits when `scale > 0`.

For multiplication/division, compute exact integer numerator/denominator and apply a shared integer round-half-up helper. Do not convert operands to `number` anywhere in arithmetic paths.

- [ ] **Step 4: Run focused and package tests**

```bash
pnpm --filter @found-calc/engine test -- decimal.test.ts
pnpm --filter @found-calc/engine test
pnpm --filter @found-calc/engine typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/decimal.ts packages/engine/src/decimal.test.ts packages/engine/src/index.ts
git commit -m "feat(engine): add canonical decimal arithmetic"
```

---

### Task 3: Implement discount / stacked-discount reference slice

**Files:**
- Create: `packages/engine/src/reference/discount.ts`
- Create: `packages/engine/src/reference/discount.test.ts`
- Modify: `packages/engine/src/index.ts`

**Interfaces:**
- Consumes: `CalculationContext`, `CalculationOutcome`, decimal functions.
- Produces:

```ts
export interface DiscountInput {
  readonly baseAmount: string;
  readonly discountPercentages: readonly string[];
}

export const discountCalculatorDefinition: CalculatorDefinition;
export function calculateDiscount(input: DiscountInput, context: CalculationContext): CalculationOutcome;
```

- [ ] **Step 1: Write failing known-answer and boundary tests**

Required cases:

```ts
// single discount: 100.00 less 10% => 90.00
// stacked: 100.00 less 10%, then 20% => 72.00; saving 28.00; effective discount 28.0000%
// zero amount remains 0.00
// 0% leaves amount unchanged
// 100% produces 0.00
// negative and >100 rates fail with out-of-range
// malformed canonical rate fails
// rounding edge proves each step is rounded to scale 2 before the next step
// identical input/context deep-equals on repeated runs
```

Use an explicit context fixture such as `{ effectiveDate: "2026-08-28", calculatorVersion: "1.0.0" }`.

- [ ] **Step 2: Run and confirm red**

```bash
pnpm --filter @found-calc/engine test -- discount.test.ts
```

Expected: FAIL because the reference calculator does not exist.

- [ ] **Step 3: Implement the slice**

Definition must use semantic IDs only:

```ts
id: "reference.discount"
version: { calculatorId: "reference.discount", version: "1.0.0", id: "reference.discount@1.0.0" }
classification: "exact/deterministic"
```

Normalize `baseAmount` to scale 2 and every discount percentage to scale 4. Apply ordered discounts sequentially. Round remaining money to scale 2 after every step. Return semantic result IDs:

- primary: `finalAmount`
- section `summary`: `absoluteSaving`, `effectiveDiscountPercent`
- section `steps`: one `remainingAmountAfterDiscount.<index>` value per applied rate.

A missing/empty `discountPercentages` list is valid and behaves like no discount; invalid entries are reported with indexed paths such as `discountPercentages[1]`.

- [ ] **Step 4: Run tests and typecheck**

```bash
pnpm --filter @found-calc/engine test -- discount.test.ts
pnpm --filter @found-calc/engine test
pnpm --filter @found-calc/engine typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/engine/src/reference/discount.ts packages/engine/src/reference/discount.test.ts packages/engine/src/index.ts
git commit -m "feat(engine): add discount reference calculator"
```

---

### Task 4: Implement contextual business margin/profit slice, scenarios, and reference recommendation

**Files:**
- Create: `packages/engine/src/reference/business-margin.ts`
- Create: `packages/engine/src/reference/business-margin.test.ts`
- Modify: `packages/engine/src/index.ts`

**Interfaces:**
- Consumes: engine contracts and decimal functions.
- Produces:

```ts
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

export const businessMarginCalculatorDefinition: CalculatorDefinition;
export function calculateBusinessMargin(input: BusinessMarginInput, context: CalculationContext): CalculationOutcome;
export function calculateBusinessMarginScenario(
  baselineInput: BusinessMarginInput,
  context: CalculationContext,
  scenario: Scenario,
): CalculationOutcome | { readonly ok: true; readonly result: BusinessMarginScenarioResult };
```

- [ ] **Step 1: Write failing progressive-result tests**

Required cases:

- `sellingPrice=100.00`, `productCost=60.00` ⇒ gross profit `40.00`, gross margin `40.0000`.
- break-even `sellingPrice=100.00`, `productCost=100.00` ⇒ gross profit/margin zero.
- `sellingPrice <= 0` fails; negative costs fail.
- required-only result contains gross section and no contribution section.
- adding `variableSellingCostPerOrder=15.00` retains gross metrics and adds contribution amount `25.00`, contribution margin `25.0000`.
- decimal rounding edge.
- repeated run is structurally equal.

- [ ] **Step 2: Write failing scenario/recommendation tests**

Scenario fixture:

```ts
const scenario = {
  id: "reduce-variable-cost",
  changes: { variableSellingCostPerOrder: "10.00" },
} satisfies Scenario;
```

Assert baseline input/result is not mutated, scenario result carries `scenarioId`, and impact equals scenario contribution profit minus baseline contribution profit.

Recommendation fixture: `sellingPrice=100.00`, `productCost=85.00`, `variableSellingCostPerOrder=10.00` gives 5% contribution margin. To reach 10%, variable cost must become `5.00`; emit exactly one recommendation with semantic ID `simulate-variable-cost-to-10pct-contribution-margin`, required change `-5.00`, quantified contribution impact `5.00`, and trade-off code `feasibility-not-modeled`. Assert no recommendation when the contribution margin is already >=10%, contextual cost is absent, or reaching 10% would require a negative variable cost.

- [ ] **Step 3: Run and confirm red**

```bash
pnpm --filter @found-calc/engine test -- business-margin.test.ts
```

Expected: FAIL because implementation is missing.

- [ ] **Step 4: Implement progressive calculation**

Always compute gross profit and gross margin from required inputs. Only compute contribution profit/margin when contextual cost is present. Preserve earlier gross metrics unchanged. Use semantic section IDs `gross` and `contribution`.

`Scenario.changes` may only override known Phase 02 business input IDs. Unknown changes return `invalid-combination`. Create a new input object; never mutate `baselineInput`, baseline result, or the scenario object.

The 10% recommendation threshold is a reference fixture only. Represent it in source with a comment stating it is not production business guidance.

- [ ] **Step 5: Run focused/package tests and typecheck**

```bash
pnpm --filter @found-calc/engine test -- business-margin.test.ts
pnpm --filter @found-calc/engine test
pnpm --filter @found-calc/engine typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/reference/business-margin.ts packages/engine/src/reference/business-margin.test.ts packages/engine/src/index.ts
git commit -m "feat(engine): add contextual margin reference calculator"
```

---

### Task 5: Scaffold `@found-calc/rules` and implement immutable effective-date/version resolution

**Files:**
- Create: `packages/rules/package.json`
- Create: `packages/rules/tsconfig.json`
- Create: `packages/rules/vitest.config.ts`
- Create: `packages/rules/src/rule-version.ts`
- Create: `packages/rules/src/resolve-rule.ts`
- Create: `packages/rules/src/resolve-rule.test.ts`
- Create: `packages/rules/src/synthetic-reference.ts`
- Create: `packages/rules/src/index.ts`
- Modify: `packages/rules/README.md`
- Modify: `pnpm-lock.yaml` via `pnpm install`

**Interfaces:**
- Consumes: `RuleDependency<T>` from `@found-calc/engine`.
- Produces:

```ts
export interface RuleVersion<TPayload> {
  readonly ruleId: string;
  readonly versionId: string;
  readonly effectiveFrom: string;
  readonly effectiveUntil?: string;
  readonly payload: Readonly<TPayload>;
  readonly provenance: { readonly sourceId: string; readonly note?: string };
}

export type RuleResolutionResult<TPayload> =
  | { readonly ok: true; readonly dependency: RuleDependency<TPayload> }
  | { readonly ok: false; readonly code: "invalid-effective-date" | "rule-unavailable" | "rule-ambiguous" };

export function resolveRuleVersion<TPayload>(
  versions: readonly RuleVersion<TPayload>[],
  request: { readonly ruleId: string; readonly effectiveDate: string; readonly pinnedVersionId?: string },
): RuleResolutionResult<TPayload>;
```

- [ ] **Step 1: Write failing resolver tests**

Tests must prove:

- valid date in a single period resolves exactly one immutable version;
- malformed/nonexistent date-only values such as `2026-02-30`, timestamps, and locale dates return `invalid-effective-date`;
- no coverage returns `rule-unavailable`;
- overlapping matching versions return `rule-ambiguous`;
- pinning an existing version outside its effective period fails `rule-unavailable`;
- pinning an in-period version resolves that exact version even if newer versions exist later;
- resolver does not mutate the versions array or version payload.

- [ ] **Step 2: Run and confirm red**

```bash
pnpm --filter @found-calc/rules test
```

Expected: FAIL because the package/resolver is missing.

- [ ] **Step 3: Add package configuration and resolver**

`packages/rules/package.json`:

```json
{
  "name": "@found-calc/rules",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run --config vitest.config.ts"
  },
  "dependencies": {
    "@found-calc/engine": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "vitest": "^4.1.10"
  }
}
```

Use the same Node Vitest configuration pattern as engine. Implement strict ISO date-only validation without locale parsing: regex `^\d{4}-\d{2}-\d{2}$`, then UTC calendar round-trip validation of year/month/day. Effective intervals are inclusive on both ends; missing `effectiveUntil` means open-ended.

Pinned resolution first filters by `ruleId` + `versionId`, then requires the supplied historical effective date to lie inside that version's period. Unpinned resolution returns ambiguity instead of picking by sort/order when >1 version matches.

- [ ] **Step 4: Add canonical synthetic fixtures**

Create immutable fixture export:

```ts
export const syntheticRateRuleVersions = [
  {
    ruleId: "reference.synthetic-rate",
    versionId: "2025-a",
    effectiveFrom: "2025-01-01",
    effectiveUntil: "2025-12-31",
    payload: { ratePercent: "5" },
    provenance: { sourceId: "synthetic-reference-fixture" },
  },
  {
    ruleId: "reference.synthetic-rate",
    versionId: "2026-a",
    effectiveFrom: "2026-01-01",
    payload: { ratePercent: "7.5" },
    provenance: { sourceId: "synthetic-reference-fixture" },
  },
] as const;
```

README and source comments must explicitly state these are synthetic reference data, not guidance.

- [ ] **Step 5: Install, run tests, and typecheck both packages**

```bash
pnpm install
pnpm --filter @found-calc/rules test
pnpm --filter @found-calc/rules typecheck
pnpm --filter @found-calc/engine typecheck
```

Expected: PASS and no engine dependency on rules.

- [ ] **Step 6: Commit**

```bash
git add packages/rules pnpm-lock.yaml
git commit -m "feat(rules): add immutable effective-date resolver"
```

---

### Task 6: Implement synthetic rule-dependent calculator and historical reproducibility integration

**Files:**
- Create: `packages/engine/src/reference/synthetic-rule.ts`
- Create: `packages/engine/src/reference/synthetic-rule.test.ts`
- Modify: `packages/engine/src/index.ts`
- Create: `packages/rules/src/synthetic-reference.integration.test.ts`

**Interfaces:**
- Consumes: resolved `RuleDependency<{ ratePercent: string }>` supplied via `CalculationContext.ruleDependencies`.
- Produces:

```ts
export interface SyntheticRuleInput {
  readonly baseAmount: string;
}

export const syntheticRuleCalculatorDefinition: CalculatorDefinition;
export function calculateSyntheticRuleAmount(
  input: SyntheticRuleInput,
  context: CalculationContext,
): CalculationOutcome;
```

- [ ] **Step 1: Write failing engine tests for rule dependency consumption**

Test that:

- missing `reference.synthetic-rate` dependency returns `rule-unavailable`;
- malformed/negative `baseAmount` fails validation;
- rate payload must be canonical percentage from 0 through 100 or returns `invalid-combination`;
- `100.00` with resolved 5% dependency returns `5.00` and exact dependency provenance;
- engine does not resolve/select versions itself: it uses the supplied dependency identity/payload as-is.

- [ ] **Step 2: Run and confirm red**

```bash
pnpm --filter @found-calc/engine test -- synthetic-rule.test.ts
```

Expected: FAIL because the calculator is missing.

- [ ] **Step 3: Implement the pure formula**

Definition:

```ts
id: "reference.synthetic-rule"
classification: "rule-based"
ruleDependencies: [{ ruleId: "reference.synthetic-rate", required: true }]
```

Normalize `baseAmount` to scale 2, parse rate to scale 4, multiply and round to scale 2. Primary answer ID is `calculatedAmount`. Return the supplied `RuleDependency` in result provenance unchanged.

- [ ] **Step 4: Write failing cross-package historical integration tests**

In rules package, resolve canonical fixtures and pass the dependency into engine:

```ts
// 2025-06-01 => 2025-a => 5.00 from base 100.00
// 2026-06-01 => 2026-a => 7.50 from base 100.00
// pinned 2025-a + historical 2025-06-01 still => 5.00 after 2026-a exists
```

Construct a new array with an additional future `2027-a` fixture and assert the original `2025-a` object/result remains structurally identical.

- [ ] **Step 5: Run all engine/rules tests and typechecks**

```bash
pnpm --filter @found-calc/engine test
pnpm --filter @found-calc/rules test
pnpm --filter @found-calc/engine typecheck
pnpm --filter @found-calc/rules typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/engine/src/reference/synthetic-rule.ts packages/engine/src/reference/synthetic-rule.test.ts packages/engine/src/index.ts packages/rules/src/synthetic-reference.integration.test.ts
git commit -m "feat(engine): prove synthetic rule-dependent calculations"
```

---

### Task 7: Add Phase 02 verification script and GitHub Actions gate without weakening Phase 01

**Files:**
- Create: `scripts/verify-phase-02.mjs`
- Create: `tests/foundation/phase-02-verification-contract.test.mjs`
- Create: `.github/workflows/phase-02-verification.yml`
- Modify: `package.json`
- Potentially modify: `.github/workflows/phase-01-verification.yml` only to avoid duplicate Phase 01 PR execution after Phase 02 supersedes it; never remove `verify:phase01` itself.

**Interfaces:**
- Consumes: package scripts from Tasks 1–6 and existing `scripts/verify-phase-01.mjs`.
- Produces: root `pnpm verify:phase02` and CI status `Verify Phase 02 deterministic engine`.

- [ ] **Step 1: Write dependency-free verification-contract test first**

The Node test must read repository text files and assert:

```js
assert.match(rootPackage.scripts["verify:phase02"], /verify-phase-02\.mjs/);
assert.match(phase02Script, /@found-calc\/engine/);
assert.match(phase02Script, /@found-calc\/rules/);
assert.match(phase02Script, /verify-phase-01\.mjs|verify:phase01/);
assert.match(phase02Workflow, /pnpm install --frozen-lockfile/);
assert.match(phase02Workflow, /pnpm verify:phase02/);
assert.match(phase02Workflow, /playwright install --with-deps chromium/);
assert.match(phase02Workflow, /127\.0\.0\.1:8787\/id/);
assert.match(phase02Workflow, /127\.0\.0\.1:8787\/en/);
```

Also assert engine source does not import forbidden boundaries by scanning `packages/engine/src/**/*.ts` text for `@found-calc/rules`, `next/`, `react`, `cloudflare`, `wrangler`, D1 binding identifiers, `fetch(`, `Date.now(`, `Math.random(`, and `Intl.`. The guard is intentionally textual and supplements TypeScript/unit tests.

- [ ] **Step 2: Run and confirm red**

```bash
pnpm test:foundation
```

Expected: FAIL because Phase 02 script/workflow/root script are absent.

- [ ] **Step 3: Add root scripts and Phase 02 serial verification**

Add to root `package.json`:

```json
"typecheck:engine": "pnpm --filter @found-calc/engine typecheck",
"typecheck:rules": "pnpm --filter @found-calc/rules typecheck",
"test:engine": "pnpm --filter @found-calc/engine test",
"test:rules": "pnpm --filter @found-calc/rules test",
"verify:phase02": "node scripts/verify-phase-02.mjs"
```

`verify-phase-02.mjs` must use the same `spawnSync`/fail-fast pattern as Phase 01 and run in this order:

1. dependency-free foundation tests (`pnpm test:foundation`);
2. engine typecheck;
3. rules typecheck;
4. engine tests;
5. rules tests;
6. `node scripts/verify-phase-01.mjs`.

Do not duplicate all Phase 01 step definitions; call the existing canonical Phase 01 runner so later regression maintenance remains single-source.

- [ ] **Step 4: Add Phase 02 workflow**

Create `.github/workflows/phase-02-verification.yml` with:

- push trigger for `phase-02-engine-reference-slices`;
- pull request trigger targeting `main`;
- manual dispatch;
- Node 22 + Corepack;
- `pnpm install --frozen-lockfile`;
- Chromium installation;
- `pnpm verify:phase02`;
- same built/local vinext Worker HTTP smoke for `/id` and `/en` as Phase 01.

If the historical Phase 01 workflow would also run on all PRs to `main`, narrow its PR trigger to the Phase 01 branch or remove only its generic PR trigger after Phase 02 workflow is proven. The historical workflow file and `verify:phase01` command remain available.

- [ ] **Step 5: Run foundation and Phase 02 gate locally**

```bash
pnpm test:foundation
pnpm verify:phase02
```

Expected: all Phase 02 domain tests/typechecks and every Phase 01 regression gate pass.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/verify-phase-02.mjs tests/foundation/phase-02-verification-contract.test.mjs .github/workflows/phase-02-verification.yml .github/workflows/phase-01-verification.yml
git commit -m "ci: enforce Phase 02 deterministic engine verification"
```

Only include `.github/workflows/phase-01-verification.yml` in the commit if it actually changed.

---

### Task 8: Completion verification, documentation, PR, merge, and canonical Phase 02 ZIP baseline

**Files:**
- Create: `docs/verification/phase-02-verification.md`
- Modify: `BASELINE.md`
- Modify: `PHASE_HANDOFF.md`
- Modify: `PHASE_CHAT_TEMPLATE.md` if required by the approved workflow
- Modify: `README.md` only if the repository phase status is recorded there
- External artifact: `found-calc-phase-02-engine-reference-slices.zip`

**Interfaces:**
- Consumes: all implementation and CI evidence from Tasks 1–7.
- Produces: canonical merged `main`, Phase 02 verification record, Phase 03 handoff, and complete ZIP baseline.

- [ ] **Step 1: Run verification-before-completion on branch head**

Run from a clean checkout with frozen dependencies:

```bash
pnpm install --frozen-lockfile
pnpm verify:phase02
```

Then separately run/record the Worker HTTP smoke if it is not already part of the local script:

```bash
cd apps/web
pnpm exec wrangler dev --config dist/server/wrangler.json --port 8787
# verify HTTP 2xx for /id and /en from another shell/process
```

Do not claim completion from prior test output; record fresh branch-head evidence.

- [ ] **Step 2: Write `docs/verification/phase-02-verification.md`**

Record:

- branch/head SHA and Phase 01 base SHA;
- Node/pnpm/toolchain versions;
- exact engine/rules test and typecheck commands;
- fixture/known-answer coverage summary;
- Phase 01 regression gate status;
- Next.js build, vinext check/build, Cloudflare Vitest/D1 smoke, Playwright ID/EN/responsive smoke status inherited through `verify:phase01`;
- Worker `/id` and `/en` HTTP smoke status;
- known limitations (synthetic rules only, no production persistence/rule data/UI/auth/billing/deployment);
- statement that no Phase 03+ scope was introduced.

- [ ] **Step 3: Update continuity documents for Phase 03**

`BASELINE.md` must change phase state to COMPLETE only after verification passes and identify the next phase exactly as defined by the approved phase workflow. `PHASE_HANDOFF.md` must summarize the new public engine/rules contracts, reference slices, verification commands, unresolved limitations, and explicit next-phase boundaries. Preserve ID/EN, accessibility, privacy/trust, Cloudflare, and Rp0 constraints.

- [ ] **Step 4: Commit final documentation**

```bash
git add docs/verification/phase-02-verification.md BASELINE.md PHASE_HANDOFF.md PHASE_CHAT_TEMPLATE.md README.md
git commit -m "docs: finalize Phase 02 canonical handoff"
```

Only stage files that actually changed.

- [ ] **Step 5: Push branch and open PR to `main`**

PR title:

```text
Phase 02 deterministic engine and reference slices
```

PR body must include:

- spec and implementation-plan paths;
- summary of engine/rules boundaries;
- three reference slices;
- verification commands/evidence;
- explicit statement that Phase 03+ scope is excluded;
- merge gate: all required CI checks green, no unresolved review threads, head SHA unchanged.

- [ ] **Step 6: Inspect CI and debug systematically if any check fails**

For every failure, use `superpowers:systematic-debugging`: inspect the failed job/step/log, reproduce the root cause where possible, add or adjust the smallest failing test first, fix the root cause, rerun focused tests, then rerun the full `verify:phase02` gate. Do not bypass or weaken a failing gate.

- [ ] **Step 7: Perform final PR verification and merge**

Before merging, verify:

- PR head SHA equals the verified SHA;
- all GitHub Actions jobs completed successfully;
- no unresolved review threads/requested changes;
- changed files are limited to Phase 02 scope;
- `@found-calc/engine` has no forbidden dependencies/imports;
- no Phase 03+ UI/auth/billing/persistence/production-rule behavior appears in the diff.

Merge to `main` only after all gates pass. Prefer the repository's normal merge method; do not force-merge around protections/checks.

- [ ] **Step 8: Verify merged `main`**

Fetch merged `main`, confirm the merge commit contains the Phase 02 branch head, and verify GitHub's combined status/workflow result for the merged commit when available. Update the completion date/SHA in continuity docs only if the merge process requires a final metadata correction, then rerun CI before considering that correction canonical.

- [ ] **Step 9: Produce the next complete ZIP baseline**

Create `found-calc-phase-02-engine-reference-slices.zip` from the canonical merged `main` source tree, excluding `.git`, `node_modules`, `.next`, `dist`, Playwright reports, caches, and other generated build artifacts while including the committed `pnpm-lock.yaml`, spec, plan, verification evidence, `BASELINE.md`, and `PHASE_HANDOFF.md`.

Verify the archive by listing it and extracting it to a temporary directory. From the extracted archive, confirm at minimum:

```text
BASELINE.md
PHASE_HANDOFF.md
package.json
pnpm-lock.yaml
packages/engine/package.json
packages/engine/src/index.ts
packages/rules/package.json
packages/rules/src/index.ts
docs/verification/phase-02-verification.md
docs/superpowers/specs/2026-08-28-found-calc-phase-02-deterministic-engine-reference-slices-design.md
docs/superpowers/plans/2026-08-28-found-calc-phase-02-deterministic-engine-reference-slices.md
```

Compute and report a SHA-256 checksum for the ZIP. This ZIP becomes the canonical attached baseline for the next chat.

- [ ] **Step 10: Final completion report**

Report merged PR/commit, CI status, verification summary, known limitations, exact next phase from `PHASE_HANDOFF.md`, and provide the generated ZIP download link. Do not state Phase 02 complete unless the merged main verification and ZIP integrity checks are evidenced.
