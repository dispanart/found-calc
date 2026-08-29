# Found Calc Phase 07 — Billing, Entitlements & Xendit Design

**Status:** Approved design with roadmap acceptance amendment; implementation in verification  
**Date:** 2026-08-29  
**Baseline:** Phase 06 — Goals, Projects, Profiles & Workspace  
**Baseline SHA:** `9a8eaa7c14d3ab40a7de9dcd16e8c6fd65612319`

## 1. Purpose

Phase 07 adds a first-party billing and entitlement platform around the existing Found Calc product while preserving all Phase 01–06 truth boundaries. Xendit is the external payment processor, not the source of application authorization. Found Calc persists the billing state needed to make deterministic, low-latency entitlement decisions even when Xendit is unavailable.

The phase must support a production-ready subscription lifecycle using the now-approved Found Calc V1 commercial baseline: Free Rp0; Pro Rp25.000/month or Rp250.000/year; Business Rp75.000/month or Rp750.000/year. Paid capability keys remain server-configured because the product source gives capability examples rather than an exhaustive tier mapping. `BILLING_PLANS_JSON` therefore supplies descriptions, billing anchors/retry policy, and capability keys, while the parser pins the approved IDs/prices/periods and fails closed on drift. Existing public calculators, deterministic arithmetic, Phase 04 drafts, Phase 05 rules, and Phase 06 workspace capabilities are not retroactively paywalled by this phase.

## 2. Success criteria

Phase 07 is complete when all of the following are true:

1. A signed-in user can inspect first-party billing status and available configured plans.
2. A signed-in user can start a Xendit Hosted Checkout subscription session using a server-selected, validated plan definition.
3. The browser never receives the Xendit secret API key or webhook token.
4. Checkout return redirects do not grant entitlement. Entitlements change only from authenticated server-side billing state transitions.
5. Xendit subscription webhooks are authenticated with `x-callback-token`, validated, deduplicated, and applied idempotently.
6. First-party subscription state can represent checkout pending, active, retrying/past-due, inactive/cancelled, and provider-error-safe states without exposing provider internals to the UI.
7. Subscription cancellation calls Xendit's deactivation endpoint server-side and waits for authoritative provider state/webhook confirmation before treating the subscription as inactive.
8. Entitlements are derived locally from a validated plan definition plus first-party subscription state. Entitlement keys remain opaque application capability identifiers; Phase 07 does not invent production-paid capabilities.
9. Phase 07 introduces a separate D1 billing domain through `0004_phase07_billing.sql`; it does not reinterpret Phase 04–06 tables.
10. ID/EN billing UI is keyboard operable, responsive at 390 px, and explains pending/error/retry states without generic SaaS-dashboard patterns.
11. The full Phase 06→01 regression suite remains green, plus new Phase 07 foundation, unit, D1, HTTP, browser, build, migration, and built-Worker smoke coverage.
12. The merged `main` commit produces a canonical Phase 07 ZIP artifact with checksum, commit/tree verification, updated `BASELINE.md`, `PHASE_HANDOFF.md`, and Phase 08 starter context.

## 3. Non-goals and exclusions

Phase 07 does **not**:

- change calculator formulas or add server-side calculation endpoints;
- change Phase 04 latest-draft semantics;
- change Phase 05 rule publication/version semantics;
- merge Phase 06 named Project history with drafts or billing;
- expose or log raw calculator inputs through billing code;
- invent commercial terms beyond the approved Free/Pro/Business V1 prices, or add trial periods, coupons, taxes, discounts, proration, metered billing, invoices, refunds, or enterprise sales flows;
- add Phase 08+ scope;
- require a paid fixed infrastructure service beyond already-approved Cloudflare/Xendit transaction costs;
- use client-side Xendit credentials or browser-stored bearer/auth tokens;
- make Xendit network availability a dependency for ordinary entitlement reads.

## 4. Approved architecture

### 4.1 First-party billing truth

Found Calc owns an internal billing model in D1. Xendit provider identifiers and event data are reconciliation inputs into that model. UI and application capability checks read first-party state only.

The core dependency direction is:

`validated plan config -> checkout adapter -> Xendit`

`Xendit webhook -> authenticated webhook parser -> idempotent billing repository -> subscription state`

`subscription state + validated plan config -> entitlement resolver -> application/UI`

No billing module depends on `@found-calc/engine`, and the engine never depends on billing.

### 4.2 Plan configuration

The approved V1 commercial offers are committed as a first-party product contract: `pro-monthly` Rp25.000, `pro-annual` Rp250.000, `business-monthly` Rp75.000, and `business-annual` Rp750.000. Free remains Rp0 and never requires Xendit. The Worker reads non-secret `BILLING_PLANS_JSON` and validates that all four paid offers match those canonical coordinates before exposing checkout; descriptions, billing-day/retry policy, and capability keys stay configuration-driven.

Each configured plan has this server contract:

```ts
export type BillingPlanDefinition = {
  id: string;
  displayName: { id: string; en: string };
  description: { id: string; en: string };
  amount: number;
  currency: "IDR";
  country: "ID";
  interval: "MONTH";
  intervalCount: number;
  billingDay: number; // integer 1..28; next future occurrence is the anchor
  totalRecurrence: number | null;
  failedCycleAction: "RESUME" | "STOP";
  entitlements: readonly string[];
};
```

`amount` is an integer and must match the approved offer. `billingDay` must be an integer from 1 through 28 because Xendit currently restricts recurring anchors to those calendar days. Xendit Payment Sessions expose DAY/WEEK/MONTH scheduling, so annual Found Calc offers are represented as `interval: "MONTH"` with `intervalCount: 12`; monthly offers use `intervalCount: 1`. At checkout the server derives the next future occurrence of `billingDay` in Asia/Jakarta and serializes it as an ISO 8601 anchor timestamp. `totalRecurrence: null` means no configured recurrence cap. Unsupported/invalid configuration fails closed and returns a stable billing-unavailable response. Source-controlled tests use synthetic fixture plans that are explicitly non-production examples.

### 4.3 Secrets and runtime configuration

Sensitive values are Cloudflare Worker secrets:

- `XENDIT_SECRET_API_KEY`
- `XENDIT_WEBHOOK_TOKEN`

Non-secret application configuration includes:

- `BILLING_PLANS_JSON`
- `PUBLIC_APP_ORIGIN` for constructing validated HTTPS checkout return URLs outside local tests.

`.dev.vars.example` documents names only and never contains production values. Real `.dev.vars*` / `.env*` remain ignored.

## 5. Persistence model

Create `apps/web/migrations/0004_phase07_billing.sql` with a separate billing namespace. Exact SQL names may follow existing repository naming conventions, but the logical records are fixed as follows.

### 5.1 Billing customer

One first-party billing customer row per Better Auth user:

- first-party `user_id` primary/unique key;
- optional Xendit customer identifier when provided by the provider;
- creation/update timestamps.

No raw payment credentials, card/account details, or webhook secrets are stored.

### 5.2 Checkout/session correlation

A checkout row correlates an authenticated Found Calc user and configured `plan_id` with a Xendit payment-session/reference identifier. It records lifecycle timestamps and a stable first-party checkout status. It exists for reconciliation and replay safety; it is not an entitlement grant.

### 5.3 Subscription

At most one current provider subscription record per user/provider plan instance, with:

- user ID;
- configured `plan_id`;
- provider plan/subscription ID;
- merchant `reference_id` generated by Found Calc;
- local status;
- latest known provider cycle status;
- current/next cycle timestamps when provider data supplies them;
- cancellation-request timestamp;
- provider-created/updated timestamps where supplied;
- local created/updated timestamps.

Provider payload blobs are not stored wholesale. Persist only fields needed for reconciliation, state, auditability, and support.

### 5.4 Webhook inbox

Every accepted Xendit subscription webhook is represented by an inbox row with a deterministic deduplication key. Prefer provider object/event identity from event type + provider plan/cycle ID + provider status/timestamp; if the provider later supplies a stable event ID, use it without changing public semantics.

The inbox stores:

- dedupe key;
- event name;
- provider plan/cycle identifier;
- provider event timestamp;
- received timestamp;
- processed timestamp/result marker.

It does not store secret headers or unnecessary full payloads.

Webhook insertion and subscription-state mutation execute in one D1 `batch()` transaction so duplicate or partially applied events cannot create divergent local state.

## 6. Subscription state model

The first-party state is deliberately smaller than Xendit's provider vocabulary.

```ts
export type BillingSubscriptionStatus =
  | "pending"
  | "active"
  | "past_due"
  | "inactive";
```

Mapping rules:

- checkout creation alone: no subscription entitlement; UI may show checkout `pending` separately;
- `recurring.plan.activated`: subscription becomes `active`;
- `recurring.cycle.succeeded`: remain/become `active` and update cycle metadata;
- `recurring.cycle.retrying`: subscription becomes `past_due`; existing entitlement policy is conservative and remains active only if the validated plan resolver explicitly permits `past_due`; Phase 07 default resolver grants entitlements only for `active`;
- `recurring.cycle.failed`: subscription becomes `past_due` unless/until a plan inactivation webhook arrives;
- `recurring.cycle.force_attempt_failed`: subscription remains/becomes `past_due`;
- `recurring.cycle.created`: update cycle metadata only; do not grant entitlement or change an inactive subscription;
- `recurring.plan.inactivated`: subscription becomes `inactive` and grants no entitlements;
- unknown events: acknowledged only after authentication and validation as unsupported, with no state mutation;
- malformed/authentication-failed events: reject with stable 4xx responses and no state mutation.

Out-of-order webhook delivery must not regress a newer terminal/inactive state into an older active state. Repository state transitions compare provider event timestamps and terminal-state precedence before mutation.

## 7. Entitlement contract

Entitlements are deterministic and local:

```ts
export type BillingEntitlementSnapshot = {
  planId: string | null;
  subscriptionStatus: BillingSubscriptionStatus | null;
  keys: readonly string[];
};
```

Rules:

1. No authenticated subscription -> no paid entitlement keys.
2. Unknown/unconfigured `plan_id` -> no entitlement keys and billing status reports configuration mismatch safely.
3. `active` + valid plan -> exactly that plan's deduplicated configured entitlement keys.
4. `pending`, `past_due`, or `inactive` -> no keys in Phase 07.
5. Existing Phase 01–06 public/free behavior does not call this resolver and therefore remains unchanged.

The resolver is pure and has no network or database dependency.

## 8. Xendit integration

### 8.1 Checkout

Found Calc uses Xendit's current Payment Session endpoint from the server:

- `POST /sessions`;
- `session_type: "SUBSCRIPTION"`;
- `mode: "PAYMENT_LINK"`;
- `currency: "IDR"`, `country: "ID"` from validated plan config;
- amount/schedule derived only from server-side validated plan configuration;
- a Found Calc-generated unique `reference_id` is persisted before/correlated with the request;
- customer email/display details come only from the authenticated server session/profile as required by provider contract;
- return URLs are generated from trusted `PUBLIC_APP_ORIGIN`, never accepted from arbitrary request input.

The API returns only the provider-hosted checkout URL and first-party checkout reference needed by the browser. Secret credentials and provider response internals stay server-side.

### 8.2 Webhooks

The webhook route is server-only and does not require a Better Auth browser session. It instead requires exact match of the Xendit `x-callback-token` header to `XENDIT_WEBHOOK_TOKEN`.

Processing order is fixed:

1. read authentication header;
2. reject missing/invalid token before state mutation;
3. parse JSON with a strict size/shape expectation;
4. validate supported subscription event schema;
5. derive dedupe key and first-party transition;
6. execute inbox insert + state mutation atomically;
7. return 2xx for already-processed duplicate events;
8. return stable 4xx for malformed/authentication failures;
9. return 5xx only for transient internal storage errors so Xendit can retry.

Never log the callback token or raw request body.

### 8.3 Upgrade and downgrade

An authenticated user with an active, non-cancelling subscription may request another approved paid offer. The browser supplies only the target first-party `planId`; the server resolves the provider plan identifier from D1 and calls Xendit's current `PATCH /recurring/plans/{id}` API. Found Calc stages `pending_plan_id` before the provider call and never grants target capabilities from the synchronous PATCH response.

Webhook authority remains intact: events matching the pending commercial amount are accepted for lifecycle state, but `pending_plan_id` becomes effective `plan_id` only on a validated `recurring.cycle.succeeded`. Retry/failed events do not grant the target capabilities. Provider failure clears the staged change. Inactivation clears any staged change. This same state machine covers upgrades, downgrades, and monthly/annual switches without creating a second simultaneous provider subscription.

### 8.4 Cancellation

Cancellation is an authenticated server action. The server finds the current local subscription and calls Xendit's `POST /recurring/plans/{id}/deactivate` with `api-version: 2026-01-01`.

A successful provider API response records `cancellation_requested_at`. The local subscription does not become `inactive` solely because the browser received a success response. The authoritative transition is the validated `recurring.plan.inactivated` webhook, while the UI can display cancellation pending.

Repeated cancellation requests are idempotent from the user's perspective.

### 8.5 Provider failures

Xendit timeout, network, 4xx, 5xx, or malformed-response details are normalized into stable application errors. Provider bodies, API keys, tokens, SQL, and stack traces are never returned to the client.

## 9. Application boundaries and file layout

Phase 07 follows existing `apps/web/src/lib/*` vertical boundaries.

New focused modules:

- `apps/web/src/lib/billing/contracts.ts` — billing plan/status/payload types and validators;
- `apps/web/src/lib/billing/plans.ts` — parse/validate `BILLING_PLANS_JSON` and localized safe plan projection;
- `apps/web/src/lib/billing/entitlements.ts` — pure entitlement resolver;
- `apps/web/src/lib/billing/repository.ts` — D1 billing persistence and idempotent transitions;
- `apps/web/src/lib/billing/http.ts` — stable HTTP response/error helpers;
- `apps/web/src/lib/billing/route-services.ts` — authenticated status/checkout/cancel orchestration;
- `apps/web/src/lib/billing/client.ts` — browser-safe API client/parsers;
- `apps/web/src/lib/xendit/client.ts` — server-only Xendit HTTP adapter;
- `apps/web/src/lib/xendit/webhooks.ts` — server-only subscription webhook validation/mapping;
- `apps/web/src/components/billing/billing-panel.tsx` — localized billing UI;
- route handlers under `apps/web/src/app/api/billing/**`;
- localized billing page under `apps/web/src/app/[locale]/workspace/billing/page.tsx` or the closest existing workspace route convention.

Existing workspace navigation adds a billing entry for signed-in users without changing existing project/profile semantics.

## 10. HTTP API contract

### 10.1 `GET /api/billing/status`

Requires Better Auth session.

Returns a browser-safe shape containing:

- billing availability/configured flag;
- localized-neutral configured plan projections (`id`, amount/currency/interval, localized strings for requested locale when applicable);
- current local subscription status;
- cancellation-pending flag;
- entitlement keys;
- no provider secret or raw payload.

Unauthenticated: `401`.

### 10.2 `POST /api/billing/checkout`

Requires Better Auth session.

Input:

```json
{ "planId": "server-configured-plan-id", "locale": "id" }
```

Server validates the plan ID against current configuration and locale against the supported ID/EN set. It constructs trusted return URLs and calls Xendit.

Success returns a checkout URL and first-party checkout reference. Unknown plan/configuration/provider failures return stable non-secret errors.

### 10.3 `POST /api/billing/subscription/cancel`

Requires Better Auth session. No provider ID is accepted from the browser. Server resolves the user's current subscription and deactivates that exact provider plan.

Success means cancellation request accepted, not entitlement revoked.

### 10.4 `POST /api/billing/webhooks/xendit`

Does not use browser session authentication. Requires valid callback token and supported webhook payload. Duplicate valid events return success without duplicate mutation.

## 11. UI and interaction design

Billing lives inside the existing workspace experience, not as a separate generic admin dashboard.

The billing panel has five visual responsibilities:

1. **Current access** — concise local subscription state and entitlement/access summary.
2. **Plan choice** — configured plans rendered only when server configuration is valid; no hard-coded production plan/price copy.
3. **Checkout transition** — explicit action that redirects to Xendit Hosted Checkout; button loading/disabled states prevent double submission.
4. **Lifecycle notice** — pending activation, payment retry/past-due, cancellation pending, inactive, or provider unavailable states explained in ID/EN.
5. **Trust copy** — payment is processed by Xendit; Found Calc does not store card/payment credentials; successful checkout return may still wait for server confirmation.

The design reuses existing typography, spacing, button primitives, and workspace visual language. It avoids nested generic KPI cards, fake charts, gradients, AI-generated marketing copy, and decorative complexity.

Accessibility requirements:

- full keyboard operation;
- visible focus states through existing primitives;
- semantic headings and status text;
- status updates use an appropriate live region where asynchronous client updates occur;
- checkout/cancel controls have unambiguous accessible names;
- no color-only status meaning;
- no horizontal overflow at 390 px;
- ID and EN copy remain meaning-equivalent.

## 12. Privacy, security, and trust

- Billing status and checkout/cancel APIs rederive user identity from Better Auth server session.
- Browser input can select only a server-configured plan ID; amount, currency, schedule, provider ID, and return origins are never trusted from the browser.
- Webhook authentication uses the secret callback token and server-side comparison.
- Provider secret API key and webhook token are Cloudflare secrets, not `vars` and not source.
- Checkout URLs are returned only from the trusted Xendit response and must be HTTPS in production.
- No raw calculator inputs, project contents, Goal data, invite tokens, auth tokens, or unrelated user data enter Xendit metadata.
- Provider metadata/reference IDs use opaque first-party billing identifiers only.
- No payment credential details are stored in D1.
- Stable errors avoid account enumeration and do not expose provider/D1 internals.
- Logging, if any existing request logging applies, must omit request bodies and secrets for billing/webhook routes.

## 13. Verification strategy

All implementation follows RED -> GREEN -> refactor and preserves the Phase 06 fail-fast verifier chain.

### 13.1 Foundation contracts

Dependency-free contract tests verify:

- new migration exists and is separate from prior domains;
- billing route/file boundaries exist;
- Xendit secrets/config names are represented without committed values;
- engine/rules packages remain free of billing imports;
- Phase 07 verification workflow includes all inherited regression gates;
- canonical artifact workflow archives exact merged SHA and required Phase 07 docs.

### 13.2 Unit tests

Vitest tests cover:

- plan JSON validation including unsafe/invalid values;
- pure entitlement resolution;
- webhook schema parsing and provider->local state mapping;
- out-of-order/terminal transition precedence;
- Xendit request construction and error normalization using mocked `fetch`;
- browser client payload parsing.

### 13.3 Cloudflare/D1 tests

Cloudflare Vitest tests cover:

- `0001 -> 0002 -> 0003 -> 0004` migration chain;
- customer/session/subscription persistence;
- checkout correlation uniqueness;
- webhook inbox deduplication;
- atomic duplicate-safe state transition;
- active/retrying/failed/inactivated state behavior;
- stale webhook cannot regress newer state;
- cancellation-request persistence;
- no cross-user subscription access.

### 13.4 HTTP tests

Test route/service behavior for:

- 401 unauthenticated status/checkout/cancel;
- invalid/unknown plan;
- trusted-origin return URL construction;
- provider failure normalization;
- missing/invalid webhook token;
- malformed/unsupported webhook;
- duplicate webhook returns 2xx without double mutation;
- cancel never accepts provider ID from client.

### 13.5 Browser tests

Playwright covers ID and EN:

- signed-in workspace billing navigation;
- configured plan rendering from test configuration;
- checkout initiation and redirect URL handoff using a deterministic local/mock provider boundary;
- pending activation copy after checkout return;
- active state after seeded/HTTP-applied webhook fixture;
- retry/past-due state;
- cancellation request pending and final inactive state;
- keyboard interaction and focus visibility;
- 390 px no-overflow;
- existing public calculator access remains unchanged when signed out.

### 13.6 Build and smoke

`verify:phase07` must run:

- Phase 07 foundation/unit/Cloudflare/e2e coverage;
- lint;
- TypeScript + Wrangler typegen;
- Next.js build/check required by current repo;
- vinext check/build;
- full inherited Phase 06→01 verifier chain;
- authenticated built-Worker smoke against an isolated local D1 state with synthetic plan config and mocked/local provider behavior so CI never needs production Xendit credentials.

## 14. CI and canonical closure

Add:

- `scripts/verify-phase-07.mjs`;
- `.github/workflows/phase-07-verification.yml`;
- `.github/workflows/phase-07-baseline-artifact.yml`;
- `docs/verification/phase-07-verification.md` at closure.

Before merge:

1. complete all plan tasks with task-level tests;
2. run fresh full `pnpm verify:phase07`;
3. push branch and open PR to `main`;
4. inspect changed-file list/diff and security-sensitive paths;
5. require green Phase 07 GitHub Actions verification at the final head;
6. merge only the verified head SHA;
7. verify fresh post-merge closure workflow if configured for `main`;
8. download/inspect canonical artifact and verify SHA/tree identity;
9. update handoff so Phase 08 starts from the exact merged artifact.

## 15. Current provider/platform references frozen for this phase

Implementation must re-check current docs when code is written, but the approved design is based on these current contracts as of 2026-08-29:

- Xendit Payment Session `POST /sessions`, including `session_type: SUBSCRIPTION` and `mode: PAYMENT_LINK`.
- Xendit Subscription webhook events `recurring.plan.activated`, `recurring.plan.inactivated`, `recurring.cycle.created`, `recurring.cycle.retrying`, `recurring.cycle.succeeded`, `recurring.cycle.failed`, and `recurring.cycle.force_attempt_failed`.
- Xendit webhook sender authentication through `x-callback-token`.
- Xendit deactivation endpoint `POST /recurring/plans/{id}/deactivate` with API version `2026-01-01`.
- Cloudflare D1 `batch()` transactional semantics for grouped statements.
- Cloudflare Worker secrets for sensitive provider credentials; plaintext `vars` are not used for secrets.
- Next.js 16 Route Handlers use Web `Request` APIs for JSON/body/header handling.

## 16. Change control

Any implementation discovery that requires changing a Phase 01–06 architecture boundary, introducing a production plan/price/capability not approved here, or weakening the webhook/entitlement security model is a blocker. Capture reproducible evidence and obtain explicit approval for the smallest amendment before proceeding.
