# Found Calc — Phase Handoff

**Project:** Found Calc  
Last canonical completed phase is **Phase 06 — Goals, Projects, Profiles & Workspace**  
**Current status:** COMPLETE  
**Next phase:** **Phase 07 — Billing, Entitlements & Xendit**

## Rule: one phase = one new chat

Start Phase 07 in a **new chat inside the same Found Calc project** and attach:

`found-calc-phase-06-goals-projects-profiles-workspace.zip`

Use the exact post-merge artifact produced from `main`. GitHub `main` is the collaborative canonical repository; the ZIP is the portable recovery/handoff baseline. The Phase 06 post-merge artifact workflow archives the exact merged `GITHUB_SHA`, writes `SHA256SUMS`, verifies required files/extraction, and records commit/tree identity in `ARTIFACT_VERIFICATION.txt`.

## Required reading order for Phase 07

1. `BASELINE.md`
2. `PHASE_HANDOFF.md`
3. `docs/verification/phase-06-verification.md`
4. `docs/superpowers/specs/2026-08-29-found-calc-phase-06-goals-projects-profiles-workspace-design.md`
5. `docs/superpowers/plans/2026-08-29-found-calc-phase-06-goals-projects-profiles-workspace.md`
6. approved Master Product & Architecture Design Spec
7. Tech Stack ADR
8. Design System Decision / requirements / component inventory
9. Accessibility & Responsive Contract
10. canonical Phase Workflow and the approved Phase 07 scope/acceptance criteria

## Starter prompt for the new Phase 07 chat

```text
@Superpowers @GitHub @Context7

Start Found Calc Phase 07 — Billing, Entitlements & Xendit from the attached canonical `found-calc-phase-06-goals-projects-profiles-workspace.zip`.

Before implementation:
1. Read BASELINE.md and PHASE_HANDOFF.md.
2. Read docs/verification/phase-06-verification.md and the approved Phase 06 design/plan.
3. Read the approved Master Product & Architecture Design Spec, Tech Stack ADR, design-system/accessibility contracts, and canonical Phase Workflow.
4. Confirm the exact approved Phase 07 acceptance criteria and exclusions before planning; do not pull Phase 08+ work forward.
5. Treat Phase 01 platform foundation, Phase 02 deterministic engine/rules truth, Phase 03 catalog/product runtime, Phase 04 persistence/auth/guest preservation, Phase 05 versioned-rule/admin boundaries, and Phase 06 workspace/project/privacy boundaries as approved baseline. Reopen them only for a verified implementation blocker under change control.
6. Preserve the deterministic boundary: billing/entitlement/payment flows must not become calculator formula truth or alter reference calculator arithmetic.
7. Preserve the workspace boundary: Phase 04 latest drafts and Phase 06 named Project history remain separate domains unless the approved Phase 07 design explicitly requires a compatible migration.
8. Preserve server-derived authorization and private Goal/Project export boundaries while adding only the exact entitlement/payment capabilities Phase 07 authorizes.
9. Use Context7 for current framework/library documentation and the Cloudflare skill/current Cloudflare docs for Workers-specific work. Use current official Xendit documentation for Xendit-specific contracts before implementation.
10. Use Superpowers brainstorming/writing-plans/TDD/systematic-debugging/verification-before-completion as required.
11. Preserve ID/EN, accessibility, privacy/trust constraints, guest-context preservation, and the Rp0 fixed-infrastructure target excluding domain/payment transaction fees.

Create the Phase 07 design/implementation plan first. At completion, produce the next complete canonical ZIP baseline and updated handoff.
```

## Phase 06 completion evidence

The verified implementation snapshot before continuity closure is:

- source SHA: `bb1eb7fc98de5673c271c22e6aa12563e78fc92d`;
- GitHub Actions run: `33242970535`;
- job: `99075355501`;
- result: **SUCCESS**.

That implementation run passed the full Phase 06 verifier and authenticated built-Worker smoke. The Phase 06 closure tree must receive a separate fresh green `Phase 06 Verification` run before merge. After merge, the Phase 06 canonical artifact workflow records the exact merged SHA/tree dynamically.

Phase 06 establishes:

- D1-backed profiles and private Goals;
- Projects with server-derived owner/editor/viewer access;
- random hashed expiring one-time invites with atomic redemption;
- named Project calculation history storing validated canonical state while formula truth remains local;
- localized workspace dashboard and Project detail surfaces;
- privacy-safe Project export and owner-sensitive membership controls;
- explicit separation between Phase 04 latest drafts and Phase 06 named Project history;
- a full Phase 06 gate covering contracts, workspace unit/Cloudflare tests, browser flows, Next/vinext builds, inherited Phase 05→01 regressions, and authenticated built-Worker workspace smoke.

See `docs/verification/phase-06-verification.md` for RED→GREEN/debug evidence, architecture/security review, known platform notes, and closure/artifact rules.

## Stable Phase 06 boundaries to preserve

### Engine

`@found-calc/engine` owns deterministic formula truth only. Do not move billing, entitlement, auth, persistence, locale parsing, React/Next code, rule publication/version resolution, Worker bindings, Project collaboration, or network I/O into the engine.

### Rules

`@found-calc/rules` owns immutable version/effective-period/publication semantics. D1/repositories store and hydrate records; UI/routes/payment flows do not redefine those semantics.

### Catalog

`@found-calc/catalog` owns calculator identity, canonical slugs, localized discovery/trust copy, category metadata, and relationships. It does not own formulas, auth, persistence, billing truth, or production rule datasets.

### Product runtime

`apps/web` owns localized presentation, accessible interaction, first-party API consumption, auth/admin/workspace UI, local draft preservation, and Project history surfaces. Reference calculations remain local and deterministic.

### Persistence/auth/workspace

D1 stores Better Auth records, validated Phase 04 calculator drafts, Phase 05 versioned rules, and the separate Phase 06 workspace domain. Better Auth owns credentials/session behavior. Project authorization is established server-side from session identity plus D1 ownership/membership; browser state is not authorization truth.

### Workspace privacy

Goals remain owner-private. Shared Project surfaces expose only role-authorized Project/history data. Project exports exclude emails, invite secrets/hashes, and private Goal metadata. Invite codes are random, hashed at rest, expiring, and one-time.

## Phase 06 interaction/contracts to preserve into Phase 07

- public calculators remain usable without authentication unless a specifically approved Phase 07 entitlement gate says otherwise for a clearly identified paid capability; core deterministic truth must remain unchanged;
- unsaved local drafts survive locale navigation/reload without automatic network persistence;
- guest claim remains idempotent and successful authentication is not rolled back by claim failure;
- Phase 04 latest drafts and Phase 06 named Project history remain separate storage/product concepts;
- owner/editor/viewer authorization remains server-derived;
- private Goals do not become shared through Project membership or export;
- Project export does not expose email or invite secrets;
- published rule versions remain immutable and publication periods may not overlap for the same rule;
- synthetic rule-feed failure remains explicit and does not silently fall back to hidden fixture truth;
- no server endpoint calculates calculator answers;
- no raw calculator input logging, browser auth-token storage, fingerprinting, or production secrets are introduced.

## Phase 07 scope guard

The approved next phase is **Billing, Entitlements & Xendit**. Its exact design must still be derived from the canonical Phase Workflow/architecture sources before implementation. This handoff title is not permission to invent pricing, subscription tiers, entitlement semantics, webhook behavior, payment methods, production credentials, or Phase 08+ features outside the approved Phase 07 acceptance criteria.

The Rp0 fixed-infrastructure target remains in force excluding the domain and payment transaction fees. Production secret management and remote infrastructure changes require explicit approved scope and safe configuration; credentials must never enter source, CI logs, portable artifacts, or client storage.

## Known platform notes

- the all-zero D1 UUID remains local/test-only and must not be mistaken for a deployable remote database;
- Cloudflare/Vitest can emit inherited generated-entry static-analysis warnings while runtime tests pass;
- generated Worker types can emit inherited non-blocking lint-disable warnings;
- current GitHub Actions can warn that Node 20-based action internals are forced onto Node 24; the project job uses Node 22;
- no credentials or production secrets belong in the portable artifact.

## Change control

If Phase 07 exposes a conflict with approved Phase 01–06 architecture/contracts:

1. stop the affected work;
2. capture reproducible failing evidence;
3. identify whether the blocker is product scope, framework/runtime behavior, payment-provider behavior, persistence/auth/rule/workspace semantics, or a true architecture conflict;
4. propose the smallest compatible amendment;
5. obtain approval before changing an approved boundary or deterministic-truth contract.
