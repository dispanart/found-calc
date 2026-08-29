# Found Calc Phase 07 — Billing, Entitlements & Xendit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship first-party subscription billing state, deterministic local entitlements, secure Xendit Hosted Checkout/webhook/cancellation integration, localized workspace billing UI, and a canonical Phase 07 handoff without changing Phase 01–06 calculator/rule/workspace truth.

**Architecture:** Add a separate D1 billing domain and focused `lib/billing` + `lib/xendit` modules. Browser APIs read first-party state only; Xendit network calls are server-only; authenticated webhooks reconcile provider state into D1 atomically; entitlement resolution is pure and never queries Xendit.

**Tech Stack:** TypeScript 5.9 strict mode, Next.js 16.2.9 App Router, React 19.2.8, Better Auth 1.6.29, Drizzle ORM 0.45.2 + Cloudflare D1, Tailwind CSS 4.3.3, shadcn primitives, Vitest 4.1.x, Cloudflare Vitest plugin, Playwright 1.62.1, pnpm 11.24.0, Node.js 22, vinext 1.0.0-beta.8, Wrangler 4.127.0, Xendit Payment Sessions/Recurring API version `2026-01-01`.

**Spec:** `docs/superpowers/specs/2026-08-29-found-calc-phase-07-billing-entitlements-xendit-design.md`

## Global Constraints

- Preserve Phase 01–06 architecture and regressions; no calculator formula, Phase 04 draft, Phase 05 rule, or Phase 06 workspace reinterpretation.
- Approved V1 offer IDs/prices/periods are first-party product constants: Free Rp0; Pro Rp25.000/month and Rp250.000/year; Business Rp75.000/month and Rp750.000/year. `BILLING_PLANS_JSON` remains responsible for descriptions, billing policy, and capability keys and must match all canonical paid coordinates.
- Sensitive provider configuration is only `XENDIT_SECRET_API_KEY` and `XENDIT_WEBHOOK_TOKEN`; never expose them to browser, source, logs, artifacts, or plaintext Wrangler vars.
- Entitlements are derived only from local first-party subscription state plus validated plan config; ordinary entitlement reads never call Xendit.
- Checkout return redirects do not grant access. Only authenticated provider reconciliation may produce `active` state.
- Webhook token comparison happens before payload mutation; duplicate valid events are idempotent; stale events cannot regress newer terminal state.
- Cancellation accepts no provider ID from the browser and does not mark local state inactive before authoritative webhook confirmation.
- Phase 07 supports the approved monthly and annual IDR/Indonesia offers. Payment Sessions encode annual as `MONTH` + `intervalCount: 12`; monthly uses `intervalCount: 1`. Billing day remains 1..28 and return URLs come only from trusted `PUBLIC_APP_ORIGIN`.
- Keep ID/EN parity, keyboard accessibility, visible focus, semantic status messaging, reduced-motion behavior, and 390 px no-horizontal-overflow.
- Preserve Rp0 fixed-infrastructure target excluding domain/payment transaction fees; exclude Phase 08+ scope, production tax/legal packs, analytics, AI, TestSprite certification, remote deploy/DNS/secrets.

### Roadmap acceptance amendment

The approved product roadmap supersedes the earlier monthly-only/no-fixed-price assumption. Completion now additionally requires canonical Free/Pro/Business pricing, annual offers, and tested upgrade + downgrade. Plan changes update the existing Xendit recurring plan server-side, stage first-party pending state, and promote capabilities only after a matching successful-cycle webhook.

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

- [ ] **Step 1: Write RED tests** for unknown-key rejection, duplicate plan IDs, non-integer/negative amount, non-IDR/country/interval values, `billingDay` outside 1..28, duplicate entitlement dedupe, invalid JSON fail-closed, and anchor rollover.
- [ ] **Step 2: Run dependency-free foundation RED** with `node --experimental-strip-types --test tests/foundation/phase-07-billing-contract.test.mjs`; expected failure is missing Phase 07 files/migration/routes.
- [ ] **Step 3: Run focused Vitest RED in CI** after committing tests; expected failures reference missing exports from `billing/*`.
- [ ] **Step 4: Implement minimal contracts/config parser** using explicit property allowlists and bounded strings/arrays. Never parse arbitrary environment values into client objects without validation.
- [ ] **Step 5: Implement pure entitlement resolver** equivalent to:

```ts
export function resolveBillingEntitlements(
  plan: BillingPlanDefinition | null,
  status: BillingSubscriptionStatus | null,
): BillingEntitlementSnapshot {
  if (!plan || status !== "active") return { planId: plan?.id ?? null, subscriptionStatus: status, keys: [] };
  return { planId: plan.id, subscriptionStatus: status, keys: [...new Set(plan.entitlements)] };
}
```

- [ ] **Step 6: Run focused GREEN tests** locally where dependency-free and in GitHub CI for Vitest.
- [ ] **Step 7: Commit** `feat(billing): define phase 07 plan and entitlement contracts`.

### Task 2: D1 billing schema and idempotent repository

**Files:**
- Create: `apps/web/migrations/0004_phase07_billing.sql`
- Modify: `apps/web/src/lib/persistence/schema.ts`
- Create: `apps/web/src/lib/billing/repository.ts`
- Modify: `apps/web/tests/cloudflare/test-database.ts`
- Create: `apps/web/tests/cloudflare/phase-07-billing-repository.test.ts`

**Interfaces:**
- Drizzle tables for billing customers, checkout sessions, subscriptions, and webhook inbox.
- `createBillingRepository(binding)` with `getStatusForUser`, `createCheckoutCorrelation`, `markCancellationRequested`, and `applyWebhookTransition`.
- `applyWebhookTransition` consumes a normalized provider event and returns `{ duplicate: boolean; applied: boolean }`.

- [ ] **Step 1: Write Cloudflare RED tests** covering `0001->0004`, user isolation, checkout reference uniqueness, one current subscription per provider plan instance, inbox dedupe, duplicate replay, stale timestamp protection, inactive terminal precedence, cancellation timestamp persistence, and no provider payload blobs.
- [ ] **Step 2: Add `0004_phase07_billing.sql`** with foreign keys to Better Auth `user`, unique/index constraints, status CHECKs, and no changes to Phase 04–06 tables.
- [ ] **Step 3: Extend Drizzle schema** with matching focused billing table definitions.
- [ ] **Step 4: Extend test DB migration/reset chain** to apply/drop `0004` deterministically.
- [ ] **Step 5: Implement repository** so webhook inbox insert + state mutation are executed through one D1 `batch()` and duplicate insert is detected without applying a second state transition.
- [ ] **Step 6: Preserve stale/terminal ordering** by comparing normalized provider timestamp plus local precedence before mutation; an older `activated` event cannot revive a newer `inactive` row.
- [ ] **Step 7: Run repository GREEN in CI** and inherited Phase 06 Cloudflare repository tests.
- [ ] **Step 8: Commit** `feat(billing): persist first-party subscription state`.

### Task 3: Xendit adapter and webhook normalization

**Files:**
- Create: `apps/web/src/lib/xendit/client.ts`
- Create: `apps/web/src/lib/xendit/client.test.ts`
- Create: `apps/web/src/lib/xendit/webhooks.ts`
- Create: `apps/web/src/lib/xendit/webhooks.test.ts`

**Interfaces:**
- `createXenditClient({ secretApiKey, fetchImpl })` with `createSubscriptionSession(input)` and `deactivateSubscription(providerPlanId)`.
- `parseXenditWebhook(payload)` returns a normalized event for only supported recurring event names.
- Xendit calls use server-side Basic auth, current provider API version where required, JSON content type, stable timeout/error normalization, and never include calculator/workspace data.

- [ ] **Step 1: Write RED unit tests** for exact `/sessions` body, `session_type: "SUBSCRIPTION"`, `mode: "PAYMENT_LINK"`, server-derived IDR/ID monthly schedule, trusted return URLs, generated reference ID, HTTPS checkout URL validation, deactivation route/version header, timeout/4xx/5xx/malformed response normalization, and secret non-propagation.
- [ ] **Step 2: Write RED webhook tests** for supported event mapping, missing provider IDs/timestamps, malformed statuses, unknown event acknowledgement-without-mutation semantics, and deterministic dedupe-key creation.
- [ ] **Step 3: Implement minimal fetch adapter** with injected `fetchImpl` so tests assert request behavior without network access.
- [ ] **Step 4: Implement webhook parser** that stores only fields required by repository reconciliation; do not return the raw payload after parsing.
- [ ] **Step 5: Run unit GREEN in CI** and confirm no dependency on `@found-calc/engine` or `@found-calc/rules`.
- [ ] **Step 6: Commit** `feat(xendit): add hosted checkout and recurring webhook adapter`.

### Task 4: Billing HTTP orchestration and route handlers

**Files:**
- Create: `apps/web/src/lib/billing/http.ts`
- Create: `apps/web/src/lib/billing/route-services.ts`
- Create: `apps/web/src/app/api/billing/status/route.ts`
- Create: `apps/web/src/app/api/billing/checkout/route.ts`
- Create: `apps/web/src/app/api/billing/subscription/cancel/route.ts`
- Create: `apps/web/src/app/api/billing/subscription/change/route.ts`
- Create: `apps/web/src/app/api/billing/webhooks/xendit/route.ts`
- Create: `apps/web/tests/cloudflare/phase-07-billing-api.test.ts`

**Interfaces:**
- Status/checkout/cancel/change derive Better Auth session from request headers and never trust user/provider identifiers from body.
- Webhook route authenticates only with `x-callback-token` using `XENDIT_WEBHOOK_TOKEN`.
- All responses set `Cache-Control: no-store`; errors are stable/non-secret.

- [ ] **Step 1: Write API RED tests** for signed-out 401, unknown plan 400, invalid config 503, return URL origin trust, provider failure normalization, checkout correlation, cancel with no provider ID input, cancellation pending semantics, webhook missing/wrong token 401, oversized/malformed payload 400/413, duplicate 2xx, unsupported authenticated event 2xx/no mutation, storage failure 500.
- [ ] **Step 2: Implement bounded JSON/body helpers** and stable error response codes such as `billing-unavailable`, `invalid-billing-input`, `provider-unavailable`, `invalid-webhook`, `unauthorized-webhook`.
- [ ] **Step 3: Implement status service** reading local repository plus validated plan config and pure entitlement resolver only.
- [ ] **Step 4: Implement checkout service** generating an opaque first-party reference, persisting correlation, constructing return URLs from `PUBLIC_APP_ORIGIN`, and calling Xendit server-side.
- [ ] **Step 5: Implement cancel service** resolving the current local subscription, calling provider deactivation, and recording only `cancellation_requested_at` until webhook confirmation.
- [ ] **Step 6: Implement webhook service** with token check before parse/mutation, strict parser, atomic repository application, and duplicate success.
- [ ] **Step 7: Keep route files thin** and compatible with Next.js 16 Web `Request` APIs.
- [ ] **Step 8: Run API GREEN in CI** plus Phase 04 auth, Phase 05 rule API, and Phase 06 workspace API regressions.
- [ ] **Step 9: Commit** `feat(billing): add protected subscription APIs`.

### Task 5: Browser client and localized workspace billing UI

**Files:**
- Create: `apps/web/src/lib/billing/client.ts`
- Create: `apps/web/src/lib/billing/client.test.ts`
- Create: `apps/web/src/components/billing/billing-panel.tsx`
- Create: `apps/web/src/app/[locale]/(workspace)/workspace/billing/page.tsx`
- Modify: `apps/web/src/components/site-header.tsx`
- Modify: `apps/web/src/components/workspace/workspace-dashboard.tsx`
- Modify: `apps/web/src/i18n/messages.ts`
- Create: `apps/web/tests/e2e/phase-07-billing.spec.ts`
- Create/extend: `tests/foundation/phase-07-billing-ui-contract.test.mjs`

**Interfaces:**
- Client parses status payload before rendering and never accepts provider IDs/secrets.
- `BillingPanel` receives `locale` and renders current access, configured plans, lifecycle notice, checkout/cancel actions, and Xendit trust copy.
- Checkout action navigates only to a validated HTTPS provider URL returned by the API.

- [ ] **Step 1: Write RED client/source/E2E tests** for ID/EN configured plans, signed-out redirect/affordance, pending return copy, active/past-due/inactive states, cancellation pending, provider unavailable, keyboard operation, focus-visible controls, semantic live status, and 390 px no overflow.
- [ ] **Step 2: Implement strict browser-safe payload parsers** for status/checkout responses.
- [ ] **Step 3: Implement billing page/panel** using existing Space Grotesk/shadcn visual language, section dividers/whitespace instead of generic KPI card grids, no fake charts/gradients.
- [ ] **Step 4: Add navigation** from signed-in workspace/header without changing existing calculator or project routes.
- [ ] **Step 5: Preserve trust copy** that Xendit processes payment credentials and checkout return may wait for server confirmation.
- [ ] **Step 6: Run UI/client GREEN in CI** plus Phase 03 accessibility/calculator, Phase 04 guest/auth, Phase 05 admin, and Phase 06 workspace browser regressions.
- [ ] **Step 7: Commit** `feat(web): add localized billing workspace`.

### Task 6: Phase 07 verification gate, Worker smoke, and CI

**Files:**
- Create: `scripts/verify-phase-07.mjs`
- Modify: `package.json`
- Create: `.github/workflows/phase-07-verification.yml`
- Create: `docs/verification/phase-07-verification.md` (initial evidence log; finalized in Task 7)
- Modify: `apps/web/.dev.vars.example`
- Modify: `.gitignore` only if required to keep real secret/env files excluded.

**Interfaces:**
- `pnpm verify:phase07` is a fail-fast superset of `verify:phase06`.
- CI provides only synthetic non-production `BILLING_PLANS_JSON`, `PUBLIC_APP_ORIGIN`, and test-only provider credentials/tokens; no real Xendit call is made.

- [ ] **Step 1: Write dependency-free RED verification contract** requiring Phase 07 verifier/workflow, `0004`, inherited verifier call, billing tests, migration chain, build checks, and built-Worker smoke.
- [ ] **Step 2: Implement `verify-phase-07.mjs`** to run foundation, unit, Cloudflare, Playwright, lint, typecheck, Next build, vinext check/build, then inherited `verify:phase06` or equivalent non-duplicating fail-fast chain.
- [ ] **Step 3: Add CI workflow** on Phase 07 branch/PR with Node 22, pnpm 11.24.0, Chromium, local D1 migration `0001..0004`, synthetic plan config, deterministic provider stub boundary, and no production secret dependency.
- [ ] **Step 4: Extend built-Worker smoke** to prove signed-out billing 401, authenticated status, configured plan exposure, local entitlement behavior, and webhook idempotency using local/stubbed provider behavior.
- [ ] **Step 5: Run fresh GitHub CI** and record exact failing/passing run evidence. Any defect discovered receives a RED regression before fix.
- [ ] **Step 6: Commit** `test(ci): verify phase 07 billing boundary`.

### Task 7: Review, closure, PR/merge, and canonical Phase 07 artifact

**Files:**
- Finalize: `docs/verification/phase-07-verification.md`
- Modify: `BASELINE.md`
- Modify: `PHASE_HANDOFF.md`
- Modify: `PHASE_CHAT_TEMPLATE.md`
- Create: `.github/workflows/phase-07-baseline-artifact.yml`

**Interfaces:**
- Canonical artifact: `found-calc-phase-07-billing-entitlements-xendit.zip`.
- Successor handoff must name the exact approved Phase 08 title from project workflow if present; if unavailable in baseline, state only that Phase 08 scope must be confirmed and do not invent a title.

- [ ] **Step 1: Run Superpowers verification-before-completion** against final branch head: inspect fresh CI, exact SHA, tests/build/migration/smoke evidence, and warnings.
- [ ] **Step 2: Security/architecture diff review** for secret leakage, browser/provider-ID trust, checkout-return entitlement grant, webhook token/body logging, stale-event regression, network-dependent entitlement reads, cross-user billing access, calculator/workspace data sent to Xendit, and Phase 08+ creep.
- [ ] **Step 3: Request/review code-review gate**; resolve every material finding with RED regression first and rerun impacted/full checks.
- [ ] **Step 4: Finalize verification/baseline/handoff** with exact CI run/job/head evidence and preserved historical provenance.
- [ ] **Step 5: Add post-merge artifact workflow** using `git archive "$GITHUB_SHA"`, SHA256, clean extraction verification, required Phase 07 files, generated/dependency exclusion, and `ARTIFACT_VERIFICATION.txt` recording source commit/tree/archive tree/checksum.
- [ ] **Step 6: Open PR to `main`** only after feature head is green; inspect changed filenames/patch and final status.
- [ ] **Step 7: Merge only verified final head**; verify merged `main` and post-merge Phase 07 artifact workflow.
- [ ] **Step 8: Download canonical artifact**, verify checksum/source/tree/required files, and provide ZIP as Phase 08 portable baseline.
