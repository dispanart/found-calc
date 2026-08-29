# Found Calc Phase 07 — Billing, Entitlements & Xendit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship first-party subscription billing state, deterministic local entitlements, secure Xendit Hosted Checkout/webhook/cancellation integration, localized workspace billing UI, and a canonical Phase 07 handoff without changing Phase 01–06 calculator/rule/workspace truth.

**Architecture:** Add a separate D1 billing domain and focused `lib/billing` + `lib/xendit` modules. Browser APIs read first-party state only; Xendit network calls are server-only; authenticated webhooks reconcile provider state into D1 atomically; entitlement resolution is pure and never queries Xendit.

**Tech Stack:** TypeScript 5.9 strict mode, Next.js 16.2.9 App Router, React 19.2.8, Better Auth 1.6.29, Drizzle ORM 0.45.2 + Cloudflare D1, Tailwind CSS 4.3.3, shadcn primitives, Vitest 4.1.x, Cloudflare Vitest plugin, Playwright 1.62.1, pnpm 11.24.0, Node.js 22, vinext 1.0.0-beta.8, Wrangler 4.127.0, Xendit Payment Sessions/Recurring API version `2026-01-01`.

**Spec:** `docs/superpowers/specs/2026-08-29-found-calc-phase-07-billing-entitlements-xendit-design.md`

## Global Constraints

- Preserve Phase 01–06 architecture and regressions; no calculator formula, Phase 04 draft, Phase 05 rule, or Phase 06 workspace reinterpretation.
- Production plan pricing/names/entitlement keys come only from validated `BILLING_PLANS_JSON`; never hard-code production commercial terms.
- Sensitive provider configuration is only `XENDIT_SECRET_API_KEY` and `XENDIT_WEBHOOK_TOKEN`; never expose them to browser, source, logs, artifacts, or plaintext Wrangler vars.
- Entitlements are derived only from local first-party subscription state plus validated plan config; ordinary entitlement reads never call Xendit.
- Checkout return redirects do not grant access. Only authenticated provider reconciliation may produce `active` state.
- Webhook token comparison happens before payload mutation; duplicate valid events are idempotent; stale events cannot regress newer terminal state.
- Cancellation accepts no provider ID from the browser and does not mark local state inactive before authoritative webhook confirmation.
- Phase 07 supports IDR/Indonesia monthly plans only, with billing day 1..28 and trusted `PUBLIC_APP_ORIGIN` return URLs.
- Keep ID/EN parity, keyboard accessibility, visible focus, semantic status messaging, reduced-motion behavior, and 390 px no-horizontal-overflow.
- Preserve Rp0 fixed-infrastructure target excluding domain/payment transaction fees; exclude Phase 08+ scope, production tax/legal packs, analytics, AI, TestSprite certification, remote deploy/DNS/secrets.

---

### Task 1: Billing contracts, plan configuration, and entitlement RED boundary

**Files:**
- Create: `apps/web/src/lib/billing/contracts.ts`
- Create: `apps/web/src/lib/billing/contracts.test.ts`
- Create: `apps/web/src/lib/billing/plans.ts`
- Create: `apps/web/src/lib/billing/plans.test.ts`
- Create: `apps/web/src/lib/billing/entitlements.ts`
- Create: `apps/web/src/lib/billing/entitlements.test.ts`
- Create: `tests/foundation/phase-07-billing-contract.test.mjs`

**Interfaces:**
- `BillingPlanDefinition`, `BillingSubscriptionStatus`, `BillingEntitlementSnapshot`.
- `parseBillingPlansJson(raw: string | undefined): BillingPlansResult` where invalid/missing config fails closed.
- `getBillingPlan(plans, planId)` selects only a server-validated plan.
- `resolveBillingEntitlements(plan, status)` is pure and grants keys only for `active`.
- `nextBillingAnchorIso(billingDay, now)` derives the next Asia/Jakarta monthly anchor for days 1..28.

- [ ] Write RED tests for strict config validation, anchor rollover, pure entitlement behavior, and missing Phase 07 boundaries.
- [ ] Run dependency-free foundation RED and focused Vitest RED in CI.
- [ ] Implement minimal contracts/config parser and pure entitlement resolver.
- [ ] Run focused GREEN tests locally where dependency-free and in GitHub CI.
- [ ] Commit `feat(billing): define phase 07 plan and entitlement contracts`.

### Task 2: D1 billing schema and idempotent repository

**Files:** `apps/web/migrations/0004_phase07_billing.sql`, `apps/web/src/lib/persistence/schema.ts`, `apps/web/src/lib/billing/repository.ts`, `apps/web/tests/cloudflare/test-database.ts`, `apps/web/tests/cloudflare/phase-07-billing-repository.test.ts`.

**Interfaces:** Drizzle billing tables plus `createBillingRepository(binding)` with status, checkout-correlation, cancellation-request, and atomic webhook-transition methods.

- [ ] Write Cloudflare RED tests for migration chain, user isolation, checkout uniqueness, inbox dedupe, duplicate replay, stale timestamp protection, inactive precedence, and cancellation timestamps.
- [ ] Add separate `0004` schema with foreign keys/indexes/CHECKs and no Phase 04–06 reinterpretation.
- [ ] Implement repository with D1 `batch()` for inbox insert + state mutation and deterministic stale/terminal guards.
- [ ] Run repository GREEN plus inherited Phase 06 repository regressions.
- [ ] Commit `feat(billing): persist first-party subscription state`.

### Task 3: Xendit adapter and webhook normalization

**Files:** `apps/web/src/lib/xendit/client.ts`, `client.test.ts`, `webhooks.ts`, `webhooks.test.ts`.

**Interfaces:** `createXenditClient({ secretApiKey, fetchImpl })`, `createSubscriptionSession`, `deactivateSubscription`, and strict `parseXenditWebhook` normalization.

- [ ] Write RED tests for exact `/sessions` request contract, trusted returns, HTTPS checkout URL, deactivation endpoint/version, provider error normalization, supported recurring events, malformed payloads, and dedupe keys.
- [ ] Implement injected-fetch adapter and strict webhook parser without raw payload persistence.
- [ ] Run GREEN and confirm no engine/rules dependency.
- [ ] Commit `feat(xendit): add hosted checkout and recurring webhook adapter`.

### Task 4: Billing HTTP orchestration and route handlers

**Files:** `apps/web/src/lib/billing/http.ts`, `route-services.ts`, API routes under `apps/web/src/app/api/billing/**`, `apps/web/tests/cloudflare/phase-07-billing-api.test.ts`.

**Interfaces:** Better Auth for status/checkout/cancel, callback-token auth for webhook, `Cache-Control: no-store`, stable non-secret errors.

- [ ] Write API RED tests for 401s, unknown plan/config failure, origin trust, provider failure, cancel provider-ID rejection, cancellation pending semantics, webhook auth/size/schema/duplicate/storage failures.
- [ ] Implement bounded HTTP helpers and status/checkout/cancel/webhook orchestration.
- [ ] Keep Route Handler files thin and Next.js 16 Web-Request compatible.
- [ ] Run GREEN plus Phase 04–06 API regressions.
- [ ] Commit `feat(billing): add protected subscription APIs`.

### Task 5: Browser client and localized workspace billing UI

**Files:** `apps/web/src/lib/billing/client.ts`, `client.test.ts`, `apps/web/src/components/billing/billing-panel.tsx`, localized billing page, workspace/header navigation, i18n copy, Playwright and foundation UI contracts.

**Interfaces:** strict browser-safe payload parsing; `BillingPanel(locale)` renders current access, configured plans, lifecycle notice, checkout/cancel, and Xendit trust copy.

- [ ] Write RED client/source/E2E tests for ID/EN, pending/active/past-due/inactive/cancel-pending/provider-unavailable, keyboard/focus/live status, and 390 px.
- [ ] Implement client parser, product-density billing page/panel, and signed-in navigation without generic KPI/card-dashboard styling.
- [ ] Preserve trust copy and provider-hosted redirect behavior.
- [ ] Run GREEN plus inherited browser regressions.
- [ ] Commit `feat(web): add localized billing workspace`.

### Task 6: Phase 07 verification gate, Worker smoke, and CI

**Files:** `scripts/verify-phase-07.mjs`, root `package.json`, `.github/workflows/phase-07-verification.yml`, `docs/verification/phase-07-verification.md`, `apps/web/.dev.vars.example`.

**Interfaces:** `pnpm verify:phase07` is a fail-fast Phase 06→01 superset and CI uses only synthetic plan/provider config.

- [ ] Write dependency-free RED verification contract requiring Phase 07 verifier/workflow, `0004`, inherited regressions, build checks, and built-Worker smoke.
- [ ] Implement verifier/workflow, migration `0001..0004`, synthetic billing env, and deterministic provider stub boundary.
- [ ] Run fresh GitHub CI; any defect receives a RED regression before its fix.
- [ ] Commit `test(ci): verify phase 07 billing boundary`.

### Task 7: Review, closure, PR/merge, and canonical Phase 07 artifact

**Files:** finalize `docs/verification/phase-07-verification.md`; update `BASELINE.md`, `PHASE_HANDOFF.md`, `PHASE_CHAT_TEMPLATE.md`; create `.github/workflows/phase-07-baseline-artifact.yml`.

**Interfaces:** canonical artifact is `found-calc-phase-07-billing-entitlements-xendit.zip`; Phase 08 title is not invented if absent from approved workflow.

- [ ] Run verification-before-completion on final head and security/architecture diff review.
- [ ] Resolve code-review findings with RED regressions first.
- [ ] Finalize verification/baseline/handoff with exact CI/head evidence.
- [ ] Add post-merge `git archive "$GITHUB_SHA"` artifact workflow with SHA256 and source/tree verification.
- [ ] Open PR only after green feature head, inspect patches/checks, and merge only verified final head.
- [ ] Verify merged `main` and artifact workflow, download canonical ZIP, validate checksum/tree/required files, and provide it as the Phase 08 portable baseline.
