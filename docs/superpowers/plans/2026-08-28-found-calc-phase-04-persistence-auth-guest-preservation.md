# Found Calc Phase 04 — Persistence, Auth & Guest Preservation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-party D1 draft persistence, Better Auth email/password sessions, local unsaved-draft preservation, and deterministic guest-to-account draft claiming without moving calculation truth server-side.

**Architecture:** The existing `apps/web` runtime remains the only interactive product surface. D1 stores Better Auth records plus one canonical input draft per calculator/owner; Drizzle owns typed product persistence, while Better Auth owns authentication. Browser `localStorage` preserves unsaved UI strings across locale navigation and explicit save/load/delete actions synchronize only validated canonical inputs.

**Tech Stack:** Next.js 16.2.9 App Router, React 19.2.8, vinext 1.0.0-beta.8, Cloudflare Workers + D1, Wrangler 4.127.0, Better Auth 1.6.29, Drizzle ORM 0.45.2, Vitest 4.x, Cloudflare Vitest, Playwright 1.62.1, pnpm 11.24.0.

**Spec:** `docs/superpowers/specs/2026-08-28-found-calc-phase-04-persistence-auth-guest-preservation-design.md`

## Global Constraints

- Preserve all Phase 01–03 engine/rules/catalog/runtime boundaries.
- Server code may validate canonical input syntax but may not calculate calculator answers.
- Persist only supported canonical input state; maximum API payload 16 KiB.
- Guest ownership uses an opaque HttpOnly SameSite=Lax cookie and no fingerprinting.
- Auth scope is Better Auth email/password sign-up/sign-in/sign-out/session only.
- No remote Cloudflare resource/secret mutation and no Phase 05+ features.
- ID/EN, accessibility, trust/provenance, keyboard, responsive, Next build and vinext/Worker verification remain required.

---

### Task 1: Lock Phase 04 scope, branch, dependencies, and verification skeleton

**Files:** Phase 04 spec/plan, verification contract/script/workflow, root/web package metadata, pnpm lockfile.

- [ ] Write a dependency-free failing contract requiring the Phase 04 spec/plan, migration, auth/state routes, browser draft helper, D1 repository tests, auth/guest Playwright spec, and `verify:phase04` script.
- [ ] Run the contract and record RED because Phase 04 files are absent.
- [ ] Add root/web scripts and `better-auth@1.6.29` plus `drizzle-orm@0.45.2`. Refresh `pnpm-lock.yaml` with pnpm only.
- [ ] Add Phase 04 CI with frozen install, gate, Next/vinext builds and Worker smoke.
- [ ] Commit `docs/ci: start Phase 04 persistence and auth`.

### Task 2: Add D1 schema, canonical state validation, and typed repository

**Files:** `apps/web/migrations/0001_phase04_auth_and_calculator_state.sql`, `apps/web/src/lib/persistence/{schema,state,repository}.ts`, unit and Cloudflare tests.

**Produces:** `parsePersistedCalculatorState`, `calculatorStateRepository`, `getState`, `upsertState`, `deleteState`, `claimGuestStates`, `listUserStates`.

- [ ] RED validation tests for the three supported shapes and malformed/oversize/unsupported inputs.
- [ ] Implement strict canonical state parsing.
- [ ] RED Cloudflare D1 tests for migration, upsert/get/delete, uniqueness and guest-claim conflict resolution.
- [ ] Implement Drizzle schema/repository and migration-backed claim behavior.
- [ ] Run focused tests and inherited regressions GREEN.
- [ ] Commit `feat(persistence): add Phase 04 D1 calculator state`.

### Task 3: Add Better Auth server/client boundary and localized account UI

**Files:** auth server/client, Cloudflare Node-build stub, `/api/auth/[...all]`, localized auth page/panel, auth contracts, `.dev.vars.example`, Next config, messages/header.

**Produces:** `createFoundCalcAuth(database, options)`, `authClient`, `/api/auth/*`.

- [ ] RED source contracts for D1-backed email/password-only Better Auth, environment secret, route handler, no committed secret and Next-build alias.
- [ ] Implement auth factory/route using current Better Auth Next.js guidance.
- [ ] Implement accessible ID/EN sign-up/sign-in/sign-out/session UI and header account navigation.
- [ ] Run contracts, typecheck, Next build and vinext check/build GREEN.
- [ ] Commit `feat(auth): add Better Auth D1 sessions`.

### Task 4: Add owner resolution, calculator-state API, and guest claim

**Files:** persistence owner/http helpers, `/api/calculator-state/[calculatorId]`, `/api/guest/claim`, API contracts and Cloudflare tests.

- [ ] RED API contracts for route methods, secure cookie attributes, auth priority, 16 KiB guard, supported IDs, stable errors and clear-after-success claim.
- [ ] Implement Better Auth session owner resolution and opaque guest cookie minted only on unauthenticated PUT.
- [ ] Implement GET/PUT/DELETE state routes with no formula calls and no raw SQL exposure.
- [ ] Implement idempotent guest claim.
- [ ] Run contracts + Cloudflare tests GREEN.
- [ ] Commit `feat(api): add calculator state and guest claim routes`.

### Task 5: Preserve unsaved drafts locally and add explicit server persistence controls

**Files:** local draft helper/tests, persistence controls, three Phase 03 calculator components and source contracts.

- [ ] RED tests for namespaced/schema-versioned local drafts, malformed storage tolerance, no auth-token storage and canonical-to-locale rehydration.
- [ ] Implement client-only local draft helper.
- [ ] RED source contracts for all three calculator integrations.
- [ ] Wire local restore/update plus explicit save/load/delete around successful local validation only.
- [ ] Add polite status and first-party privacy copy.
- [ ] Run unit/source contracts and Phase 03 regressions GREEN.
- [ ] Commit `feat(web): preserve and persist calculator drafts`.

### Task 6: Complete guest claim UX and authenticated workspace summary

**Files:** auth panel, workspace page/summary, Phase 04 Playwright specs and E2E wiring contract.

- [ ] RED ID/EN flows for local draft locale preservation, guest save, sign-up/sign-in claim, authenticated reload, delete/sign-out, keyboard and 390px overflow.
- [ ] Add post-auth `/api/guest/claim` with retryable preservation warning that never rolls back successful authentication.
- [ ] Implement signed-out workspace prompt and signed-in three-calculator persistence summary without Projects/history scope.
- [ ] Run Phase 04 + Phase 03 E2E GREEN.
- [ ] Commit `feat(workspace): claim guest drafts into accounts`.

### Task 7: Finish verification, review, handoff, merge, and canonical ZIP

**Files:** Phase 04 verification doc, baseline/handoff/chat template, finalized gate/workflow, post-merge baseline artifact workflow.

- [ ] Run frozen install and fresh `pnpm verify:phase04`, requiring inherited Phase 03/02/01 GREEN.
- [ ] Run Next build, vinext check/build and built Worker smoke with local D1 migration.
- [ ] Review for server formula duplication, raw-input logging, auth token browser storage, secret leakage and Phase 05+ creep.
- [ ] Apply Superpowers requesting-code-review and fix verified issues via RED→GREEN.
- [ ] Record exact run/job/test evidence.
- [ ] Update handoff to the exact next phase from the canonical Phase Workflow; never invent the name if the source is unavailable.
- [ ] Merge only with fresh green final-head CI and zero unresolved review threads.
- [ ] Package exact merged tree as `found-calc-phase-04-persistence-auth-guest-preservation.zip` with SHA256/extraction verification via the established workflow-only follow-up pattern.

## Plan self-review

Spec coverage maps persistence schema, auth, guest identity/claim, local unsaved preservation, explicit D1 persistence, workspace summary, privacy/security, regression verification and packaging to Tasks 1–7. Phase 05+ billing, remote deploy, production rule packs, projects/history, analytics, AI, admin publishing, OAuth and email delivery remain excluded. Persisted state types and stable catalog IDs remain consistent across tasks.
