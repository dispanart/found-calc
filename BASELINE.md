# Found Calc Phase 06 — Goals, Projects, Profiles & Workspace

**Project:** Found Calc  
**Phase state:** COMPLETE  
**Last canonical completed phase:** Phase 06 — Goals, Projects, Profiles & Workspace  
**Next phase:** Phase 07 — Billing, Entitlements & Xendit  
**Completion date:** 2026-08-29

## Canonical artifact

`found-calc-phase-06-goals-projects-profiles-workspace.zip`

GitHub `main` remains the collaborative canonical repository. After the Phase 06 pull request is merged, `.github/workflows/phase-06-baseline-artifact.yml` packages the exact merged `GITHUB_SHA` with `git archive`, writes `SHA256SUMS`, verifies extraction and required Phase 06 files, and records the source commit/tree in `ARTIFACT_VERIFICATION.txt`. That exact post-merge ZIP is the portable recovery/handoff source for Phase 07.

## Canonical implementation evidence

The verified Phase 06 implementation snapshot before continuity closure is:

- source SHA: `bb1eb7fc98de5673c271c22e6aa12563e78fc92d`;
- GitHub Actions run: `33242970535`;
- job: `99075355501`;
- result: **SUCCESS**.

That run passed `pnpm verify:phase06`, all inherited Phase 05/04/03/02/01 regressions, the full three-migration local D1 chain, browser coverage, source lint/type checks, Next/vinext compatibility/builds, and authenticated built-Worker workspace smoke. The closure tree receives a separate fresh full Phase 06 verification before merge; the canonical artifact workflow then records the exact merged source identity dynamically.

## Completed deliverables

Phase 06 extends Found Calc with a narrow durable workspace domain while preserving the approved calculation, rule, persistence, auth, accessibility, privacy, and zero-fixed-infrastructure boundaries:

- D1-backed user profiles with localized preference;
- private owner-only Goals;
- Projects with owner/editor/viewer collaboration roles;
- server-derived authorization from Better Auth session identity plus D1 ownership/membership;
- random, hashed, expiring, one-time Project invite codes with atomic redemption;
- named Project calculation history storing validated canonical calculator state, not server-computed answers;
- creator attribution and role-aware calculation mutation behavior;
- privacy-safe Project JSON export;
- localized ID/EN workspace dashboard and Project detail UI;
- explicit calculator controls to save/reopen named Project calculations while preserving the separate Phase 04 latest-draft flow;
- migration `0003_phase06_workspace.sql` as a separate workspace domain rather than a reinterpretation of Phase 04 `calculator_state`;
- `verify:phase06` as a fail-fast regression superset of Phase 05 → Phase 01 plus Phase 06 workspace/storage/API/browser/build verification;
- authenticated built-Worker smoke using one fresh dedicated D1 `--persist-to` state for all three migrations and `wrangler dev`.

## Verification status

Detailed evidence, RED→GREEN history, review results, and artifact rules are recorded in `docs/verification/phase-06-verification.md`.

The successful implementation run verified the Phase 06 contract, D1/repository/API, workspace browser flows, accessibility regression, Next/vinext runtime boundaries, inherited regressions, and the built Worker. A stale Worker-smoke expectation for the new `{ projects: { owned, shared } }` collection shape was regression-locked first and then corrected without changing the production API.

## Stable architecture boundaries

### Engine truth

`@found-calc/engine` remains the only owner of deterministic formula truth. Workspace storage, routes, auth, UI, locale handling, Project collaboration, and exports must not duplicate calculator arithmetic.

### Rule truth

`@found-calc/rules` continues to own immutable version/effective-date/publication semantics. D1 repositories store/hydrate rule data but do not redefine rule truth or calculator formulas.

### Catalog ownership

`@found-calc/catalog` continues to own stable calculator identity, canonical slugs, localized discovery/trust copy, category metadata, and relationships. It does not own formulas, auth, workspace persistence, billing, or production rule datasets.

### Product runtime

`apps/web` owns localized presentation, accessible interaction, first-party API consumption, auth/admin/workspace UI, local draft preservation, and explicit Project history controls. Reference calculations remain local and deterministic.

### Persistence/auth/workspace boundary

D1 stores Better Auth records, Phase 04 canonical calculator drafts, Phase 05 versioned rules, and the separate Phase 06 workspace domain. Better Auth owns credentials/session behavior. Project authorization is established server-side from authenticated identity plus D1 ownership/membership; browser role state is never authoritative.

### Workspace privacy boundary

Goals remain private to their owner. Project collaboration exposes only the shared Project/history data allowed by the member role. Project export excludes account email, invite secrets/hashes, and private Goal metadata. Invite plaintext is returned only when generated/redeemed by the intended flow and is not persisted as plaintext.

## Interaction contracts preserved

- public calculators remain usable without authentication;
- reference calculator arithmetic remains local/deterministic;
- unsaved Phase 04 local drafts survive locale navigation/reload without automatic network persistence;
- guest claim remains idempotent and successful authentication is not rolled back by claim failure;
- Phase 06 named Project history is explicit and separate from the Phase 04 latest-draft model;
- published rule versions remain immutable and publication-period semantics stay in `@found-calc/rules`;
- synthetic rule-feed failure remains explicit rather than silently falling back to hidden fixture truth;
- admin and Project authorization are rechecked server-side;
- no server endpoint calculates calculator answers;
- no raw calculator input logging, browser auth-token storage, fingerprinting, or production secret was introduced.

## Accessibility, trust, privacy, and security contract

- launch locales remain Indonesian (`id`) and English (`en`);
- inherited accessibility/responsive contracts remain regression-covered;
- Phase 06 workspace and Project flows are keyboard-operable and browser-tested;
- Project selector accessible names remain unique: wrapper regions do not reuse the select label through `aria-labelledby`;
- synthetic-only rule data remains explicitly labeled;
- viewer/editor/owner boundaries are enforced server-side;
- one-time invite codes are random, hashed before persistence, expire, and are atomically claimed;
- Project export does not leak private Goal metadata, email addresses, or invite secrets;
- malformed/auth/storage errors remain stable and do not expose SQL/internal exception detail;
- no Xendit/payment/subscription/entitlement code exists in the Phase 06 baseline.

## Known platform notes

- `apps/web/wrangler.jsonc` still uses the inherited all-zero local-only D1 UUID; it is not a remote production database identity.
- Cloudflare/Vitest can emit inherited generated-entry static-analysis warnings while runtime tests pass.
- vinext inherits earlier compatibility notes around `next/font/google` CDN loading and App Router `reactStrictMode` behavior.
- generated Worker types can emit inherited non-blocking eslint-disable warnings.
- current GitHub Actions can warn about Node 20-based action internals being forced onto Node 24 while the project job explicitly uses Node 22.

## Explicitly deferred beyond Phase 06

Phase 06 does not authorize or implement:

- Xendit/payment/subscription/entitlement/invoice/webhook flows;
- production regulatory/tax/legal rule packs;
- production analytics/telemetry or SEO hardening;
- AI explanations or AI product features;
- TestSprite launch certification;
- remote D1 creation/migration, production Cloudflare deploy, DNS, or production secret mutation.

## Continuity rule

Start **Phase 07 — Billing, Entitlements & Xendit** in a **new chat inside the same Found Calc project** and attach the exact post-merge `found-calc-phase-06-goals-projects-profiles-workspace.zip`. Read `PHASE_HANDOFF.md`, this baseline, the Phase 06 verification record/spec/plan, and the canonical Phase Workflow before creating the Phase 07 design/implementation plan. Treat Phase 01–06 architecture and regression boundaries as approved baseline and reopen them only for a verified implementation blocker under change control.
