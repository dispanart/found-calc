# Found Calc — Phase Handoff

**Project:** Found Calc  
**Last canonical completed phase:** Phase 04 — Persistence, Auth & Guest Preservation  
**Current status:** COMPLETE  
**Next phase:** Phase 05 — resolve the exact approved title and scope from the canonical Phase Workflow before implementation

## Rule: one phase = one new chat

Start Phase 05 in a **new chat inside the same Found Calc project** and attach:

`found-calc-phase-04-persistence-auth-guest-preservation.zip`

Also attach or otherwise make available the canonical Found Calc Phase Workflow if it is not already present in the new chat/project context. The repository deliberately does not invent the Phase 05 title or scope when that source is unavailable.

The ZIP is the portable recovery/handoff baseline. GitHub `main` is the collaborative canonical repository. The Phase 04 post-merge baseline workflow packages the exact merged closure tree, records its commit/tree identity, writes `SHA256SUMS`, verifies extraction and required Phase 04 files, and uploads the portable baseline artifact.

## Required reading order for Phase 05

1. `BASELINE.md`
2. `PHASE_HANDOFF.md`
3. `docs/verification/phase-04-verification.md`
4. `docs/superpowers/specs/2026-08-28-found-calc-phase-04-persistence-auth-guest-preservation-design.md`
5. `docs/superpowers/plans/2026-08-28-found-calc-phase-04-persistence-auth-guest-preservation.md`
6. approved Master Product & Architecture Design Spec
7. Tech Stack ADR
8. Design System Decision / requirements / component inventory
9. Accessibility & Responsive Contract
10. canonical Phase Workflow — resolve the exact Phase 05 title, scope, acceptance criteria, and exclusions before writing the Phase 05 plan

## Starter prompt for the new Phase 05 chat

```text
@Superpowers @GitHub @Context7

Start Found Calc Phase 05 from the attached canonical `found-calc-phase-04-persistence-auth-guest-preservation.zip`.

Before implementation:
1. Read BASELINE.md and PHASE_HANDOFF.md.
2. Read docs/verification/phase-04-verification.md and the approved Phase 04 spec/plan.
3. Read the approved Master Product & Architecture Design Spec, Tech Stack ADR, design-system/accessibility contracts, and canonical Phase Workflow.
4. Resolve and state the exact approved Phase 05 title and implementation scope from the canonical Phase Workflow before planning. Do not infer the Phase 05 name/scope from deferred items and do not pull Phase 06+ work forward.
5. Treat Phase 01 platform foundation, Phase 02 deterministic engine/rules truth, Phase 03 catalog/product runtime, and Phase 04 persistence/auth/guest-preservation boundaries as approved baseline. Reopen them only for a verified implementation blocker under change control.
6. Keep reference calculation truth local and deterministic; persistence APIs may validate canonical input but may not calculate results.
7. Use Context7 for current framework/library documentation and the Cloudflare skill/current Cloudflare docs for Workers-specific work.
8. Use Superpowers brainstorming/writing-plans/TDD/systematic-debugging/verification-before-completion as required.
9. Preserve ID/EN, accessibility, privacy/trust constraints, guest-context preservation, and the Rp0 fixed-infrastructure target excluding domain/payment transaction fees.

Create the Phase 05 implementation design/plan first. At Phase 05 completion, produce the next complete ZIP baseline and updated handoff.
```

## Phase 04 completion evidence

The final implementation snapshot before continuity closure is:

- source SHA: `5073c3c97667775adc13708ca5507eb809895ebf`;
- implementation merge commit: `4cc9fe3c84ea56a0caf587754547da0a59a772e5`;
- GitHub Actions run: `33199332188`;
- job: `98944559520`;
- result: **SUCCESS**.

The Phase 04 closure PR is required to receive a separate fresh green `verify:phase04` run before merge. The post-merge baseline workflow then records the exact canonical closure merge SHA/tree in `ARTIFACT_VERIFICATION.txt`.

Phase 04 establishes:

- Better Auth 1.6.29 email/password sign-up, sign-in, sign-out, and D1-backed sessions;
- Better Auth core SQLite/D1 tables plus a narrow `calculator_state` table for the three reference calculator drafts;
- strict persisted-state validation using canonical calculator IDs/versions/input shapes with a 16 KiB API boundary;
- explicit first-party GET/PUT/DELETE calculator-state routes and idempotent POST guest claim;
- opaque HttpOnly first-party guest ownership, minted only on guest persistence mutation;
- browser-only unsaved local drafts that survive ID/EN locale navigation without auth-token storage or automatic network writes;
- explicit Save/Load/Delete controls on all three reference calculators while calculations remain local/deterministic;
- post-auth guest draft claiming with retryable preservation failure semantics;
- localized account UI and an auth-aware three-calculator workspace persistence summary;
- vinext/Cloudflare Vite/workerd runtime isolation from the canonical Next/Turbopack `cloudflare:workers` build stub;
- Phase 04 CI as a superset of all Phase 03/02/01 regression gates, production builds, local D1 migration, browser flows, and built Worker smoke.

See `docs/verification/phase-04-verification.md` for exact counts, TDD/debug evidence, warnings, and exclusions.

## Stable Phase 04 boundaries

### Engine

`@found-calc/engine` owns deterministic calculation truth only. Do not move auth, persistence, locale parsing, React/Next code, rule resolution, Worker bindings, or network I/O into the engine.

### Rules

`@found-calc/rules` owns immutable effective-date/version selection outside the engine. Persisted synthetic state stores only input/date context; provenance is resolved again when calculation runs.

### Catalog

`@found-calc/catalog` owns reference calculator identity, canonical slugs, localized discovery/trust copy, category metadata, and relationships. It does not own formulas, auth, persistence, billing, or production rule datasets.

### Product runtime

`apps/web` owns localized presentation, public forms/results, accessible interaction, auth UI, local draft preservation, explicit persistence controls, and workspace persistence summary. Reference calculations remain local and do not use a calculation API.

### Persistence/auth

D1 stores Better Auth records plus validated canonical calculator input drafts. Better Auth owns credentials/session behavior. Guest persistence uses an opaque HttpOnly cookie. No auth/session token belongs in localStorage.

### Runtime configuration

Canonical `next build` may use the non-executing Cloudflare Worker build stub. vinext/workerd must use native `cloudflare:workers` bindings and must not inherit that Node-only alias.

## Phase 04 interaction contracts to preserve

- unsaved local drafts survive locale navigation/reload without automatic network persistence;
- loading malformed/failed persisted data does not overwrite the current in-progress local draft;
- save is explicit and only sends validated canonical draft input;
- guest ownership cookie is created only on guest persistence mutation;
- authenticated ownership wins over guest ownership;
- guest claim is idempotent, newer state wins, and successful sign-in is not rolled back by claim failure;
- workspace remains a draft summary, not Projects/history;
- discount/business-margin/synthetic-rule formula truth and Phase 03 accessibility/provenance behavior remain unchanged;
- no server endpoint calculates calculator answers.

## Explicitly deferred beyond Phase 04

- remote D1/prod Cloudflare provisioning, deploy/DNS/secrets mutation;
- Xendit/payment/subscription/entitlement/invoice/webhook flows;
- production regulatory rule packs;
- production-scale catalog/SEO publishing and Admin publishing tooling;
- Goals, Projects, named history, sharing/collaboration/exports;
- analytics/telemetry, AI explanations, OAuth, email verification/reset delivery, 2FA, and passkeys.

These exclusions are not permission to implement them all in Phase 05. Phase 05 must follow the canonical Phase Workflow and its exact approved scope.

## Known platform notes

- the all-zero D1 UUID remains local/test-only and must not be mistaken for a deployable remote database;
- `vinext check` reports 90% compatibility with 0 issues; partial notes are `next/font/google` CDN loading and `reactStrictMode` App Router behavior;
- Cloudflare Vitest may emit the inherited pre-build vinext entry static-analysis warning while runtime tests pass;
- current GitHub Actions can warn that actions implemented on Node 20 are being forced onto Node 24 by the runner; the project job itself uses Node 22;
- one signed-out 390px workspace Playwright scenario can hit a transient vinext network loss and passed on retry in the final implementation run; persistence/claim passed normally;
- no credentials or production secrets are included in the baseline artifact.

## Change control

If Phase 05 exposes a conflict with approved Phase 01–04 architecture/contracts:

1. stop the affected work;
2. capture reproducible failing evidence;
3. identify whether the blocker is product scope, framework/runtime behavior, persistence/auth semantics, or a true architecture conflict;
4. propose the smallest compatible amendment;
5. obtain approval before changing an approved boundary or deterministic-truth contract.
