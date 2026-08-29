# Found Calc Phase 06 — Goals, Projects, Profiles & Workspace

**Project:** Found Calc  
**Phase state:** COMPLETE  
**Last canonical completed phase:** Phase 06 — Goals, Projects, Profiles & Workspace  
**Next phase:** Phase 07 — Billing, Entitlements & Xendit  
**Completion date:** 2026-08-29

## Canonical artifact

`found-calc-phase-06-goals-projects-profiles-workspace.zip`

GitHub `main` is the collaborative canonical repository. After merge, `.github/workflows/phase-06-baseline-artifact.yml` archives the exact merged `GITHUB_SHA` with `git archive`, writes `SHA256SUMS`, verifies extraction/required files, and records commit/tree identity in `ARTIFACT_VERIFICATION.txt`. The resulting ZIP is the portable recovery/handoff source for Phase 07.

Historical predecessor provenance is retained for regression continuity: Phase 06 started from the canonical Phase 05 artifact `found-calc-phase-05-versioned-rule-platform-admin-core.zip`.

## Canonical implementation evidence

Verified implementation snapshot before continuity closure:

- source SHA: `bb1eb7fc98de5673c271c22e6aa12563e78fc92d`;
- GitHub Actions run: `33242970535`;
- job: `99075355501`;
- result: **SUCCESS**.

That run passed `pnpm verify:phase06`, the complete Phase 04→06 local D1 migration chain, Phase 06 workspace tests/browser coverage, lint/type checks, Next/vinext checks/builds, all inherited Phase 05→01 regressions, and authenticated built-Worker smoke. The closure head receives a separate fresh Phase 06 verification before merge; the artifact workflow records the exact merged identity dynamically.

## Completed deliverables

- D1-backed user profiles and private owner-only Goals.
- Projects with server-derived owner/editor/viewer authorization from Better Auth session identity plus D1 ownership/membership.
- Random, hashed, expiring, one-time Project invites with atomic redemption.
- Named Project calculation history storing validated canonical calculator state without server-side formula execution.
- Creator attribution and role-aware history mutation behavior.
- Privacy-safe Project JSON export.
- Localized ID/EN workspace dashboard and Project detail UI.
- Explicit Project save/reopen controls while preserving the separate Phase 04 latest-draft flow.
- Separate `0003_phase06_workspace.sql` workspace domain; Phase 04 `calculator_state` is not reinterpreted.
- `verify:phase06` as a fail-fast Phase 05→01 regression superset plus Phase 06 workspace/storage/API/browser/build checks.
- Authenticated built-Worker smoke against one isolated D1 persistence state.

Detailed evidence and RED→GREEN history: `docs/verification/phase-06-verification.md`.

## Stable architecture boundaries

### Deterministic truth

`@found-calc/engine` remains the only owner of calculator arithmetic. Workspace storage, routes, exports, auth, UI, billing, and network code may store/transport validated state but must not duplicate formulas.

### Rule truth

`@found-calc/rules` continues to own immutable version/effective-date/publication semantics. Persistence and UI do not redefine them.

### Catalog and runtime

`@found-calc/catalog` owns calculator identity/discovery metadata. `apps/web` owns localized presentation, accessible interaction, first-party APIs, auth/admin/workspace UI, local draft preservation, and Project-history controls.

### Persistence/auth/workspace

D1 stores Better Auth records, Phase 04 validated drafts, Phase 05 versioned rules, and the separate Phase 06 workspace domain. Better Auth owns credentials/session behavior. Project authorization is always re-derived server-side.

### Workspace privacy

Goals remain owner-private. Shared Project surfaces expose only role-authorized Project/history data. Export excludes emails, invite secrets/hashes, and private Goal metadata. Invite plaintext is never persisted.

## Preserved interaction/security contracts

- Public calculators remain usable without authentication.
- Reference calculations remain local and deterministic.
- Phase 04 local/guest/auth latest-draft semantics remain intact and separate from Phase 06 named Project history.
- Published rule versions remain immutable; synthetic rule-feed failure remains explicit.
- Admin and Project authorization are rechecked server-side.
- Viewer/editor/owner boundaries are enforced server-side.
- Project selector accessible names remain unique; wrapper regions do not reuse the select label through `aria-labelledby`.
- No raw calculator input logging, fingerprinting, browser auth-token storage, production secrets, or production database identity was added.
- No Xendit/payment/subscription/entitlement code exists in the Phase 06 baseline.

## Known non-blocking platform notes

- The inherited all-zero D1 UUID is local/test-only.
- Cloudflare/Vitest and generated Worker types can emit inherited non-blocking generated-code warnings.
- vinext inherits earlier compatibility notes around `next/font/google` CDN loading and App Router `reactStrictMode` behavior.
- GitHub-hosted actions can warn about Node 20 action internals moving to Node 24 while the project job explicitly uses Node 22.

## Explicitly deferred beyond Phase 06

- Xendit/payment/subscription/entitlement/invoice/webhook flows.
- Production regulatory/tax/legal rule packs.
- Production analytics/telemetry or SEO launch hardening.
- AI product features.
- TestSprite launch certification.
- Remote D1 creation/migration, production Cloudflare deployment, DNS, or production secret mutation.

## Continuity rule

Start **Phase 07 — Billing, Entitlements & Xendit** in a **new chat inside the same Found Calc project** using the exact post-merge `found-calc-phase-06-goals-projects-profiles-workspace.zip`. Read `PHASE_HANDOFF.md`, this baseline, the Phase 06 verification record/spec/plan, and the canonical Phase Workflow before planning. Treat Phase 01–06 architecture/regression boundaries as approved baseline unless a verified implementation blocker requires change control.
