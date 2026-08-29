# Found Calc — Phase Handoff

**Project:** Found Calc  
**Last canonical completed phase is **Phase 05 — Versioned Rule Platform + Admin Core**  
**Current status:** COMPLETE  
**Next phase:** **Phase 06 — Goals, Projects, Profiles & Workspace**

## Rule: one phase = one new chat

Start Phase 06 in a **new chat inside the same Found Calc project** and attach:

`found-calc-phase-05-versioned-rule-platform-admin-core.zip`

Use the exact post-merge artifact produced from `main`. GitHub `main` is the collaborative canonical repository; the ZIP is the portable recovery/handoff baseline. The Phase 05 post-merge artifact workflow archives the exact merged `GITHUB_SHA`, writes `SHA256SUMS`, verifies required files/extraction, and records commit/tree identity in `ARTIFACT_VERIFICATION.txt`.

## Required reading order for Phase 06

1. `BASELINE.md`
2. `PHASE_HANDOFF.md`
3. `docs/verification/phase-05-verification.md`
4. `docs/superpowers/specs/2026-08-29-found-calc-phase-05-versioned-rule-platform-admin-core-design.md`
5. `docs/superpowers/plans/2026-08-29-found-calc-phase-05-versioned-rule-platform-admin-core.md`
6. approved Master Product & Architecture Design Spec
7. Tech Stack ADR
8. Design System Decision / requirements / component inventory
9. Accessibility & Responsive Contract
10. canonical Phase Workflow and the approved Phase 06 scope/acceptance criteria

## Starter prompt for the new Phase 06 chat

```text
@Superpowers @GitHub @Context7

Start Found Calc Phase 06 — Goals, Projects, Profiles & Workspace from the attached canonical `found-calc-phase-05-versioned-rule-platform-admin-core.zip`.

Before implementation:
1. Read BASELINE.md and PHASE_HANDOFF.md.
2. Read docs/verification/phase-05-verification.md and the approved Phase 05 design/plan.
3. Read the approved Master Product & Architecture Design Spec, Tech Stack ADR, design-system/accessibility contracts, and canonical Phase Workflow.
4. Confirm the exact approved Phase 06 acceptance criteria and exclusions before planning; do not pull Phase 07+ work forward.
5. Treat Phase 01 platform foundation, Phase 02 deterministic engine/rules truth, Phase 03 catalog/product runtime, Phase 04 persistence/auth/guest preservation, and Phase 05 versioned-rule/admin boundaries as approved baseline. Reopen them only for a verified implementation blocker under change control.
6. Preserve the rule boundary: D1/admin/public feeds may store and transport versioned data, but calculator arithmetic remains local/deterministic and @found-calc/rules remains version/effective-date truth.
7. Preserve Phase 04 guest/local/auth state semantics while extending workspace behavior only as Phase 06 explicitly authorizes.
8. Use Context7 for current framework/library documentation and the Cloudflare skill/current Cloudflare docs for Workers-specific work.
9. Use Superpowers brainstorming/writing-plans/TDD/systematic-debugging/verification-before-completion as required.
10. Preserve ID/EN, accessibility, privacy/trust constraints, guest-context preservation, and the Rp0 fixed-infrastructure target excluding domain/payment transaction fees.

Create the Phase 06 design/implementation plan first. At completion, produce the next complete canonical ZIP baseline and updated handoff.
```

## Phase 05 completion evidence

The verified implementation snapshot before continuity closure is:

- source SHA: `eb67641aeb47222f44258251c2caea93b6809b7f`;
- GitHub Actions run: `33232447867`;
- job: `99047494137`;
- result: **SUCCESS**.

The Phase 05 closure tree must receive a separate fresh green `Phase 05 Verification` run before merge. After merge, the Phase 05 canonical artifact workflow records the exact merged SHA/tree dynamically.

Phase 05 establishes:

- D1-backed immutable versioned rule records with draft/published lifecycle metadata;
- effective-period validation and publication overlap protection owned by `@found-calc/rules`;
- synthetic/reference-only seed data, not production regulatory truth;
- Better Auth admin bootstrap and server-side rule-admin authorization;
- a published-only public rule feed plus protected admin list/create/publish APIs;
- localized ID/EN rule-admin UI with explicit synthetic-only trust messaging;
- synthetic reference runtime consumption of the first-party published feed while date resolution and arithmetic remain local;
- Phase 04 local/guest/auth draft preservation and workspace summary as inherited behavior;
- a full Phase 05 gate covering contracts, rules, web unit, Cloudflare D1/auth/rule tests, browser flows, Next/vinext builds, inherited Phase 04→01 regressions, and built Worker rule-route smoke.

See `docs/verification/phase-05-verification.md` for exact counts, RED→GREEN/debug evidence, known warnings, and closure/artifact rules.

## Stable Phase 05 boundaries to preserve

### Engine

`@found-calc/engine` owns deterministic formula truth only. Do not move auth, persistence, locale parsing, React/Next code, rule publication/version resolution, Worker bindings, or network I/O into the engine.

### Rules

`@found-calc/rules` owns immutable version/effective-period/publication semantics. D1/repositories store and hydrate records; UI/routes do not redefine those semantics.

### Catalog

`@found-calc/catalog` owns calculator identity, canonical slugs, localized discovery/trust copy, category metadata, and relationships. It does not own formulas, auth, persistence, billing, or production rule datasets.

### Product runtime

`apps/web` owns localized presentation, accessible interaction, first-party API consumption, auth/admin UI, local draft preservation, and workspace surfaces. Reference calculations remain local and deterministic.

### Persistence/auth/admin

D1 stores Better Auth records, validated calculator drafts, and versioned rule records. Better Auth owns credentials/session behavior. Guest ownership stays opaque and first-party. Server-side authorization—not client state—is authoritative for admin mutation access.

### Public rule API

Only published versions required for the synthetic reference runtime are public. Drafts, audit actor IDs, SQL details, and internal storage exceptions remain non-public.

## Phase 05 interaction/contracts to preserve into Phase 06

- public calculators remain usable without authentication;
- unsaved local drafts survive locale navigation/reload without automatic network persistence;
- guest claim remains idempotent and successful authentication is not rolled back by claim failure;
- Phase 06 workspace expansion must not silently reinterpret Phase 04 calculator-draft records as Projects/history without an explicit migration/domain boundary;
- published rule versions remain immutable and publication periods may not overlap for the same rule;
- synthetic rule-feed failure remains explicit and does not silently fall back to hidden fixture truth;
- admin access is rechecked server-side;
- no server endpoint calculates calculator answers;
- no raw calculator input logging, browser auth-token storage, fingerprinting, or production secrets are introduced.

## Phase 06 scope guard

The approved next phase is **Goals, Projects, Profiles & Workspace**. Its exact design must still be derived from the canonical Phase Workflow/architecture sources before implementation. The Phase 05 baseline does not itself authorize billing, payments, production regulatory catalogs, analytics, AI, launch certification, remote production infrastructure, or any Phase 07+ feature.

## Known platform notes

- the all-zero D1 UUID remains local/test-only and must not be mistaken for a deployable remote database;
- `vinext check` reports 90% compatibility with 0 issues; partial notes are `next/font/google` CDN loading and App Router `reactStrictMode` behavior;
- Cloudflare Vitest may emit the inherited pre-build generated-entry static-analysis warning while runtime tests pass;
- generated Worker types can emit two non-blocking unused eslint-disable warnings;
- one inherited signed-out 390 px workspace browser scenario can transiently fail during vinext network churn and passed on retry in the successful implementation run; the guest claim flow passed normally;
- current GitHub Actions can warn that Node 20-based action internals are forced onto Node 24; the project job uses Node 22;
- no credentials or production secrets belong in the portable artifact.

## Change control

If Phase 06 exposes a conflict with approved Phase 01–05 architecture/contracts:

1. stop the affected work;
2. capture reproducible failing evidence;
3. identify whether the blocker is product scope, framework/runtime behavior, persistence/auth/rule semantics, or a true architecture conflict;
4. propose the smallest compatible amendment;
5. obtain approval before changing an approved boundary or deterministic-truth contract.
