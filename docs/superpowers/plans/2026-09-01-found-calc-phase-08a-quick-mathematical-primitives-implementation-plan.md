# Phase 08A Quick Mathematical Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first production Quick catalog batch—Percentage, existing Stacked Discount, Date Difference, and Length Conversion—through the existing Found Calc engine, public runtime, persistence/workspace, and hosted widget platform without introducing a generic calculator form system.

**Architecture:** Deterministic formulas remain in `@found-calc/engine`; production discovery becomes an aggregate catalog that preserves the immutable three-entry Phase 03 reference subset; each new calculator gets a dedicated React renderer but shares public/widget delivery through the Phase 07B renderer registry. Persistence and widget contracts are extended additively for the three new calculator IDs and for `date`/`select` input definitions.

**Tech Stack:** TypeScript strict, Vitest, React/Next.js 16 App Router, Playwright, Cloudflare Workers/vinext, D1-backed existing persistence/widget services.

**Spec:** `docs/superpowers/specs/2026-09-01-found-calc-phase-08a-quick-mathematical-primitives-design.md`

## Global Constraints

- Preserve Phase 01–07B runtime, security, billing, auth, persistence, widget-domain, CSP, postMessage, and privacy contracts.
- Keep `reference.discount` and its existing `1.0.0` formula/version identity unchanged.
- `referenceCatalog` must remain exactly the original three Phase 03 entries.
- New stable IDs: `quick.percentage`, `quick.date-difference`, `quick.length-conversion`.
- No formula arithmetic in React and no universal formula/form generator.
- New calculators must use the shared renderer for public and widget surfaces.
- No new D1 migration unless a verified persistence blocker is demonstrated.
- ID/EN, keyboard accessibility, 390px reflow, raw-input analytics prohibition, and fixed-infrastructure target remain mandatory.
- `pnpm verify:phase08a` must be a strict superset of `pnpm verify:phase07b`.

---

### Task 1: Extend engine input contracts safely

**Files:** `packages/engine/src/contracts.ts`, `packages/engine/src/contracts.test.ts`, `apps/web/src/lib/widgets/defaults.ts`, `apps/web/src/lib/widgets/defaults.test.ts`.

**Interfaces:** Produce discriminated `DecimalInputDefinition`, `DecimalListInputDefinition`, `DateInputDefinition`, `SelectInputDefinition`, and union `InputDefinition`. Date inputs expose ISO min/max; select inputs expose immutable option IDs; existing decimal definitions compile unchanged.

- [ ] Write contract tests proving decimal definitions remain accepted and date/select definitions require no fake `scale`.
- [ ] Add widget-default RED tests for invalid date/select values.
- [ ] Run engine/widget-default tests and confirm RED.
- [ ] Replace the monolithic input interface with discriminated definitions.
- [ ] Refactor widget default canonicalization to narrow on kind; add strict ISO date and select-option canonicalization while preserving decimal bounds.
- [ ] Run tests and confirm GREEN.
- [ ] Commit `feat(engine): support date and select input definitions`.

### Task 2: Implement Percentage deterministic truth

**Files:** create `packages/engine/src/quick/percentage.ts`, `packages/engine/src/quick/percentage.test.ts`; modify engine index and `apps/web/src/lib/calculators/runtime.ts`/test.

**Interfaces:** `PercentageInput { baseValue: string; percentage: string }`; `percentageCalculatorDefinition` ID `quick.percentage` version `1.0.0`; `calculatePercentage`; `runPercentage`.

- [ ] Write known-answer RED tests for `250 × 12.5% = 31.25`, increased `281.25`, decreased `218.75`.
- [ ] Add malformed, scale, negative percentage, and over-`100000` validation tests.
- [ ] Implement only with engine decimal primitives.
- [ ] Export and add runtime wrapper/test.
- [ ] Run tests GREEN and commit `feat(engine): add percentage calculator truth`.

### Task 3: Implement Date Difference deterministic truth

**Files:** create `packages/engine/src/quick/date-difference.ts` and test; modify engine contracts/index and web runtime/test.

**Interfaces:** `DateDifferenceInput { startDate: string; endDate: string }`; ID `quick.date-difference`; `calculateDateDifference`; validation code `invalid-date-order`.

- [ ] Write fixtures for leap/non-leap boundaries, equal dates, and one-day intervals.
- [ ] Write RED tests for impossible dates, year outside `0001..9999`, and end before start.
- [ ] Implement a pure Gregorian ISO parser/day-number conversion; no local-time Date arithmetic.
- [ ] Return `totalDays`, `wholeWeeks`, `remainingDays` as scale-0 decimals.
- [ ] Export/runtime test GREEN and commit `feat(engine): add deterministic date difference`.

### Task 4: Implement exact Length Conversion truth

**Files:** create `packages/engine/src/quick/length-conversion.ts` and test; modify engine index and web runtime/test.

**Interfaces:** `LengthUnit = "mm" | "cm" | "m" | "km" | "in" | "ft" | "yd" | "mi"`; `LengthConversionInput`; ID `quick.length-conversion`; `calculateLengthConversion`.

- [ ] Write fixtures for inch/cm, mile/km, metre/mm, foot/yard, same-unit identity, and rounding.
- [ ] Write RED validation tests for negative/malformed values and unsupported units through an unsafe boundary.
- [ ] Implement exact integer-nanometre anchors with decimal multiplication/division; no JS floating-point factors.
- [ ] Export/runtime test GREEN and commit `feat(engine): add exact length conversion`.

### Task 5: Promote the catalog without breaking Phase 03 provenance

**Files:** modify catalog source/tests/index and historical catalog foundation test; create `tests/foundation/phase-08a-catalog-contract.test.mts`.

**Interfaces:** Add generic `CalculatorId`, `CalculatorSlug`, `CalculatorCatalogEntry`; preserve all `Reference*` exports and three-entry `referenceCatalog`; add `quickCatalog`, `calculatorCatalog`, `getCalculatorById`, `getCalculatorBySlug`.

- [ ] Add RED tests: reference count 3; Quick exact four; aggregate six unique IDs/slugs because Discount is shared.
- [ ] Test complete ID/EN copy, valid relationships, phase/category metadata, `widgetSafe`.
- [ ] Implement aggregate catalog while preserving historical lookup behavior.
- [ ] Run catalog/foundation GREEN and commit `feat(catalog): add Phase 08A production catalog`.

### Task 6: Add calculator-specific public/shared renderers

**Files:** create Percentage, Date Difference, Length Conversion calculator components; modify renderer registry, page shell, related calculators, and dynamic calculator page.

**Interfaces:** Registry covers all widget-safe routable IDs and each renderer consumes generic catalog entry plus existing surface policy.

- [ ] Add RED registry coverage contract.
- [ ] Implement Percentage UI around “X% of Y” with amount/+/- hierarchy.
- [ ] Implement Date Difference with native date controls and distinct order error.
- [ ] Implement Length Conversion with value/from/to and accessible swap action.
- [ ] Keep Discount interaction unchanged except generic catalog typing.
- [ ] Switch route static params/lookup to aggregate catalog.
- [ ] Run unit/typecheck GREEN and commit `feat(web): add Phase 08A calculator experiences`.

### Task 7: Extend persistence, drafts, and workspace state

**Files:** modify persistence state/tests, local draft/tests, workspace persistence summary/project detail, and relevant foundation contracts.

**Interfaces:** `SupportedCalculatorId` gains three quick IDs; persisted/local-draft unions gain exact calculator-specific shapes.

- [ ] RED tests for valid states and invalid dates/order/units/version/extra keys/payload size.
- [ ] RED local-draft round trips.
- [ ] Implement strict validators using engine definitions/unit guards.
- [ ] Wire renderer load/save/workspace controls.
- [ ] Use generic catalog lookup for workspace labels.
- [ ] Run persistence/workspace/Friends-limit tests GREEN and commit `feat(persistence): support Phase 08A calculator state`.

### Task 8: Register Phase 08A with the Widget Platform

**Files:** modify widget defaults/runtime/http/client tests and implementations, widget creation/configurator, embed and preview pages, parity tests.

**Interfaces:** Widget supported IDs include all six routable calculators. Safe defaults: Percentage `baseValue`/`percentage`; Discount existing fields; Date Difference `startDate`/`endDate`; Length Conversion `value`/`fromUnit`/`toUnit`.

- [ ] RED tests for new IDs/default canonicalization and rejection of bad unit/date values.
- [ ] Extend supported-ID sets without altering domain/entitlement/security logic.
- [ ] Replace hard-coded creation options with explicit widget-safe catalog entries, but retain calculator-specific default controls rather than generated generic forms.
- [ ] Update preview/embed lookups to aggregate catalog.
- [ ] Run inherited widget security/protocol/domain tests GREEN and commit `feat(widgets): register Phase 08A calculators`.

### Task 9: Expand discovery without generic catalog cards

**Files:** modify calculator listing, homepage, shared messages only if required, and discovery browser tests.

- [ ] RED assertions for all new ID/EN slugs and unique pages.
- [ ] Use aggregate catalog and cluster Quick by useful intent rather than repeating identical cards.
- [ ] Keep synthetic rule reference visibly demo/non-production.
- [ ] Verify metadata per route.
- [ ] Run tests/typecheck GREEN and commit `feat(discovery): surface Phase 08A quick calculators`.

### Task 10: Browser, accessibility, and truth-parity regression

**Files:** add Phase 08A Playwright spec and widget parity/accessibility coverage.

- [ ] Add ID/EN known-answer browser tests.
- [ ] Add date-order/numeric validation tests.
- [ ] Add keyboard and 390px no-overflow checks for each new interaction archetype.
- [ ] Add widget parity tests proving shared-renderer truth.
- [ ] Assert lifecycle analytics never include raw values.
- [ ] Run critical specs with retries disabled and repeat twice; commit `test: cover Phase 08A browser and widget parity`.

### Task 11: Add Phase 08A verification and CI contracts

**Files:** create `scripts/verify-phase-08a.mjs`, foundation verification contract, `.github/workflows/phase-08a-verification.yml`, `.github/workflows/phase-08a-baseline-artifact.yml`; modify `package.json`; add a new worker smoke only if inherited smoke cannot be reused.

**Interfaces:** `pnpm verify:phase08a` starts with complete `pnpm verify:phase07b` then runs Phase 08A gates. Canonical artifact is `found-calc-phase-08a-quick-mathematical-primitives.zip` from exact GitHub SHA with SHA256/integrity/secret checks.

- [ ] Write RED verification contract.
- [ ] Implement inherited-superset verifier and CI workflow.
- [ ] Reuse Phase 07B Worker smoke unless a narrow route addition requires more.
- [ ] Add exact-SHA canonical artifact workflow.
- [ ] Validate foundation contract/workflow syntax and commit `ci: add Phase 08A verification gates`.

### Task 12: Review, verify, and close Phase 08A

**Files:** create `docs/verification/phase-08a-verification.md`; after green exact-head verification update `BASELINE.md` and `PHASE_HANDOFF.md`.

- [ ] Run authoritative GitHub Actions Phase 08A gate on exact final implementation head.
- [ ] Use requesting-code-review; inspect full diff for truth, persistence bounds, widget security, and non-generic UX.
- [ ] Apply findings with receiving-code-review/systematic-debugging and rerun exact-head verification after source changes.
- [ ] Use verification-before-completion; do not rely on stale runs.
- [ ] Write verification evidence only after GREEN jobs.
- [ ] Update baseline/handoff naming **Phase 08B — Finance & Salary** as successor without implementing it.
- [ ] Merge PR only after required checks are green.
- [ ] Verify post-merge canonical artifact ZIP/SHA256 and record merged SHA.
- [ ] Completion report must list chosen decisions, alternatives, and rationale.
