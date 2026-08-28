# Found Calc — Phase Handoff

**Project:** Found Calc  
**Last canonical completed phase:** Phase 02 — Deterministic Engine + Reference Vertical Slices  
**Current status:** COMPLETE  
**Next phase:** Phase 03 — next approved implementation phase

## Rule: one phase = one new chat

Start each implementation phase in a **new chat inside the same Found Calc project**. For Phase 03, attach:

`found-calc-phase-02-engine-reference-slices.zip`

The ZIP is the portable recovery/handoff baseline. GitHub `main` is the collaborative canonical repository; the two must represent the same completed Phase 02 source tree.

## Required reading order for Phase 03

1. `BASELINE.md`
2. `PHASE_HANDOFF.md`
3. `docs/verification/phase-02-verification.md`
4. `docs/superpowers/specs/2026-08-28-found-calc-phase-02-deterministic-engine-reference-slices-design.md`
5. `docs/superpowers/plans/2026-08-28-found-calc-phase-02-deterministic-engine-reference-slices.md`
6. Master Product & Architecture Design Spec
7. Tech Stack ADR
8. Design System Decision / requirements / component inventory
9. Accessibility & Responsive Contract
10. Phase Workflow — use it to resolve the exact Phase 03 scope before creating the Phase 03 plan

## Starter prompt for the new Phase 03 chat

```text
@Superpowers

Start Found Calc Phase 03 from the attached canonical `found-calc-phase-02-engine-reference-slices.zip`.

Before implementation:
1. Read BASELINE.md and PHASE_HANDOFF.md.
2. Read docs/verification/phase-02-verification.md and the approved Phase 02 spec/plan.
3. Read the approved Master Product & Architecture Design Spec, Tech Stack ADR, design-system/accessibility contracts, and Phase Workflow.
4. Resolve the exact approved Phase 03 scope from the Phase Workflow before creating the new phase plan; do not guess the phase name or pull Phase 04+ scope forward.
5. Treat Phase 02 engine/rules contracts, numeric truth, dependency direction, historical rule behavior, and Phase 01 platform foundation as approved baseline. Reopen them only for a verified implementation blocker under change control.
6. Use Context7 for current framework/library documentation and the Cloudflare skill/current Cloudflare docs for Workers-specific work.
7. Use Superpowers brainstorming/writing-plans/TDD/systematic-debugging/verification-before-completion as required.
8. Preserve ID/EN, accessibility, privacy/trust constraints, and the Rp0 fixed-infrastructure target excluding domain/payment transaction fees.

Create the Phase 03 implementation plan first. At Phase 03 completion, produce the next complete ZIP baseline and updated handoff.
```

## Phase 02 completion evidence

Phase 02 establishes:

- `@found-calc/engine` deterministic contracts and scaled-`bigint` decimal arithmetic;
- deterministic discount and contextual business-margin reference slices;
- rule-dependent synthetic calculator consuming pre-resolved provenance;
- `@found-calc/rules` immutable effective-date/version selection;
- synthetic historical versions with pinning/reproducibility tests;
- strict package-local tests/typechecks;
- `verify:phase02` as a fail-fast superset of the complete Phase 01 regression gate;
- frozen-lock GitHub Actions verification, Chromium, and built Worker `/id` + `/en` smoke tests.

See `docs/verification/phase-02-verification.md` for exact counts, SHA, workflow evidence, known warnings, and exclusions.

## Stable Phase 02 boundaries

### Engine

`@found-calc/engine` owns deterministic calculation truth only. It must remain independent of React/Next.js, Cloudflare runtime bindings, persistence, network I/O, locale presentation, auth/billing, catalog metadata, and rule resolution.

### Rules

`@found-calc/rules` resolves immutable effective-date/version dependencies and may depend on engine contract types. The engine must not depend on the rules package.

### Numeric truth

Canonical calculation inputs are locale-independent decimal strings. Calculation arithmetic uses scaled `bigint` with declared scales and round-half-up boundaries. Locale parsing/formatting is a presentation-layer responsibility.

### Rule truth

Rule-dependent formulas consume a supplied resolved dependency. Historical versions and provenance must remain reproducible; adding a future rule version must not rewrite an older result.

## Explicitly deferred beyond Phase 02

- calculator UI and discovery/navigation;
- production catalog behavior;
- Better Auth and account flows;
- persistence schemas/product data storage;
- Xendit/billing/payment flows;
- production tax/legal/marketplace/health/payroll/fiqh/regulatory rule packs;
- Admin tooling, Goals/Projects, analytics, and other later-phase surfaces.

## Synthetic-data warning

The synthetic 2025/2026 rates and 10% recommendation threshold are contract fixtures only and are not production guidance or authoritative data.

## Change control

If Phase 03 exposes a conflict with the approved architecture or Phase 02 contracts:

1. stop the affected work;
2. capture the failing evidence;
3. propose the smallest compatible amendment;
4. obtain approval before changing the architecture or deterministic-truth contract.
