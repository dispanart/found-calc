# Found Calc Phase 02 — Deterministic Engine + Reference Vertical Slices Design

**Status:** Approved design, pending written-spec review gate  
**Date:** 2026-08-28  
**Phase:** 02 — Deterministic Engine + Reference Vertical Slices  
**Branch:** `phase-02-engine-reference-slices`  
**Base:** `main` at `a64ee22d2c6725e9372ca2aa0e9066e68bb93cae`

## 1. Purpose

Phase 02 establishes Found Calc's deterministic calculation truth as a pure TypeScript subsystem and proves the contract through three representative reference vertical slices:

1. Discount / stacked discount — simple calculator.
2. Business margin/profit — contextual calculator.
3. Synthetic rule-dependent calculator — versioned rule behavior.

The phase validates engine and rule boundaries before the product UI runtime is introduced in Phase 03. It must not pull forward authentication, billing, persistence, production catalog behavior, production regulatory data, or other Phase 03+ concerns.

## 2. Approved baseline and constraints

Phase 01 repository and architecture boundaries remain approved. Phase 02 may amend them only under change control when a verified implementation blocker demonstrates a real conflict.

The implementation must preserve:

- pure deterministic numeric truth independent of UI and transport;
- the existing `apps/web`, `packages/engine`, `packages/rules`, `packages/catalog`, and `packages/ui` boundaries;
- native Bahasa Indonesia (`id`) and English (`en`) product capability without allowing locale to affect numeric truth;
- accessibility and trust semantics defined by the approved contracts;
- privacy defaults, including no analytics collection of raw sensitive calculator inputs by default;
- the Rp0 fixed-infrastructure target excluding domain and payment transaction fees;
- the Phase 01 Next.js + vinext + Cloudflare Workers verification baseline.

Phase 02 does not require a remote Cloudflare deployment or a production D1 database.

## 3. Design choice

### 3.1 Selected approach: package-first reference slices

Implement the deterministic engine in `@found-calc/engine`, implement generic version/effective-date resolution in `@found-calc/rules`, and prove the contracts with three reference calculators at package/test level.

This validates the engine against realistic calculator behavior without coupling engine truth to Phase 03 UI shells.

### 3.2 Rejected alternatives

**Reference Next.js calculator pages in Phase 02** are rejected because calculator UI runtime, discovery, result presentation, and accessibility interaction behavior belong to Phase 03.

**A universal schema-driven calculator runtime** is rejected because it would prematurely force unlike calculators into a generic form/result model, conflicting with the approved non-generic calculator experience standard.

## 4. Package boundaries

### 4.1 `@found-calc/engine`

Owns deterministic calculation contracts, canonical numeric primitives, validation outcomes, calculation contexts, typed results, provenance/trace structures, scenario evaluation primitives, and the reference domain formulas used to prove the contract.

It must not depend on React/Next.js, Cloudflare runtime APIs, D1/persistence, network access, locale formatting APIs for calculation truth, product discovery/catalog metadata, billing/authentication, or production rule sources.

### 4.2 `@found-calc/rules`

Owns immutable rule-version definitions, effective-period representation, generic rule resolution by explicit context, explicit version pinning, and typed resolution failures for missing or ambiguous coverage.

`@found-calc/rules` may depend on stable engine contract types when useful, but `@found-calc/engine` must not depend on the rule package. The calculation engine consumes resolved rule dependencies through `CalculationContext` rather than resolving rules itself.

### 4.3 `@found-calc/catalog` and `@found-calc/ui`

Remain structurally present but receive no production Phase 02 runtime behavior. Calculator titles, localized copy, discovery metadata, canonical routes, form components, result cards, trust-strip presentation, and related-calculation UX remain Phase 03 scope.

## 5. Deterministic calculation contract

Phase 02 implements the workflow-required concepts:

- `CalculatorDefinition`
- `CalculatorVersion`
- `InputDefinition`
- `Assumption`
- `CalculationContext`
- `CalculationResult`
- `ResultSection`
- `Scenario`
- `Recommendation`
- `RuleDependency`

Supporting generic types are allowed, but these concepts must remain directly identifiable in the public package contract.

### 5.1 Contract principles

1. A calculation is a pure function of explicit calculator version, normalized inputs, assumptions, scenario state, and resolved rule dependencies.
2. Re-running the same calculation with the same explicit inputs/context produces structurally equal calculation truth.
3. Engine code must not call `Date.now()`, `Math.random()`, network APIs, storage APIs, environment bindings, or locale-dependent parsing/formatting.
4. Effective date/time required by a calculation is supplied in `CalculationContext`.
5. Calculator definitions use semantic identifiers rather than localized user-facing copy.
6. UI/catalog layers may translate semantic identifiers later; translation cannot change formulas, rule selection, or normalized values.
7. Calculation outputs expose enough provenance to reproduce the result.

### 5.2 Calculator and input definitions

`CalculatorDefinition` describes calculation-facing identity and input contract, not full product-page metadata. It contains at minimum stable calculator ID, calculator version identity, calculation type/risk classification needed by trust semantics, calculation-relevant input/assumption definitions, and rule dependency declarations when applicable.

Canonical slug, H1 copy, SEO text, localized labels, FAQ copy, and discovery taxonomy remain outside the engine contract.

`InputDefinition` is calculation-oriented and may describe stable input ID, data kind, requirement level (`required`, `recommended`, `advanced`, `contextual`), canonical unit/currency metadata when mathematically relevant, validation constraints, and semantic downstream dependencies. The engine does not own ID/EN field labels or helper copy.

## 6. Canonical numeric model and rounding

JavaScript binary floating-point must not silently define financial truth.

Phase 02 implements a small source-owned canonical decimal/scaled-integer primitive with these properties:

- external normalized numeric values use locale-independent canonical decimal strings or an equivalent typed representation losslessly convertible to them;
- internal arithmetic uses integer/scaled arithmetic rather than unbounded binary-float chaining;
- scale is explicit;
- addition, subtraction, multiplication, division-to-explicit-scale, comparison, and rounding used by the three slices are deterministic;
- the Phase 02 reference calculators use round-half-up at declared boundaries;
- money-like reference inputs/outputs use scale 2, while computed percentage outputs use scale 4;
- Discount rounds the remaining amount to scale 2 after each discount step;
- Business Margin rounds amount outputs to scale 2 and percentage outputs to scale 4;
- the synthetic rule slice rounds its calculated amount to scale 2;
- formatting into `Rp`, commas, periods, or localized percent text is not engine responsibility.

The implementation remains intentionally small and must not become a general arbitrary-precision mathematics framework in Phase 02.

## 7. Validation and error model

Expected user-invalid input returns a typed validation failure rather than throwing an uncontrolled exception.

Validation distinguishes at least missing required input, malformed/non-canonical numeric input, out-of-range input, invalid combination, division-by-zero/no-defined-result conditions where relevant, unavailable rule version, and ambiguous rule resolution.

Programming errors and impossible internal invariants may fail fast through explicit invariant errors. No technical stack trace or internal error code is defined as user-facing copy in this phase.

## 8. Calculation context, result, and provenance

`CalculationContext` carries only explicit calculation dependencies such as effective date, calculator version selection, resolved `RuleDependency` records, explicit assumptions, and scenario identity/state.

Locale must not affect numeric truth or rule selection. The preferred Phase 02 contract omits locale entirely from the pure calculation context unless a concrete implementation need is proven.

A successful `CalculationResult` contains at minimum calculator ID/version, normalized inputs, applied assumptions, semantic primary answer/output data, ordered `ResultSection` structures, resolved rule provenance when applicable, calculation classification (`exact/deterministic` or `rule-based` for these slices), optional deterministic recommendations, scenario identity when applicable, and trace/provenance sufficient for reproducibility.

Result structures use semantic IDs and canonical values, not localized prose. Calculation trace is a calculation artifact, not analytics; Phase 02 does not transmit it to an analytics provider or persist it to D1.

## 9. Scenarios and recommendations

`Scenario` represents an explicit variation from a baseline calculation. Scenario evaluation must not mutate the baseline input/result object.

A deterministic `Recommendation` may be emitted only when quantified impact can be modeled from explicit calculation state. Its contract represents a semantic recommendation ID, trigger condition, quantified estimated impact, trade-off semantic code/metadata, and an explicit scenario/input change that reproduces the impact.

If meaningful impact cannot be calculated, the engine emits no fabricated personalized recommendation.

## 10. Rule architecture in Phase 02

Phase 02 implements only generic mechanics needed to validate the approved rule architecture. It does not introduce real tax, marketplace, payroll, health, or fiqh rules.

### 10.1 Rule version model

A rule version is immutable and contains at minimum rule ID, version ID, effective-from date, optional effective-until date, the rule payload used by the synthetic formula, and provenance metadata needed by the calculation contract. Old versions are never overwritten.

### 10.2 Effective-date resolution

Resolution uses validated date-only ISO values (`YYYY-MM-DD`):

- exactly one matching version resolves successfully;
- no matching version returns a typed unavailable-resolution failure;
- multiple matching versions return a typed ambiguous-resolution failure rather than silently choosing one;
- explicit version pinning selects the requested immutable version only when that version exists and its effective period contains the supplied historical effective date; otherwise resolution fails explicitly;
- historical recalculation reproduces a prior result by supplying the original effective date together with the pinned rule version.

### 10.3 Dependency direction

Rule resolution happens before calculation. A rule-driven calculation receives a resolved `RuleDependency` containing the rule/version identity and calculation payload/provenance it needs. The engine does not call a resolver, database, API, or catalog during formula execution.

## 11. Reference slice A — Discount / stacked discount

### 11.1 Purpose and inputs

Prove the simple-calculator contract, canonical arithmetic, operation ordering, rounding, validation, and breakdown results.

Inputs:

- `baseAmount`, canonical amount greater than or equal to zero;
- ordered `discountPercentages`, each canonical percentage from 0 through 100 inclusive.

### 11.2 Behavior

One discount applies directly to the base. Stacked discounts apply sequentially to the remaining amount, not by naively summing percentages. The result exposes final amount, absolute saving, effective combined discount, and semantic breakdown steps where mathematically valid.

### 11.3 Required tests

- known-answer single discount;
- known-answer stacked discount;
- zero amount;
- 0% discount;
- 100% discount;
- invalid negative/over-limit percentages;
- rounding edge;
- repeated identical input produces equal result truth.

## 12. Reference slice B — Business margin/profit

### 12.1 Purpose and inputs

Prove a contextual calculator that returns a useful early result, refines with a contextual input, evaluates scenarios without mutation, and emits a quantified deterministic recommendation only when justified.

Required baseline inputs:

- `sellingPrice`, greater than zero;
- `productCost`, greater than or equal to zero.

Contextual input:

- `variableSellingCostPerOrder`, greater than or equal to zero and materially changing contribution/profit.

### 12.2 Progressive results

With required inputs only, return gross profit amount and gross margin percentage. When `variableSellingCostPerOrder` is supplied, add/refine contribution metrics without invalidating earlier mathematically valid gross metrics.

Progressive result sections are represented semantically in the engine; no Phase 03 interface is implemented.

### 12.3 Scenario behavior

At least one scenario changes a material variable and computes its impact from an immutable baseline. Tests prove baseline inputs/results remain unchanged, scenario output records its identity, and scenario impact is reproducible.

### 12.4 Recommendation behavior

The reference slice uses a deliberately non-production recommendation policy solely to prove the contract: when `variableSellingCostPerOrder` is present, contribution margin is below 10%, and reaching a 10% contribution margin is mathematically possible by reducing that variable cost to a non-negative value, emit semantic recommendation `simulate-variable-cost-to-10pct-contribution-margin`.

The result includes the exact required cost change, quantified contribution impact, and trade-off semantic code `feasibility-not-modeled`. The 10% threshold is a reference fixture, not business guidance, and must be documented as such in source/tests.

### 12.5 Required tests

- baseline known answer;
- zero-profit/break-even boundary;
- invalid selling-price/cost combinations defined by the contract;
- rounding edge;
- progressive required-only result;
- refined result with contextual cost;
- scenario immutability;
- quantified recommendation trigger and non-trigger cases;
- deterministic repeatability.

## 13. Reference slice C — Synthetic rule-dependent calculator

### 13.1 Purpose

Prove rule resolution, effective dates, immutable versions, rule provenance, and historical version pinning without pretending synthetic data is a production regulation.

### 13.2 Synthetic rule set

Use synthetic rule ID `reference.synthetic-rate` with immutable fixtures:

- version `2025-a`: effective `2025-01-01` through `2025-12-31`, payload `ratePercent = 5`;
- version `2026-a`: effective from `2026-01-01` with no end date, payload `ratePercent = 7.5`.

The synthetic calculator accepts a non-negative scale-2 `baseAmount`, multiplies it by the resolved synthetic rate, and returns a scale-2 round-half-up calculated amount plus rule provenance. Dedicated resolver tests may construct additional gap and overlap fixtures without mutating these canonical versions.

All names/docs/tests must state that the rule is synthetic and not legal, tax, marketplace, health, or fiqh guidance.

### 13.3 Required tests

- date in version A period resolves A and produces its known answer;
- date in version B period resolves B and produces its known answer;
- explicit pinning to version A reproduces the historical calculation after version B exists;
- adding/newer version data does not mutate version A;
- a date gap returns unavailable resolution;
- overlapping versions are rejected as ambiguous;
- result provenance records resolved rule ID/version/effective period;
- calculation itself performs no rule lookup/network/storage access;
- deterministic repeatability.

## 14. Test-driven implementation strategy

All behavioral work follows red → green → refactor.

Intended order:

1. contract/type tests where runtime assertions are meaningful;
2. canonical numeric primitive tests;
3. validation/result/provenance tests;
4. simple discount known-answer tests, then implementation;
5. business contextual/progressive/scenario/recommendation tests, then implementation;
6. rule resolver version/effective-date tests, then implementation;
7. synthetic rule-dependent slice tests, then implementation;
8. package integration/regression tests;
9. full repository regression gate.

Tests prefer known-answer assertions and structural equality over snapshots for numeric truth.

## 15. Verification and CI contract

Phase 02 adds:

```bash
pnpm verify:phase02
```

The gate includes all relevant Phase 01 regression gates plus Phase 02 package verification:

1. Phase 01 dependency-free foundation regression tests;
2. engine/rules lint and TypeScript checks;
3. engine/rules Vitest known-answer and boundary suites;
4. web ESLint;
5. Cloudflare type generation + web/test TypeScript checks;
6. existing web unit Vitest;
7. existing Cloudflare Workers Vitest proving local D1 access;
8. existing Playwright ID/EN, route-boundary, and responsive smoke tests;
9. canonical `next build`;
10. `vinext check`;
11. `vinext build`;
12. built/local Worker HTTP smoke for `/id` and `/en`.

GitHub Actions receives a Phase 02 verification workflow or a carefully renamed/updated existing workflow. Frozen lockfile installation remains mandatory. No completion claim may rely on only package tests while repository/cloud build regressions are failing.

## 16. Cloudflare/runtime impact

The deterministic engine and rules packages are runtime-agnostic and do not require Workers bindings.

Phase 02 preserves the Phase 01 Cloudflare compatibility path and existing local D1 Worker test. Workers-specific changes are allowed only when needed to keep existing build/test integration passing; they are not a reason to move calculation truth into Worker code.

Any Workers-specific implementation decision must be checked against current Cloudflare documentation and repository-pinned types/config schema.

## 17. ID/EN, accessibility, privacy, and trust

No Phase 02 engine result is localized. Canonical decimal values, ISO effective dates, semantic result IDs, and rule version identifiers are locale-neutral. Phase 03 maps them to natural ID/EN UI copy and locale-aware formatting.

Phase 02 does not implement calculator interfaces, but must expose semantic result sections, validation identities, scenario identities, and rule/trust provenance cleanly enough that Phase 03 can implement accessible headings, error associations, live-result semantics, scenario identification, and rule warnings without reverse-engineering formulas.

No analytics transport is introduced. No raw calculation trace/input data is persisted or transmitted by default.

Reference results distinguish deterministic results from rule-based results in machine-readable classification/provenance. Synthetic rule data must never be represented as current real-world guidance.

## 18. Explicit non-goals

Not Phase 02 deliverables:

- public calculator pages or calculator form/result UI;
- homepage/discovery/search integration;
- production catalog population or SEO metadata;
- auth or guest-to-account preservation;
- D1 production persistence schemas or Drizzle persistence implementation;
- Xendit/payment integration;
- production tax/payroll/marketplace/health/fiqh rules;
- rule administration/publishing lifecycle UI;
- Goals/Projects/workspace behavior;
- analytics providers/events;
- AI explanations;
- remote Cloudflare production deployment;
- TestSprite broad product validation allocated to later release/testing phases.

## 19. Repository delivery workflow

After this written spec passes its review gate:

1. invoke Superpowers `writing-plans` and create the detailed Phase 02 implementation plan;
2. implement on `phase-02-engine-reference-slices` using TDD;
3. use systematic debugging for unexpected test/build/CI failures before proposing fixes;
4. run verification-before-completion using fresh full-gate evidence;
5. commit/push Phase 02 implementation and documentation;
6. open a PR from the Phase 02 branch to `main`;
7. run/inspect the full GitHub CI verification;
8. merge only after all completion gates pass;
9. update `BASELINE.md`, `PHASE_HANDOFF.md`, verification evidence, and checksum manifest;
10. produce the complete canonical `found-calc-phase-02-engine-reference-slices.zip` from the merged/verified source baseline.

Repository auto-merge settings may be enabled only when they cannot bypass required checks. If repository settings do not support safe auto-merge, merge is performed explicitly after verification rather than weakening the gate.

## 20. Completion criteria

Phase 02 is complete only when:

- engine contracts required by the approved workflow exist and are typechecked;
- deterministic arithmetic/rounding behavior is covered by known-answer tests;
- discount slice passes simple-calculator tests;
- business slice passes progressive/scenario/recommendation tests;
- synthetic rule slice passes effective-date/version-pinning tests;
- repeated equal inputs/context produce equal calculation truth;
- engine truth has no UI/network/persistence/runtime-binding dependency;
- real production rule data has not been pulled forward;
- `pnpm verify:phase02` passes from a clean frozen-lockfile install context;
- GitHub CI passes on the Phase 02 PR;
- verification-before-completion finds no unresolved completion-gate failure;
- PR is merged to `main` only after the gates pass;
- Phase 02 verification record, baseline/handoff, checksums, and canonical ZIP are produced.

## 21. Change control

If implementation exposes a real conflict with the approved Phase 01 architecture, master design, ADR, or this Phase 02 spec:

1. stop the affected implementation path;
2. capture the failing evidence or incompatible requirement;
3. propose the smallest possible amendment and its consequences;
4. obtain user approval before changing approved architecture or pulling later-phase scope forward.
