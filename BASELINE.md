# Found Calc Phase 02 — Deterministic Engine + Reference Vertical Slices

**Project:** Found Calc  
**Phase state:** COMPLETE  
**Last canonical completed phase:** Phase 02 — Deterministic Engine + Reference Vertical Slices  
**Next phase:** Phase 03 — next approved implementation phase  
**Completion date:** 2026-08-28

## Canonical artifact

`found-calc-phase-02-engine-reference-slices.zip`

This ZIP is the authoritative portable continuity baseline for the next Found Calc implementation chat. GitHub `main` is the collaborative canonical repository; the ZIP is the portable recovery/handoff copy of that merged source tree.

## Completed deliverables

Phase 02 adds deterministic calculation truth without pulling Phase 03+ product surfaces forward:

- formal `@found-calc/engine` workspace package with strict TypeScript and package-local Vitest;
- semantic calculation contracts for definitions, results, assumptions, scenarios, recommendations, validation, and resolved rule provenance;
- locale-independent canonical decimal parser/formatter backed by scaled `bigint` arithmetic;
- deterministic add/subtract/compare/multiply/divide/rescale primitives with signed round-half-up;
- exact/deterministic discount reference slice with sequential stacked discounts and per-step money rounding;
- contextual business-margin reference slice with gross/contribution outputs, immutable scenario evaluation, and quantified synthetic recommendation contract;
- rule-based synthetic reference calculator that consumes pre-resolved dependencies without performing rule resolution inside the engine;
- formal `@found-calc/rules` workspace package with dependency direction `rules → engine`;
- immutable effective-date/version resolver with strict date-only validation, explicit unavailable/ambiguous failures, and version pinning;
- canonical synthetic 2025/2026 rate fixtures and historical reproducibility integration tests;
- `verify:phase02` as a fail-fast superset of package tests/typechecks plus the complete Phase 01 regression gate;
- GitHub Actions frozen-lock verification with Chromium and built Worker `/id` + `/en` smoke tests.

No calculator UI/discovery, production catalog, Better Auth integration, persistence schema, Xendit/billing, production regulatory/rule datasets, Admin, Goals/Projects, or analytics is included.

## Verification status

Detailed evidence is recorded in `docs/verification/phase-02-verification.md`.

The verified implementation gate covers:

1. 7 dependency-free foundation/verification-contract tests;
2. 29 `@found-calc/engine` tests;
3. strict engine TypeScript typecheck;
4. 9 `@found-calc/rules` tests including historical integration;
5. strict rules TypeScript typecheck;
6. the complete Phase 01 regression gate — lint, web typecheck, unit, D1 runtime, 4 Playwright smoke tests, Next build, vinext check, and vinext build;
7. built vinext Worker HTTP smoke for `/id` and `/en`.

The successful implementation workflow evidence is GitHub Actions run `33140898549`, job `98751347126`, for SHA `986ec91224b90124e00d5c59a7fea7f363367f21`. Final continuity-documentation changes are required to pass the same Phase 02 workflow before merge.

## Deterministic-truth contract

- computation inputs use canonical locale-independent decimal strings;
- arithmetic truth uses scaled integers (`bigint`), never binary floating-point in the calculation path;
- scales and rounding boundaries are explicit;
- engine formulas are runtime-agnostic and do not fetch rules or perform I/O;
- rule version/effective-date resolution lives outside the engine;
- resolved rule dependencies are carried into calculation results for reproducibility;
- historical rule versions are immutable fixtures and new versions do not rewrite historical outcomes.

## Synthetic-data disclaimer

The bundled rate fixtures and 10% recommendation threshold exist only to prove contracts and versioned behavior. They are **not production guidance** and must not be promoted as business, financial, tax, legal, marketplace, health, payroll, religious, or regulatory advice/data.

## Known limitations

- `apps/web/wrangler.jsonc` intentionally uses the all-zero local-only D1 UUID. A real Cloudflare D1 database ID is required before remote deployment.
- no Cloudflare account deployment, remote database creation, DNS operation, or credential mutation was performed.
- `vinext check` remains **88% compatible with 0 issues**; `next/font/google` and `reactStrictMode` remain partial-support considerations inherited from Phase 01.
- the Cloudflare Vitest harness can warn that it cannot statically analyze the vinext Worker entry before a vinext build exists; the D1 runtime test passes.
- Phase 02 has no end-user calculator UI; it proves reusable engine/rule package truth only.
- production rule sourcing, publishing, administration, and regulatory datasets remain later-phase work.

## Continuity rule

Start Phase 03 in a **new chat inside the same Found Calc project** and attach `found-calc-phase-02-engine-reference-slices.zip`. Read `PHASE_HANDOFF.md` before implementation. Resolve the exact Phase 03 scope from the approved phase workflow/specification before writing code; do not infer or pull later-phase scope forward.
