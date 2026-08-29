# Found Calc Phase 06 — Goals, Projects, Profiles & Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an authenticated first-party workspace with profiles, private goals, owned/shared projects, secure project invitations, named calculation snapshots, explicit calculator restoration, and privacy-safe JSON export without moving calculation truth server-side.

**Architecture:** Add a normalized D1 workspace domain beside the existing Phase 04 `calculator_state` latest-draft table. Thin Next.js route adapters call a centralized authenticated HTTP layer, which delegates to a Drizzle D1 repository and pure workspace parsers; calculators keep executing locally and explicitly save only validated canonical input snapshots.

**Tech Stack:** TypeScript 5.9 strict mode, Next.js 16.2.9 App Router, React 19.2.8, Better Auth 1.6.29, Drizzle ORM 0.45.2 + Cloudflare D1, Tailwind CSS 4.3.3, existing shadcn primitives, Vitest 4.1.x, Cloudflare Vitest plugin, Playwright 1.62.1, pnpm 11.24.0, Node.js 22, vinext 1.0.0-beta.8, Wrangler 4.127.0.

**Spec:** `docs/superpowers/specs/2026-08-29-found-calc-phase-06-goals-projects-profiles-workspace-design.md`

## Global Constraints

- Preserve Phase 01–05 architecture; no engine/rule/catalog boundary changes without a verified blocker under change control.
- Keep `calculator_state` as the Phase 04 latest-draft boundary; do not migrate/reinterpret it as projects or history.
- No server-side calculator execution, result recomputation, or formula validation.
- All workspace mutation/read authorization is rechecked server-side from Better Auth session + D1 ownership/membership.
- Invite codes are random, seven-day, single-use, stored only as SHA-256 hashes.
- Named calculations persist validated canonical input snapshots only; restoration is explicit and never silently overwrites local form state.
- Preserve launch locales `id` and `en`, keyboard accessibility, 390 px no-horizontal-overflow, privacy/trust copy, and reduced-motion behavior.
- Fixed infrastructure target remains Rp0 excluding domain/payment transaction fees.
- Exclude Phase 07+ billing/Xendit, production analytics, AI, TestSprite launch certification, remote deploy/DNS/secrets, public anonymous project links, email delivery, and real-time collaboration.

---

### Task 1: Workspace contracts and Phase 06 RED boundary tests

**Files:**
- Create: `apps/web/src/lib/workspace/contracts.ts`
- Create: `apps/web/src/lib/workspace/contracts.test.ts`
- Create: `tests/foundation/phase-06-workspace-contract.test.mjs`

**Interfaces:**
- Produces `WorkspaceLocale`, `GoalStatus`, `ProjectStatus`, `ProjectMemberRole`.
- Produces `parseProfileInput`, `parseGoalInput`, `parseGoalPatch`, `parseProjectInput`, `parseProjectPatch`, `parseInviteInput`, `parseNamedCalculationInput`.
- Named calculation parser consumes existing `parsePersistedCalculatorState` rather than duplicating calculator validation.

- [ ] Write foundation RED tests requiring a new migration/table names, workspace route tree, explicit separation from `calculator_state`, no engine calculation imports in workspace HTTP/repository, and Phase 07+ exclusions.
- [ ] Write unit RED tests for trimmed bounds, unknown-key rejection, strict ISO target dates, status/role enums, malformed calculation state, synthetic rule-context shape, and payload size limits.
- [ ] Run dependency-free Phase 06 foundation test directly and confirm missing-feature failure.
- [ ] Implement `contracts.ts` with exact parsers and stable `{ok:false, code:"invalid-workspace-input"|"payload-too-large"}` failures.
- [ ] Run focused contract tests where dependencies are available; locally at minimum re-run dependency-free foundation contracts.
- [ ] Commit `feat(workspace): define phase 06 contracts`.

### Task 2: D1 schema, invitation trigger, and workspace repository

**Files:**
- Create: `apps/web/migrations/0003_phase06_workspace.sql`
- Modify: `apps/web/src/lib/persistence/schema.ts`
- Create: `apps/web/src/lib/workspace/repository.ts`
- Modify: `apps/web/tests/cloudflare/test-database.ts`
- Create: `apps/web/tests/cloudflare/phase-06-workspace-repository.test.ts`

**Interfaces:**
- Produces Drizzle tables `userProfiles`, `workspaceGoals`, `workspaceProjects`, `workspaceProjectMembers`, `workspaceProjectInvites`, `workspaceCalculations`.
- Produces `createWorkspaceRepository(binding)` with profile/goal/project/access/invite/member/calculation/export methods.
- Produces `WorkspaceAccess = "owner" | "editor" | "viewer"`.

- [ ] Write Cloudflare RED repository tests for profile upsert isolation, private goals, owned/shared project listing, owner/editor/viewer access, cross-project denial, invite token hash storage, one-time invite redemption, member revoke, immutable snapshot create/get/delete authorization, cascade behavior, and export privacy.
- [ ] Add migration `0003` with foreign keys/indexes/checks and a trigger that inserts project membership only when an unused invite is atomically redeemed.
- [ ] Add matching Drizzle schema definitions without changing existing auth/calculator/rule tables.
- [ ] Update test DB reset/apply chain to include `0003` and new trigger/table drop order.
- [ ] Implement repository methods with all ownership/membership predicates in D1 queries and no client-authority input.
- [ ] Use conditional `UPDATE ... RETURNING` for invite redemption; hash raw invite codes with Web Crypto before lookup; never persist raw codes.
- [ ] Run focused Cloudflare repository tests green in GitHub CI and commit `feat(workspace): persist collaborative workspace domain`.

### Task 3: Authenticated workspace HTTP APIs

**Files:**
- Create: `apps/web/src/lib/workspace/http.ts`
- Create route adapters under `apps/web/src/app/api/workspace/**/route.ts` for profile, goals, projects, members, invites, calculations, and export.
- Create: `apps/web/tests/cloudflare/phase-06-workspace-api.test.ts`

**Interfaces:**
- Every handler consumes `{ DB, auth }` and derives the user from `auth.api.getSession({headers})`.
- Responses are `Cache-Control: no-store` with stable error codes.
- Export response uses `application/json; charset=utf-8` plus safe attachment filename.

- [ ] Write RED API tests for signed-out 401, malformed 400/413, owner success, outsider 403/404-safe behavior, editor/viewer permission differences, invite invalid/expired/used paths, snapshot deletion rules, and export omission of email/auth/invite/private-goal fields.
- [ ] Implement shared bounded-body/auth/error helpers in `http.ts`; do not expose SQL exceptions.
- [ ] Implement thin App Router route adapters with Next.js 16 async `params` handling.
- [ ] Keep project access server-authoritative; browser-provided role fields never grant permissions.
- [ ] Run focused Cloudflare API tests green in CI plus Phase 04/05 auth/rule regressions.
- [ ] Commit `feat(workspace): add protected workspace APIs`.

### Task 4: Calculator named-history integration

**Files:**
- Create: `apps/web/src/lib/workspace/client.ts`
- Create: `apps/web/src/lib/workspace/client.test.ts`
- Create: `apps/web/src/components/calculator/workspace-calculation-controls.tsx`
- Modify: `apps/web/src/app/[locale]/(public)/calculators/[slug]/page.tsx`
- Modify: all three calculator components.
- Extend relevant foundation/e2e contracts.

**Interfaces:**
- `WorkspaceCalculationControls` receives `locale`, `calculatorId`, `state`, `onLoad`, optional `recordId`, and optional synthetic `ruleContext`.
- Client helpers strictly parse project summaries and calculation records before mutating form state.

- [ ] Write RED unit/source tests proving save targets exclude viewer-only projects, restore payloads are validated, and `?record=` does not auto-call `onLoad`.
- [ ] Update calculator page to read async `searchParams` and pass one normalized record ID into the active calculator.
- [ ] Implement client controls: signed-out affordance, project/title selector, explicit save after successful calculation, record preview fetch, explicit load action, localized loading/error/success states.
- [ ] Pass canonical persistable state from each calculator; for synthetic rule pass selected rule/version provenance only after successful local resolution.
- [ ] Confirm Phase 04 draft Save/Load/Delete remains present and independent.
- [ ] Run unit/e2e focused tests green in CI and commit `feat(calculators): save named calculations to projects`.

### Task 5: Localized workspace dashboard and project detail UI

**Files:**
- Create focused workspace components under `apps/web/src/components/workspace/` for dashboard, profile, goals, projects, invite redeem, project detail, members, history, export.
- Replace/retain `persistence-summary.tsx` only as a small draft-status sub-surface.
- Modify: `apps/web/src/app/[locale]/(workspace)/workspace/page.tsx`
- Create: `apps/web/src/app/[locale]/(workspace)/workspace/projects/[projectId]/page.tsx`
- Modify: `apps/web/src/i18n/messages.ts` only for shared navigation copy where appropriate; component-local copy may remain colocated.
- Create: `apps/web/tests/e2e/phase-06-workspace.spec.ts`

**Interfaces:**
- Dashboard uses authenticated client session only for presentation; APIs remain authorization truth.
- Project detail is access-aware and hides owner-only controls for editors/viewers.

- [ ] Write RED Playwright/source contracts for ID/EN profile/goal/project creation, signed-out account-free calculator message, owned/shared sections, invite redemption, editor/viewer differences, named-history open action, collaboration privacy warning, JSON export, keyboard operation, loading/empty/error states, and 390 px no-overflow.
- [ ] Implement a product-density layout using existing Space Grotesk/shadcn tokens, section dividers and whitespace instead of generic repeated dashboard cards.
- [ ] Preserve explicit draft-status visibility as a separate "Latest drafts" section so Projects/history never replace Phase 04 state semantics.
- [ ] Implement project-detail member/invite/history/export surfaces with destructive actions clearly scoped and accessible.
- [ ] Run targeted Playwright in CI and commit `feat(workspace): ship goals projects and collaboration UI`.

### Task 6: Phase 06 verification gate and Worker smoke

**Files:**
- Create: `tests/foundation/phase-06-verification-contract.test.mjs`
- Create: `scripts/verify-phase-06.mjs`
- Modify: `package.json`
- Create: `.github/workflows/phase-06-verification.yml`

**Interfaces:**
- Root `pnpm verify:phase06` is a fail-fast superset of all Phase 06-specific checks plus `pnpm verify:phase05`.

- [ ] Write RED foundation contract for script/workflow/migration ordering, Phase 06 browser/API coverage, built-Worker workspace smoke, and inherited Phase 05 call.
- [ ] Implement verifier order: foundation -> workspace unit -> existing rules/web unit -> Cloudflare -> lint -> typecheck -> Playwright -> Next build -> vinext check/build -> clean `.next` -> `verify:phase05`.
- [ ] Configure CI with Node 22/pnpm 11.24.0, apply migrations `0001` + `0002` + `0003`, set only non-production Better Auth test values, then run `verify:phase06`.
- [ ] Add built Worker smoke using one fresh isolated `--persist-to` state: apply all migrations, start Worker, verify signed-out workspace API=401, create test auth/session path as existing helpers permit, and exercise a minimal workspace route without server calculation.
- [ ] Run dependency-free verification contracts green locally and full workflow green remotely.
- [ ] Commit `ci: enforce Phase 06 verification`.

### Task 7: Full review, continuity closure, PR/merge, and canonical artifact

**Files:**
- Create: `docs/verification/phase-06-verification.md`
- Modify: `BASELINE.md`
- Modify: `PHASE_HANDOFF.md`
- Modify: `PHASE_CHAT_TEMPLATE.md`
- Create: `.github/workflows/phase-06-baseline-artifact.yml`

**Interfaces:**
- Next successor is exactly `Phase 07 — Billing, Entitlements & Xendit`.
- Canonical artifact is `found-calc-phase-06-goals-projects-profiles-workspace.zip`.

- [ ] Run/inspect fresh Phase 06 GitHub CI and record exact test/build/migration evidence, warnings, run/job IDs, and final head SHA.
- [ ] Review diff for server formula duplication, raw calculator-input logging, browser token storage, cross-project leakage, invite-token leakage/reuse, private-goal export, Phase 04 draft reinterpretation, secret leakage, and Phase 07+ scope creep.
- [ ] Use Superpowers verification-before-completion and request/review code-review gates; resolve every material issue and rerun impacted tests.
- [ ] Write verification record and update baseline/handoff/chat template to Phase 07 without changing closed Phase 05 artifact identity.
- [ ] Add successor-safe post-merge artifact workflow using `git archive` of exact merged SHA, SHA256, extraction verification, required Phase 06 files, and generated/dependency directory exclusion.
- [ ] Push final feature branch, open PR, inspect diff/review threads/checks, and merge only after final-head Phase 06 verification is green.
- [ ] Verify merged `main` SHA/status; download the canonical artifact workflow output, validate `ARTIFACT_VERIFICATION.txt`, SHA256 and extracted required files, then provide the Phase 07 baseline ZIP.
