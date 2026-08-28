# Found Calc Phase 03 — Product UI Runtime & Discovery Design

**Status:** Approved in-chat design, pending written-spec review gate  
**Date:** 2026-08-28  
**Phase:** 03 — Product UI Runtime & Discovery  
**Branch:** `phase-03-product-ui-runtime-discovery`  
**Base:** `main` at `10ebe2ee89ba7924a86916814c48bb96acf2030a`

## 1. Purpose

Phase 03 turns the Phase 02 deterministic engine and rule contracts into the first end-user calculator product runtime. It implements localized public discovery, calculator routes, accessible calculator interactions, result presentation, trust/provenance presentation, and reference-catalog metadata for the three approved Phase 02 slices.

This phase proves that Found Calc can present deterministic calculation truth as a usable ID/EN product without moving persistence, authentication, billing, production regulatory data, or the frozen production catalog forward from their approved later phases.

The canonical phase name and ordering come from Found Calc Phase Workflow v2: Phase 03 is **Product UI Runtime & Discovery**; Phase 04 is **Persistence, Auth & Guest Preservation**; later platform/catalog hardening remains deferred.

## 2. Approved baseline and invariants

Phase 01 and Phase 02 are approved baseline. Phase 03 must preserve:

- `@found-calc/engine` as pure deterministic calculation truth;
- dependency direction `@found-calc/rules → @found-calc/engine`, never the reverse;
- canonical decimal-string/scaled-`bigint` arithmetic and existing rounding behavior;
- immutable historical rule behavior and explicit provenance;
- native Bahasa Indonesia (`id`) and English (`en`) routes;
- accessibility/responsive, privacy, and trust constraints already approved for Found Calc;
- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui, Space Grotesk, vinext, and Cloudflare Workers compatibility;
- fixed infrastructure target of Rp0 excluding domain/payment transaction fees;
- the existing Phase 02 verification gate as a historical regression contract.

Architecture is reopened only if implementation produces a verified blocker and change control is approved.

## 3. Scope

Phase 03 implements product UI/runtime behavior for exactly the three Phase 02 reference calculators:

1. Discount / stacked discount.
2. Business margin/profit.
3. Synthetic rule-dependent reference calculator.

It also implements the minimum reference catalog and public discovery behavior required to find and navigate those calculators.

### 3.1 Included

- localized ID/EN calculator metadata and copy;
- stable canonical calculator slugs and locale-preserving routes;
- public discovery/navigation for the three reference calculators;
- calculator page shell and shared result/trust presentation primitives;
- calculator-specific input flows rather than a universal schema renderer;
- presentation-layer numeric input normalization and locale formatting;
- validation messages associated with the correct controls;
- keyboard and screen-reader usable form/result interactions;
- responsive mobile-through-desktop layouts;
- progressive result presentation for business margin;
- business-margin scenario/recommendation presentation only where Phase 02 engine truth emits it;
- effective-date rule resolution for the synthetic reference slice outside the engine;
- visible synthetic-data warning and resolved rule-version provenance;
- related-calculator navigation derived from reference catalog metadata;
- Phase 03 unit/integration/E2E verification plus the complete Phase 02 regression gate.

### 3.2 Explicitly excluded

- new calculator formulas or changes to existing Phase 02 numeric truth;
- a production-wide calculator catalog or frozen V1 catalog content;
- D1 product persistence, calculator-history storage, or saved guest state;
- Better Auth, account flows, or guest-preservation migration;
- Xendit, subscriptions, payments, or entitlements;
- production tax, legal, marketplace, health, payroll, fiqh, or regulatory rule packs;
- admin publishing/rule tooling;
- Goals, Projects, Profiles, or authenticated workspace features;
- analytics provider integration or collection of raw calculator inputs;
- production SEO/performance/cost hardening beyond the minimum metadata needed for correct routes;
- remote Cloudflare deployment, DNS changes, or credential mutation;
- TestSprite launch-readiness work reserved for Phase 10.

## 4. Architecture and package boundaries

### 4.1 `@found-calc/engine`

No Phase 03 presentation concerns enter the engine. Existing reference definitions/calculators remain the only source of deterministic result truth. The engine receives canonical normalized values and explicit context; it does not parse locale-specific display strings, select routes, resolve rules, or render copy.

Changes in this package are not expected. If UI integration exposes a genuine contract blocker, stop and use change control rather than silently reshaping engine truth.

### 4.2 `@found-calc/rules`

The synthetic reference page may invoke the existing resolver before calling the engine. Effective date is an explicit UI input/context value. The resolver returns an immutable `RuleDependency`, which the page/runtime supplies to `calculateSyntheticRuleAmount`.

The synthetic fixtures remain contract/demo data and must be visibly labeled as non-production. Phase 03 does not add real rule sources or persistence.

### 4.3 `@found-calc/catalog`

Phase 03 activates this package only as a source-owned **reference product catalog** for the three calculators.

Each entry owns presentation/discovery metadata such as:

- stable calculator ID;
- one locale-independent canonical slug;
- localized ID/EN title, short description, field/result copy, and trust copy references;
- discovery category/tag metadata needed by Phase 03 public surfaces;
- classification/trust presentation metadata compatible with engine classification;
- related-calculator IDs;
- whether the page requires an explicit synthetic/demo warning.

The catalog must not contain formula logic, engine outputs, rule-resolution logic, persistence state, billing state, or production publishing workflow.

The stable slug is shared across locale prefixes, e.g. `/{locale}/calculators/{slug}`. Localized copy changes by locale; calculation identity and slug do not.

### 4.4 `@found-calc/ui`

This package may receive source-owned design-system primitives that are genuinely reusable across product surfaces, such as field framing, result cards, trust/provenance blocks, section headings, empty/validation states, and responsive shell primitives.

It must not become a calculator-schema runtime. Calculator-specific interaction/state belongs in `apps/web` features because the three reference calculators have intentionally different UX.

Source-owned shadcn/ui components remain composable implementation primitives. Phase 03 does not introduce a second component system.

### 4.5 `apps/web`

`apps/web` owns routing, localization selection, calculator-page composition, client interaction state, presentation-layer normalization/formatting, calls into engine/rules, and localized result rendering.

Calculation execution remains local and deterministic. Phase 03 adds no calculation API, database round-trip, or persistence requirement.

## 5. Public information architecture and routes

Phase 03 keeps the existing locale prefixes and introduces a small reference discovery hierarchy:

- `/id` and `/en` — localized public home/discovery entry containing the three reference calculators;
- `/{locale}/calculators` — calculator discovery/list surface;
- `/{locale}/calculators/{slug}` — canonical calculator page.

The exact three canonical slugs are source-owned catalog data and remain identical under `id` and `en`.

Unknown locale/slug combinations must fail predictably through the existing App Router not-found behavior. Locale switching on a calculator page should preserve calculator identity by navigating to the same slug under the alternate locale.

Discovery in Phase 03 is intentionally small: category grouping/cards and related-calculator links are sufficient. Full-text search, production taxonomy scale, personalization, ranking analytics, and frozen V1 catalog breadth are later work.

## 6. Localization and numeric presentation

Engine inputs/results stay canonical and locale-independent. Phase 03 adds presentation adapters at the web boundary.

### 6.1 Input normalization

Numeric controls use text-compatible numeric input behavior with appropriate `inputMode` so the UI can distinguish display input from canonical engine values.

The presentation parser may accept the locale decimal separator and ordinary grouping where unambiguous, but it must reject ambiguous/mixed forms rather than guessing. It normalizes a valid value into the canonical decimal-string shape expected by the engine.

Parsing rules must be explicitly tested for both locales. Formatting/parsing code must never change engine arithmetic or rounding.

### 6.2 Output formatting

Money/percentage output values are formatted from engine canonical strings using locale-aware presentation only after calculation. The engine-provided scale remains authoritative for the underlying numeric value.

Localized labels, explanations, validation copy, trust copy, and navigation live outside engine/rules packages.

## 7. Calculator interaction designs

### 7.1 Discount / stacked discount

The discount calculator provides:

- base amount input;
- an ordered discount-percentage list;
- controls to add/remove discount steps without losing ordering semantics;
- explicit calculate/recalculate action;
- result presentation for final amount, savings, effective combined discount, and ordered breakdown when emitted by the engine.

The UI must make clear that stacked discounts are sequential, not summed.

### 7.2 Business margin/profit

The business-margin calculator exposes the Phase 02 progressive contract:

- required selling price;
- required product cost;
- contextual variable selling cost per order.

Submitting only required fields renders valid gross metrics immediately. Adding the contextual field refines the result with contribution metrics without presenting the earlier gross result as invalid.

Scenario/recommendation UI is a presentation of engine-emitted deterministic truth. It must not invent personalized advice. The Phase 02 10% synthetic recommendation threshold must be labeled as a reference/demo contract rather than authoritative business guidance.

When a scenario is shown, baseline and scenario must remain visually distinguishable and the quantified impact must come from `calculateBusinessMarginScenario` rather than client-side duplicate arithmetic.

### 7.3 Synthetic rule-dependent reference calculator

The page requires:

- base amount;
- explicit effective date;
- resolution of `reference.synthetic-rate` through `@found-calc/rules`;
- engine execution only after successful rule resolution;
- result amount plus visible rule version/effective-period/source provenance.

The page must prominently state that the bundled synthetic 2025/2026 rates are test/reference fixtures, not tax, financial, marketplace, payroll, legal, health, religious, or regulatory guidance.

Rule-unavailable, invalid-date, and ambiguous-resolution failures are rendered as accessible product errors without exposing stack traces.

## 8. Result, validation, and trust presentation

Phase 03 translates semantic IDs from engine results into localized presentation rather than embedding display text in engine output.

A calculator result surface should support:

- one visually clear primary result;
- ordered secondary result sections;
- assumptions when present;
- scenario/recommendation content when present;
- calculation classification (`exact/deterministic` or `rule-based`) in human-readable trust language;
- resolved rule provenance for rule-based results;
- related-calculator navigation after the result or page content.

Validation failures map engine paths/codes to localized field/global messages. Each field error is programmatically associated with its control. A summary may be used when multiple fields fail, but it does not replace field associations.

Unexpected invariant failures use a generic localized failure state and are not converted into fabricated calculation results.

## 9. Accessibility and responsive contract

Existing Found Calc accessibility/responsive requirements remain authoritative. Phase 03 implementation must at minimum prove:

- semantic heading hierarchy and landmarks;
- visible keyboard focus;
- label/control association;
- accessible names for add/remove discount-step controls;
- field errors connected through appropriate ARIA relationships;
- result updates announced without moving focus unexpectedly;
- no color-only status meaning;
- touch targets and spacing usable on mobile;
- calculator form/result order remains understandable at narrow widths;
- locale switch and navigation remain keyboard usable;
- reduced-motion preferences are respected for any nonessential transitions.

No accessibility behavior may depend on a mouse-only interaction.

## 10. Privacy and trust

Phase 03 requires no account and no persistence. Calculator input remains in local page/runtime state and is not sent to analytics, D1, or an external API.

No sensitive raw input is logged as a product feature. Existing development/runtime logs must not deliberately serialize calculator payloads.

Synthetic fixture provenance is visible because rule-based trust requires users to understand what source/version produced the reference result.

## 11. Styling and component direction

Use the approved Found Calc stack and design direction:

- Space Grotesk typography foundation;
- Tailwind CSS v4;
- source-owned shadcn/ui primitives;
- existing design-system requirements/component inventory where available;
- `design-taste-frontend` only within the approved Found Calc scope.

The visual system should feel like one calculator product, but component reuse must follow real interaction sameness. Do not force the discount step editor, progressive margin form, and rule-date workflow into one universal component schema.

## 12. Error handling

Expected user errors are handled as product states:

- presentation parse failure;
- engine validation failure;
- invalid/missing effective date;
- unavailable/ambiguous synthetic rule version;
- unknown calculator slug.

Internal invariant/programming failures remain distinguishable from user validation and use a safe generic UI fallback. The implementation must not silently substitute zero, ignore invalid fields, or retry with different calculation semantics.

## 13. Testing and verification

Every implementation task follows red → green → refactor. Phase 03 adds `verify:phase03` as a fail-fast superset of `verify:phase02`.

The Phase 03 verification contract should include:

1. reference-catalog contract tests for unique IDs/slugs, complete ID/EN copy, valid related IDs, and trust metadata;
2. presentation parser/formatter tests for ID/EN numeric behavior and rejection of ambiguous inputs;
3. focused web unit/component tests for form validation/result mapping where practical with the chosen current toolchain;
4. Playwright flows for all three calculators in ID and EN;
5. Playwright keyboard/accessibility interaction checks for critical controls and result announcement behavior;
6. responsive/mobile smoke coverage for discovery and calculator pages;
7. explicit synthetic-fixture warning/provenance assertions;
8. engine/rules package regression tests and typechecks unchanged;
9. lint, strict TypeScript, canonical Next build, `vinext check`, `vinext build`, Cloudflare Vitest/local D1 regression, and built Worker smoke;
10. dependency-free Phase 03 verification-contract tests guarding scope and CI wiring where useful.

TestSprite is not introduced as a Phase 03 completion dependency because the approved workflow reserves full Regression, TestSprite & Launch Readiness for Phase 10.

## 14. Completion contract

Phase 03 is complete only when:

- the three reference calculators are usable through localized public routes;
- discovery/navigation exposes all three without production-catalog scope creep;
- engine/rules contracts remain deterministic and regression-clean;
- synthetic data is visibly non-production;
- accessibility/responsive critical paths pass the Phase 03 test contract;
- `verify:phase03` and all inherited gates pass;
- known limitations are documented;
- `BASELINE.md`, `PHASE_HANDOFF.md`, and next-phase continuity files are updated;
- SHA256 checksums are regenerated according to the phase workflow;
- the next complete portable baseline ZIP is produced for Phase 04.

The expected Phase 04 handoff targets the workflow-approved **Persistence, Auth & Guest Preservation** phase, without implementing any of that scope inside Phase 03.

## 15. Change control triggers

Stop the affected work and request approval before changing baseline architecture if implementation proves any of the following necessary:

- engine must depend on React/Next.js, locale formatting, catalog, or rule resolution;
- formula truth/rounding must change merely to satisfy UI behavior;
- Phase 03 allegedly requires D1 persistence, Better Auth, billing, or production rule data;
- a universal schema runtime becomes necessary to ship the three reference calculators;
- Cloudflare/vinext compatibility requires a material runtime architecture change rather than a localized compatibility fix.

Capture failing evidence, propose the smallest compatible amendment, and obtain approval before implementing such a change.
