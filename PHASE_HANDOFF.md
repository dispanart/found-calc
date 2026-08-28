# Found Calc — Phase Handoff

**Project:** Found Calc  
**Last canonical completed phase:** Phase 03 — Product UI Runtime & Discovery  
**Current status:** COMPLETE  
**Next phase:** Phase 04 — Persistence, Auth & Guest Preservation

## Rule: one phase = one new chat

Start Phase 04 in a **new chat inside the same Found Calc project** and attach:

`found-calc-phase-03-product-ui-runtime-discovery.zip`

The ZIP is the portable recovery/handoff baseline. GitHub `main` is the collaborative canonical repository. The post-merge baseline-artifact workflow produces the ZIP from the verified merged Phase 03 tree and verifies its SHA256/extraction before it is used as the Phase 04 input.

## Required reading order for Phase 04

1. `BASELINE.md`
2. `PHASE_HANDOFF.md`
3. `docs/verification/phase-03-verification.md`
4. `docs/superpowers/specs/2026-08-28-found-calc-phase-03-product-ui-runtime-discovery-design.md`
5. `docs/superpowers/plans/2026-08-28-found-calc-phase-03-product-ui-runtime-discovery.md`
6. approved Master Product & Architecture Design Spec
7. Tech Stack ADR
8. Design System Decision / requirements / component inventory
9. Accessibility & Responsive Contract
10. Phase Workflow — use the canonical Phase 04 section to resolve exact implementation scope before writing the Phase 04 plan

## Starter prompt for the new Phase 04 chat

```text
@Superpowers @GitHub @Context7

Start Found Calc Phase 04 — Persistence, Auth & Guest Preservation from the attached canonical `found-calc-phase-03-product-ui-runtime-discovery.zip`.

Before implementation:
1. Read BASELINE.md and PHASE_HANDOFF.md.
2. Read docs/verification/phase-03-verification.md and the approved Phase 03 spec/plan.
3. Read the approved Master Product & Architecture Design Spec, Tech Stack ADR, design-system/accessibility contracts, and Phase Workflow.
4. Resolve the exact approved Phase 04 scope from the Phase Workflow before implementation; do not pull Phase 05+ scope forward.
5. Treat Phase 01 platform foundation, Phase 02 deterministic engine/rules truth, and Phase 03 catalog/product-runtime boundaries as approved baseline. Reopen them only for a verified implementation blocker under change control.
6. Use Context7 for current framework/library documentation and the Cloudflare skill/current Cloudflare docs for Workers-specific work.
7. Use Superpowers brainstorming/writing-plans/TDD/systematic-debugging/verification-before-completion as required.
8. Preserve ID/EN, accessibility, privacy/trust constraints, deterministic truth, and the Rp0 fixed-infrastructure target excluding domain/payment transaction fees.

Create the Phase 04 implementation design/plan first. At Phase 04 completion, produce the next complete ZIP baseline and updated handoff.
```

## Phase 03 completion evidence

The verified implementation snapshot is SHA `73413b5f6f55f957532af595cdc811c2990b440f`, GitHub Actions run `33175892187`, job `98864278561`, with a successful Phase 03 gate and built Worker smoke.

Phase 03 establishes:

- exactly three localized reference catalog entries in `@found-calc/catalog`;
- ID/EN locale presentation parsing/formatting separated from engine truth;
- local runtime adapters that delegate formulas to `@found-calc/engine` and rule resolution to `@found-calc/rules`;
- localized home/discovery/calculator routes with locale-preserving navigation;
- accessible calculator primitives, validation summaries, trust messaging, and polite result regions;
- stacked-discount public interaction;
- progressive business-margin/contribution/scenario interaction with demo-only recommendation framing;
- synthetic rule effective-date selection and resolved provenance presentation;
- Phase 03 CI as a superset of all Phase 02 and Phase 01 regression gates;
- Next.js production build, vinext compatibility/build, and built Worker smoke for public reference routes.

See `docs/verification/phase-03-verification.md` for exact counts, TDD/debug evidence, known warnings, and exclusions.

## Stable Phase 03 boundaries

### Engine

`@found-calc/engine` owns deterministic calculation truth only. Do not move locale parsing, React/Next code, auth, persistence, rule resolution, catalog metadata, Worker bindings, or network I/O into the engine.

### Rules

`@found-calc/rules` owns immutable effective-date/version selection outside the engine. Rule-based product flows must supply explicit resolved dependencies; historical results remain reproducible.

### Catalog

`@found-calc/catalog` owns reference calculator identity, canonical slugs, localized discovery/trust copy, category metadata, and related-calculator relationships. It does not own formulas, persistence, auth, billing, or production rule datasets.

### Product runtime

`apps/web` owns ID/EN input normalization/output formatting, calculator-specific public forms/results, accessible interaction, discovery/navigation, and trust/provenance presentation. Reference calculations remain local/deterministic and do not use a calculation API.

### Numeric truth

Canonical calculation inputs remain locale-independent decimal strings. Calculation arithmetic remains scaled `bigint` with explicit scales/rounding in `@found-calc/engine`. Presentation parsing must never become formula truth.

## Phase 03 interaction contracts to preserve

- discount steps are ordered and calculated sequentially by the engine;
- business-margin gross result does not require contextual variable cost;
- adding variable cost produces contribution metrics without deleting valid gross metrics;
- scenario impact comes from `calculateBusinessMarginScenario`, not duplicate React arithmetic;
- synthetic rule UI requires an explicit effective date and has no current-date fallback;
- synthetic fixture warnings/provenance remain visible and are never promoted as authoritative production data;
- locale switching preserves calculator route context;
- field errors remain associated to controls and result updates remain accessible.

## Explicitly deferred beyond Phase 03

- Better Auth/account/session implementation;
- durable guest preservation and product persistence schemas;
- production D1 creation/migration and remote Cloudflare deployment;
- Xendit/payment/billing flows;
- production tax/legal/marketplace/health/payroll/fiqh/regulatory rule packs;
- production-scale SEO/catalog publishing;
- Admin publishing tooling, Goals/Projects, analytics, and AI explanations.

These items are not permission to implement them all in Phase 04. Phase 04 must follow the canonical workflow and its exact approved scope.

## Known platform notes

- `vinext check` is 88% compatible with 0 issues; partial notes are `next/font/google` and `reactStrictMode`.
- the all-zero D1 ID remains local-only and must not be mistaken for a deployable remote database.
- Cloudflare Vitest may emit the inherited pre-build vinext entry static-analysis warning; runtime and built Worker verification pass.
- no credentials/secrets are part of the baseline artifact.

## Change control

If Phase 04 exposes a conflict with the approved Phase 01–03 architecture/contracts:

1. stop the affected work;
2. capture reproducible failing evidence;
3. identify whether the blocker is product scope, framework/runtime behavior, or a true architecture conflict;
4. propose the smallest compatible amendment;
5. obtain approval before changing an approved boundary or deterministic-truth contract.
