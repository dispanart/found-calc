# Found Calc Phase 02 — Verification Record

**Phase:** Phase 02 — Deterministic Engine + Reference Vertical Slices  
**Completion candidate date:** 2026-08-28  
**Repository:** `dispanart/found-calc`  
**Phase branch:** `phase-02-engine-reference-slices`  
**Pull request:** #2  
**Verified implementation SHA:** `986ec91224b90124e00d5c59a7fea7f363367f21`  
**GitHub Actions run:** `33140898549`  
**GitHub Actions job:** `98751347126`

## Verification result

The Phase 02 superset gate completed successfully for the verified implementation SHA. The workflow used Node.js 22, a frozen pnpm lockfile, installed Playwright Chromium, ran `pnpm verify:phase02`, and smoke-tested the built vinext Worker on both `/id` and `/en`.

`verify:phase02` is fail-fast and contains the complete Phase 01 regression gate. It does not replace or weaken `verify:phase01`.

## Phase 02 package evidence

### Dependency-free verification contract

- 7 foundation/verification-contract tests passed.
- The Phase 02 verification-contract test proves the root script and CI remain a superset of engine, rules, and Phase 01 gates.

### `@found-calc/engine`

- 5 test files passed.
- 29 tests passed.
- strict TypeScript `tsc --noEmit` passed.
- canonical decimal parsing/formatting and scaled-`bigint` arithmetic passed known-answer, cross-scale, comparison, division-by-zero, and signed round-half-up tests.
- discount reference slice passed single/stacked discount, step-rounding, validation, edge-case, normalization, and determinism tests.
- business-margin reference slice passed gross/contribution metrics, negative result, declared rounding, scenario immutability, validation, and synthetic recommendation-contract tests.
- synthetic rule-dependent calculator passed missing-dependency, payload validation, known-answer, provenance, and supplied-version-identity tests.

### `@found-calc/rules`

- 2 test files passed.
- 9 tests passed.
- strict TypeScript `tsc --noEmit` passed.
- effective-date resolution passed strict ISO date-only/calendar validation, version pinning, gap/unavailable, overlap/ambiguous, and immutability tests.
- historical synthetic integration passed 2025/2026 known answers, explicit historical pinning, and future-version append reproducibility.

## Phase 01 regression evidence inside Phase 02

The complete Phase 01 verification gate also passed on the same Phase 02 workflow run:

1. dependency-free foundation tests;
2. ESLint;
3. Cloudflare type generation + TypeScript app/test typecheck;
4. unit Vitest;
5. Cloudflare Workers Vitest proving local D1 access;
6. Playwright route/locale/responsive smoke tests — 4 passed;
7. canonical `next build`;
8. `vinext check`;
9. `vinext build`;
10. built/local Worker HTTP smoke for `/id` and `/en`.

`vinext check` remained **88% compatible, 6 supported, 2 partial, 0 issues**. The two known partial-support items remain `next/font/google` and `reactStrictMode`.

## TDD evidence

Phase 02 behavior was implemented through observed RED → GREEN cycles on GitHub Actions because the local sandbox could not install dependencies from the registry. Representative RED evidence included:

- calculation contract behavioral failure before constructor implementation;
- decimal behavioral assertions before arithmetic implementation;
- discount known-answer/validation failures before formula implementation;
- business-margin known-answer/scenario/recommendation failures before implementation;
- rule resolver import and behavioral failures before date/version resolution implementation;
- synthetic rule calculator import and behavioral failures before dependency consumption/formula implementation;
- historical integration import failure before canonical synthetic fixtures existed;
- verification-contract failure before the final `verify:phase02`/CI superset gate existed.

A final strict-typecheck failure exposed two issues that behavior tests did not catch: regex capture narrowing under `noUncheckedIndexedAccess`, and overly broad outcome-constructor return types. Both were fixed without changing runtime formulas, then the complete gate was rerun successfully.

## Architecture and scope checks

Verified boundaries:

- `@found-calc/engine` owns deterministic calculation truth and does not depend on `@found-calc/rules`.
- `@found-calc/rules` may depend on the engine's rule-dependency contract type.
- engine calculation paths do not perform network, persistence, locale formatting, Cloudflare runtime, React/Next.js, auth, billing, or catalog work.
- rule-dependent calculation consumes an already resolved dependency; version/effective-date selection stays in `@found-calc/rules`.
- numeric truth uses locale-independent canonical decimal strings, explicit scales, scaled `bigint`, and round-half-up boundaries.

Explicitly excluded from Phase 02: calculator UI/discovery, production catalog, authentication, persistence schema, billing/Xendit, production regulatory/tax/legal/marketplace/health/payroll/fiqh rule packs, Admin, Goals/Projects, and analytics.

## Synthetic-data disclaimer

The Phase 02 synthetic rate versions and the 10% business-margin recommendation threshold are contract/test fixtures only. They are not production business, financial, tax, legal, marketplace, health, payroll, religious, or regulatory guidance.

## Known limitations carried forward

- `apps/web/wrangler.jsonc` still uses the all-zero local-only D1 UUID; remote deployment needs a real database ID.
- no Cloudflare account deployment, remote database creation, DNS operation, or credential mutation is part of Phase 02.
- the Cloudflare Vitest harness may warn that it cannot statically analyze the vinext Worker entry before a vinext build exists; the D1 runtime test passes.
- vinext remains at 88% compatibility with the two Phase 01 partial-support items noted above.
- Phase 02 provides domain/package proof slices only; no end-user calculator UI is introduced.
- synthetic rule fixtures are intentionally local/static and do not represent production rule data or a production rule publishing workflow.

## Completion protocol

This record captures the successful implementation gate at `986ec912…`. Continuity-documentation changes made after that evidence must receive a fresh Phase 02 workflow run before PR #2 is merged. After merge, canonical `main` must be verified and `found-calc-phase-02-engine-reference-slices.zip` must be created from the merged source tree and extraction-checked before Phase 02 is treated as the portable canonical baseline.
