# Found Calc Phase 05 — Versioned Rule Platform + Admin Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a D1-backed immutable rule-version publication platform and protected localized admin core, then make the synthetic reference calculator consume the published first-party rule feed without moving formula truth server-side.

**Architecture:** Keep rule semantics pure in `@found-calc/rules`; store/hydrate rule records in a web/D1 adapter; authorize admin mutations through Better Auth admin identity; expose published rule versions through a read-only API; resolve and calculate in the browser. Seed only the existing synthetic fixtures and reject published interval overlap.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.8, TypeScript strict, pnpm, Better Auth 1.6.29 admin plugin, Drizzle ORM 0.45.2 + Cloudflare D1, Cloudflare Workers/vinext, Vitest/Cloudflare Vitest/Playwright.

**Spec:** `docs/superpowers/specs/2026-08-29-found-calc-phase-05-versioned-rule-platform-admin-core-design.md`

## Global Constraints

- `@found-calc/engine` stays pure/local and server routes never calculate results.
- `@found-calc/rules` owns effective-date/version semantics and has no persistence/auth/network imports.
- Only synthetic/reference rule data is used in Phase 05.
- Published rule rows are immutable; no edit/delete/unpublish path.
- Preserve Phase 04 auth/guest draft behavior, ID/EN, accessibility, privacy/trust, and 390 px no-overflow.
- No remote Cloudflare mutation and no Phase 06+ product scope.

---

### Task 1: Pure publication invariants in `@found-calc/rules`

**Files:**
- Create: `packages/rules/src/publication.ts`
- Create: `packages/rules/src/publication.test.ts`
- Modify: `packages/rules/src/index.ts`

**Interfaces:**
- Produces: `validateRuleEffectivePeriod({ effectiveFrom, effectiveUntil? }) -> {ok:true}|{ok:false;code}`.
- Produces: `findOverlappingRuleVersion(existing, candidate) -> RuleVersion | undefined` using inclusive date intervals and same `ruleId` only.

- [ ] Write failing tests covering malformed/impossible dates, until-before-from, touching non-overlap (`2025-12-31` then `2026-01-01`), inclusive overlap, open-ended overlap, and ignoring other rule IDs.
- [ ] Run `pnpm --filter @found-calc/rules test -- publication.test.ts` and confirm failures are feature-missing.
- [ ] Implement `publication.ts` with strict ISO date-only validation equivalent to the resolver contract and interval-overlap comparison; do not import web/runtime APIs.
- [ ] Export the helpers from `index.ts`.
- [ ] Re-run rules tests and typecheck; refactor duplicate date validation inside `resolve-rule.ts` only if tests remain green and public behavior is unchanged.
- [ ] Commit `feat(rules): add publication invariants`.

### Task 2: D1 rule schema, seed fixtures, payload parser, and repository

**Files:**
- Create: `apps/web/migrations/0002_phase05_rule_platform_admin.sql`
- Modify: `apps/web/src/lib/persistence/schema.ts`
- Create: `apps/web/src/lib/rules/payload.ts`
- Create: `apps/web/src/lib/rules/repository.ts`
- Create: `apps/web/src/lib/rules/repository.test.ts`
- Modify: `apps/web/tests/cloudflare/test-database.ts`
- Create: `apps/web/tests/cloudflare/phase-05-rule-repository.test.ts`

**Interfaces:**
- Produces `ruleVersions` Drizzle table.
- Produces `parseSupportedRuleDraft(unknown)` for `reference.synthetic-rate`.
- Produces repository methods `listAdminVersions(ruleId)`, `listPublishedVersions(ruleId)`, `createDraft(input)`, `publish(id, actorId)`.

- [ ] Write RED foundation/unit contracts requiring migration/table/payload parser and rejecting invalid/extra payload keys.
- [ ] Run the focused tests and observe the expected missing-feature failures.
- [ ] Add migration columns required by Better Auth admin plugin, create `rule_version`, indexes/unique identity, and seed `2025-a`/`2026-a` as published synthetic rows.
- [ ] Add matching Drizzle schema fields/table.
- [ ] Implement strict supported-rule payload/provenance parsing with 16 KiB-compatible canonical JSON data.
- [ ] Write RED Cloudflare repository tests for seed hydration, draft visibility only in admin listing, public published-only listing, duplicate identity conflict, overlap rejection on publish, and immutable publish metadata.
- [ ] Implement minimal repository behavior; publication must conditionally update only a draft and use current published siblings for overlap validation.
- [ ] Run focused Cloudflare tests green and commit `feat(rules): persist versioned rule records`.

### Task 3: Better Auth admin bootstrap and protected rule HTTP APIs

**Files:**
- Modify: `apps/web/src/lib/auth/server.ts`
- Modify: `apps/web/src/lib/cloudflare-workers-build-stub.ts`
- Modify: `apps/web/.dev.vars.example`
- Create: `apps/web/src/lib/rules/http.ts`
- Create: `apps/web/src/app/api/rules/[ruleId]/versions/route.ts`
- Create: `apps/web/src/app/api/admin/rule-versions/route.ts`
- Create: `apps/web/src/app/api/admin/rule-versions/[id]/publish/route.ts`
- Create: `apps/web/tests/cloudflare/phase-05-rule-api.test.ts`

**Interfaces:**
- `getFoundCalcAuth()` includes Better Auth `admin()` plugin with parsed `BETTER_AUTH_ADMIN_USER_IDS`.
- Public GET returns `{ ruleId, versions: RuleVersion[] }` with published rows only.
- Admin GET/POST/publish endpoints return stable status/error shapes.

- [ ] Write RED auth/API tests proving signed-out mutation=401, ordinary user=403, configured admin success, invalid body=400, duplicate version=409, overlap publish=409, and public feed hides drafts.
- [ ] Run focused Cloudflare tests and verify failures are due to absent routes/admin authorization.
- [ ] Enable Better Auth admin plugin and environment parsing without storing tokens in browser storage.
- [ ] Implement stable HTTP handler helpers with request-size guard and no internal error leakage.
- [ ] Add thin route adapters.
- [ ] Run focused tests green plus Phase 04 auth regressions and commit `feat(admin): protect rule publication APIs`.

### Task 4: Public rule-feed client and local calculator integration

**Files:**
- Create: `apps/web/src/lib/rules/client.ts`
- Create: `apps/web/src/lib/rules/client.test.ts`
- Modify: `apps/web/src/lib/calculators/runtime.ts`
- Modify: `apps/web/src/lib/calculators/runtime.test.ts`
- Modify: `apps/web/src/components/calculator/synthetic-rule-calculator.tsx`
- Modify/create relevant component/browser tests.

**Interfaces:**
- `fetchPublishedRuleVersions(ruleId, signal?) -> Promise<RuleVersion[]>` validates response shape.
- `runSyntheticRule(input, versions)` requires explicit versions and remains synchronous/pure at calculation time.

- [ ] Write RED unit tests for feed hydration rejecting drafts/malformed payloads and runtime requiring caller-supplied versions.
- [ ] Run focused unit tests and observe expected failures.
- [ ] Implement strict feed parser/fetch helper.
- [ ] Refactor runtime to accept explicit versions; tests pass fixtures explicitly.
- [ ] Write RED browser/component behavior requiring the synthetic page to wait for rule data, calculate through fetched published data, and show localized unavailable status on feed failure without bundled fallback.
- [ ] Implement client loading/state in the synthetic calculator while preserving local draft persistence and provenance rendering.
- [ ] Run unit/browser tests green and commit `feat(web): consume published rule feed locally`.

### Task 5: Localized accessible Admin Core UI

**Files:**
- Modify: `apps/web/src/app/[locale]/(admin)/admin/page.tsx`
- Create: `apps/web/src/components/admin/rule-admin-panel.tsx`
- Modify: `apps/web/src/i18n/messages.ts`
- Create: `apps/web/tests/e2e/phase-05-admin.spec.ts`

**Interfaces:**
- Admin panel lists reference rule versions, creates a draft, publishes a draft, and renders stable API errors/status.

- [ ] Write RED Playwright/source contracts for ID/EN headings, labels, keyboard-usable create/publish actions, synthetic-data warning, and 390 px no-horizontal-overflow.
- [ ] Add an end-to-end scenario: create/sign in configured admin -> create future non-overlapping draft -> publish -> public synthetic calculator calculates with that version and displays provenance.
- [ ] Run targeted Playwright and confirm failures are missing Phase 05 UI behavior.
- [ ] Implement `RuleAdminPanel` with accessible form/list/status and localized copy; keep API authorization authoritative.
- [ ] Run targeted tests green and commit `feat(admin): add localized rule management core`.

### Task 6: Phase 05 verification gate and source contracts

**Files:**
- Create: `tests/foundation/phase-05-rule-platform-contract.test.mjs`
- Create: `tests/foundation/phase-05-verification-contract.test.mjs`
- Create: `scripts/verify-phase-05.mjs`
- Modify: `package.json`
- Create: `.github/workflows/phase-05-verification.yml`

**Interfaces:**
- Root `pnpm verify:phase05` is a fail-fast superset of Phase 05-specific tests/builds plus `verify:phase04`.

- [ ] Write RED dependency-free contracts for schema/migration/routes/admin guard/runtime non-static-source, workflow/script wiring, and explicit Phase 06+ exclusions.
- [ ] Run `pnpm test:foundation` and observe Phase 05 contract failures.
- [ ] Implement `verify-phase-05.mjs`: foundation -> rules tests -> web unit -> Cloudflare -> lint -> typecheck -> Playwright -> Next build -> vinext check/build -> clean `.next` -> `verify:phase04`.
- [ ] Add root script and CI workflow that applies migrations `0001` then `0002`, sets non-production auth secret/base URL/admin bootstrap ID for tests, runs `verify:phase05`, and smoke-tests public/admin rule routes.
- [ ] Run dependency-free contracts green and commit `ci: enforce Phase 05 verification`.

### Task 7: Full verification, continuity closure, GitHub PR/merge, canonical ZIP

**Files:**
- Create: `docs/verification/phase-05-verification.md`
- Modify: `BASELINE.md`
- Modify: `PHASE_HANDOFF.md`
- Modify: `PHASE_CHAT_TEMPLATE.md`
- Create: `.github/workflows/phase-05-baseline-artifact.yml`

**Interfaces:**
- Handoff successor is exactly `Phase 06 — Goals, Projects, Profiles & Workspace`.
- Artifact name: `found-calc-phase-05-versioned-rule-platform-admin-core.zip`.

- [ ] Apply local migrations 0001 + 0002 and run a fresh full `pnpm verify:phase05`; record exact counts/warnings, not assumptions.
- [ ] Review source for server formula duplication, raw calculator-input logging, auth-token browser storage, secret leakage, draft exposure, published mutation paths, and Phase 06+ scope creep.
- [ ] Write verification record from observed evidence and update baseline/handoff/chat template for exact Phase 06 successor.
- [ ] Add post-merge artifact workflow using `git archive` of exact merged closure SHA, SHA256, extraction validation, required Phase 05 files, and generated/dependency directory exclusion.
- [ ] Re-run `pnpm verify:phase05` after continuity changes.
- [ ] Push the feature branch to GitHub, open PR to `main`, inspect diff/review threads, and require fresh green Phase 05 CI on final head.
- [ ] Merge only after all completion criteria are evidenced.
- [ ] Verify merged `main` SHA/status. Produce/download the canonical Phase 05 ZIP from the exact merged tree; verify SHA256 and extraction before presenting it as the Phase 06 baseline.
