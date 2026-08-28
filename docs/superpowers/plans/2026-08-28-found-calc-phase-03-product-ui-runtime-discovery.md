# Found Calc Phase 03 — Product UI Runtime & Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a localized, accessible public calculator runtime and reference discovery experience for the three Phase 02 reference calculators without changing deterministic engine truth or pulling Phase 04+ scope forward.

**Architecture:** Activate `@found-calc/catalog` as a source-owned reference catalog, keep locale parsing/formatting and UI state in `apps/web`, and call the existing `@found-calc/engine` / `@found-calc/rules` contracts directly with no calculation API or persistence layer. Calculator-specific client components own interaction while shared presentation primitives own field/result/trust rendering.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.8, TypeScript 5.9 strict, Tailwind CSS 4.3.3, source-owned shadcn/ui, Space Grotesk, Phosphor Icons, Vitest 4.1.x, Playwright 1.62.1, vinext 1.0.0-beta.8, Wrangler 4.127.0, Node 22, pnpm 11.24.0.

**Spec:** `docs/superpowers/specs/2026-08-28-found-calc-phase-03-product-ui-runtime-discovery-design.md`

## Global Constraints

- Phase 03 canonical name is `Product UI Runtime & Discovery`.
- Preserve `@found-calc/engine` as pure deterministic truth; no React/Next.js, locale, catalog, persistence, network, or rule resolution enters it.
- Preserve dependency direction `@found-calc/rules → @found-calc/engine`.
- Use exactly the three Phase 02 reference calculators: discount, business margin/profit, and synthetic rule-dependent reference.
- Engine-boundary numeric values remain locale-independent canonical decimal strings.
- Support native `id` and `en` routes/copy and locale-preserving navigation.
- Synthetic 2025/2026 rules stay visibly labeled contract/demo fixtures, never authoritative guidance.
- Exclude D1 product persistence, Better Auth, guest preservation, billing/Xendit, Admin core, Goals/Projects/Profiles, production rule packs, frozen V1 catalog, analytics provider, and remote Cloudflare deployment.
- Use source-owned shadcn/ui and one visual system. Apply `design-taste-frontend` only to public/discovery presentation where appropriate; calculator forms follow accessible form-specific product patterns.
- Accessibility is a release gate: semantic labels, focus visibility, field error association, result announcements, keyboard usability, reduced motion, and mobile overflow checks.
- Every behavior follows red → green → refactor. Production code is added only after its behavior is represented by a failing test and the failure is observed in an available local or CI environment.
- Add `verify:phase03` as a fail-fast superset of `verify:phase02`.
- Preserve the Rp0 fixed-infrastructure target excluding domain/payment transaction fees.

## Canonical interfaces

```ts
export type ReferenceCalculatorId =
  | "reference.discount"
  | "reference.business-margin"
  | "reference.synthetic-rule";

export type ReferenceCalculatorSlug =
  | "discount"
  | "business-margin"
  | "synthetic-rule-reference";

export function getReferenceCalculatorBySlug(
  slug: string,
): ReferenceCatalogEntry | undefined;

export type LocaleDecimalParseResult =
  | { readonly ok: true; readonly value: string }
  | {
      readonly ok: false;
      readonly code: "empty" | "malformed" | "ambiguous" | "scale-exceeded";
    };

export function parseLocaleDecimal(
  input: string,
  locale: "id" | "en",
  scale: number,
): LocaleDecimalParseResult;
```

The three web runtime adapters call existing Phase 02 functions only:

```ts
runDiscount(input)
runBusinessMargin(input)
runBusinessMarginScenario(input, scenario)
runSyntheticRule({ baseAmount, effectiveDate })
```

`runSyntheticRule` resolves `reference.synthetic-rate` with `resolveRuleVersion(syntheticRateRuleVersions, request)` before calling `calculateSyntheticRuleAmount`; it never uses a hidden current-date fallback.

---

### Task 1: Lock Phase 03 verification and scope contract

**Files:** create `tests/foundation/phase-03-verification-contract.test.mjs`, `scripts/verify-phase-03.mjs`, `.github/workflows/phase-03-verification.yml`; modify root `package.json`.

- [ ] **Step 1: Write the failing dependency-free verification test.** It must assert that `verify:phase03` points to `scripts/verify-phase-03.mjs`, the runner includes catalog typecheck/test plus `verify:phase02`, the workflow installs frozen dependencies + Chromium and runs `pnpm verify:phase03`, and built Worker smoke includes `/id/calculators`, `/en/calculators`, `/id/calculators/discount`, `/id/calculators/business-margin`, and `/id/calculators/synthetic-rule-reference`.
- [ ] **Step 2: Run** `node --experimental-strip-types --test tests/foundation/phase-03-verification-contract.test.mjs`; require observed RED caused by the missing Phase 03 files.
- [ ] **Step 3: Implement the minimal runner/workflow/scripts** with command order: dependency-free foundation → catalog typecheck → catalog tests → web unit tests → inherited `verify:phase02`.
- [ ] **Step 4: Re-run focused and complete dependency-free foundation tests**; require GREEN.
- [ ] **Step 5: Commit** `test(verification): define Phase 03 contract`.

### Task 2: Activate the three-entry reference catalog

**Files:** create `packages/catalog/package.json`, `tsconfig.json`, `vitest.config.ts`, `src/catalog.ts`, `src/catalog.test.ts`, `src/index.ts`; update README, web package dependencies and lockfile.

- [ ] **Step 1: Write failing catalog tests** for exactly three entries, unique IDs/slugs, complete `id`/`en` presentation records, valid related IDs, classification consistency, and `syntheticWarning: true` only for the synthetic reference.
- [ ] **Step 2: Observe RED** with package tests in CI-capable environment because catalog source does not yet exist.
- [ ] **Step 3: Implement the typed catalog** with canonical slugs `discount`, `business-margin`, `synthetic-rule-reference`; include localized titles/descriptions/category labels/field labels/result labels/trust labels and related calculator IDs. No formulas, rule resolution, persistence or billing metadata.
- [ ] **Step 4: Add workspace metadata/dependencies and refresh the lockfile using pnpm**, never by hand-editing resolution/integrity values.
- [ ] **Step 5: Run catalog test/typecheck** and inherited foundation gate; require GREEN.
- [ ] **Step 6: Commit** `feat(catalog): add Phase 03 reference catalog`.

### Task 3: Implement deterministic locale presentation adapters

**Files:** create `apps/web/src/lib/presentation/decimal.ts` and `.test.ts`.

- [ ] **Step 1: Write failing tests** proving ID `1.234,50 → 1234.50`, ID `10,5 → 10.50`, EN `1,234.50 → 1234.50`, EN `10.5 → 10.50`, and rejection of malformed grouping, mixed/ambiguous separators, exponent syntax, and non-zero precision beyond declared scale.
- [ ] **Step 2: Observe RED** because exports are missing.
- [ ] **Step 3: Implement parsing with string validation only.** Strip only locale-valid grouping, convert the one locale decimal separator to `.`, normalize trailing scale, reject ambiguity rather than guessing, and never use binary floating point for engine-boundary truth.
- [ ] **Step 4: Add `formatCanonicalDecimal`** for presentation-only currency/percent/decimal rendering after canonical truth exists.
- [ ] **Step 5: Run focused + web unit tests**; require GREEN.
- [ ] **Step 6: Commit** `feat(web): add locale decimal presentation adapters`.

### Task 4: Build tested calculation runtime adapters

**Files:** create `apps/web/src/lib/calculators/runtime.ts` and `.test.ts`; update web workspace dependencies.

- [ ] **Step 1: Write failing tests** for known-answer stacked discount, gross/contribution margin, scenario impact, synthetic 2025/2026 provenance, invalid effective date, and unavailable rule date.
- [ ] **Step 2: Observe RED** because adapters are missing.
- [ ] **Step 3: Implement minimal adapters** that call existing `@found-calc/engine` and `@found-calc/rules` exports; duplicate no arithmetic and introduce no localized copy.
- [ ] **Step 4: Run adapter + engine/rules regression tests**; require GREEN with engine source unchanged.
- [ ] **Step 5: Commit** `feat(web): connect calculator runtime adapters`.

### Task 5: Define Phase 03 E2E behavior before UI implementation

**Files:** create `apps/web/tests/e2e/phase-03-calculators.spec.ts`, `phase-03-accessibility.spec.ts`; modify `apps/web/tests/foundation/e2e-contract.test.mjs`.

- [ ] **Step 1: Write calculator E2E tests** using accessible roles/labels and Phase 02 known answers: ID/EN discovery; discount stack; business gross then contribution/scenario; synthetic date, warning and provenance; locale switch preserving slug.
- [ ] **Step 2: Write accessibility/mobile E2E tests** for keyboard add/remove/submit, labels/errors, result live region, and 390px no-horizontal-overflow.
- [ ] **Step 3: Extend the dependency-free E2E contract test** to require both specs and canonical route strings.
- [ ] **Step 4: Run wiring test locally, then Playwright in draft-PR CI and preserve the expected failing run** as RED evidence before the UI exists.
- [ ] **Step 5: Commit** `test(web): define Phase 03 calculator UX`.

### Task 6: Implement public discovery, navigation and localized calculator route shell

**Files:** modify messages/header/home/globals; create calculators index, dynamic slug page, `calculator-page-shell.tsx`, `related-calculators.tsx`.

- [ ] **Step 1: Use the already-failing discovery/routing E2E assertions as RED.**
- [ ] **Step 2: Implement the public/discovery design** as trust-first with one green accent, asymmetric editorial hierarchy, restrained/no nonessential motion, no AI-purple, no three-equal-feature-card row, consistent radius rules, mobile-first spacing, and no visible em dash on the public/discovery surfaces.
- [ ] **Step 3: Implement Next.js 16 routes** with async `params`, `generateStaticParams` for 2 locales × 3 slugs, `generateMetadata`, and `notFound()` for invalid locale/slug, following Context7 Next.js 16.2.9 docs.
- [ ] **Step 4: Preserve calculator identity in locale switching** while keeping existing workspace/admin shells intact.
- [ ] **Step 5: Run discovery/routing Playwright subset in CI**; require those assertions GREEN while calculator-specific tests may remain RED.
- [ ] **Step 6: Commit** `feat(web): add localized calculator discovery routes`.

### Task 7: Implement shared accessible calculator presentation primitives

**Files:** create `field.tsx`, `result-panel.tsx`, `trust-panel.tsx`, `validation-summary.tsx` under `apps/web/src/components/calculator/`.

- [ ] **Step 1: Lock field/error/live-region semantics with failing source/E2E assertions** before components exist.
- [ ] **Step 2: Implement `CalculatorField`** with label above control, optional helper, error below, stable IDs, `aria-invalid`, and `aria-describedby`.
- [ ] **Step 3: Implement `ResultPanel`** with `aria-live="polite"` / status semantics and no forced focus movement; implement trust/provenance and validation summary primitives without calculator logic.
- [ ] **Step 4: Run semantic checks**; require GREEN.
- [ ] **Step 5: Commit** `feat(ui): add accessible calculator primitives`.

### Task 8: Implement discount calculator interaction

**Files:** create `apps/web/src/features/calculators/discount-calculator.tsx`; wire it from dynamic calculator page.

- [ ] **Step 1: Run discount Playwright flow and observe RED.**
- [ ] **Step 2: Implement base amount + ordered discount-step editor** with localized presentation parsing, add/remove accessible names, field-level errors and one explicit calculate action.
- [ ] **Step 3: Render final amount, savings, effective combined discount and ordered breakdown** from engine semantic IDs; perform no percentage arithmetic in React.
- [ ] **Step 4: Run ID/EN, keyboard and mobile discount tests**; require GREEN.
- [ ] **Step 5: Commit** `feat(web): add discount calculator UI`.

### Task 9: Implement business-margin progressive and scenario interaction

**Files:** create `business-margin-calculator.tsx`; wire dynamic page.

- [ ] **Step 1: Run business-margin Playwright flow and observe RED.**
- [ ] **Step 2: Implement required selling price + product cost form** and render gross result without requiring contextual cost.
- [ ] **Step 3: Add optional variable selling cost** and render contribution metrics while retaining valid gross metrics.
- [ ] **Step 4: Render engine-emitted recommendation strictly as reference/demo and invoke `runBusinessMarginScenario` for baseline/scenario/impact comparison**; duplicate no impact arithmetic.
- [ ] **Step 5: Run ID/EN progressive/scenario tests**; require GREEN.
- [ ] **Step 6: Commit** `feat(web): add progressive margin calculator UI`.

### Task 10: Implement synthetic rule calculator trust/provenance interaction

**Files:** create `synthetic-rule-calculator.tsx`; wire dynamic page.

- [ ] **Step 1: Run synthetic Playwright flow and observe RED.**
- [ ] **Step 2: Implement explicit base amount + effective date form** with no current-date fallback and accessible mapping of invalid/unavailable/ambiguous rule failures.
- [ ] **Step 3: Render calculated amount plus `versionId`, effective period, source provenance, and prominent non-production warning** in both locales.
- [ ] **Step 4: Run 2025/2026, invalid-date, warning and provenance tests**; require GREEN.
- [ ] **Step 5: Commit** `feat(web): add synthetic rule reference UI`.

### Task 11: Complete verification, review, docs and portable handoff

**Files:** create `docs/verification/phase-03-verification.md`; update `BASELINE.md`, `PHASE_HANDOFF.md`, `PHASE_CHAT_TEMPLATE.md`, `SHA256SUMS`; produce `found-calc-phase-03-product-ui-runtime-discovery.zip`.

- [ ] **Step 1: Run frozen dependency install and focused tests in GitHub Actions**; require exit 0.
- [ ] **Step 2: Run fresh `pnpm verify:phase03`**; require all Phase 03 and inherited Phase 02/01 gates exit 0.
- [ ] **Step 3: Run built vinext Worker HTTP smoke** for locale roots, calculator discovery and all calculator routes.
- [ ] **Step 4: Run the design-taste pre-flight only on public/discovery surfaces** and the accessibility/responsive checklist across calculator forms.
- [ ] **Step 5: Invoke Superpowers requesting-code-review, inspect PR diff/review threads, and fix only verified issues with TDD.**
- [ ] **Step 6: Record exact CI run IDs, test counts, warnings and limitations** in verification docs; make no unverified success claim.
- [ ] **Step 7: Update handoff to exactly `Phase 04 — Persistence, Auth & Guest Preservation`** and retain one-phase-one-new-chat rule.
- [ ] **Step 8: Generate the complete source ZIP from the verified canonical tree**, excluding `.git`, dependencies, build output, reports and secrets; regenerate/verify SHA256.
- [ ] **Step 9: Mark the PR ready and merge only when the final head has fresh green Phase 03 CI and no unresolved review threads.**
- [ ] **Step 10: If canonical post-merge packaging uses a separate baseline-artifact PR as Phase 02 did, package the merged tree and verify source-tree equivalence before Phase 04 handoff.**

## Plan self-review

- Spec coverage: all Phase 03 sections map to Tasks 1-11; Phase 04+ concerns are explicitly excluded.
- Placeholder scan: no `TBD`, `TODO`, “implement later”, or undefined implementation placeholder remains.
- Type consistency: catalog IDs/slugs, locale parser result, runtime adapter names and Phase 04 handoff name are defined once and reused consistently.
