# Found Calc Phase 07A — Commercial, Trial & Google Auth Amendment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Amend the completed Phase 07 baseline with Friends/Besties/Family commercial presentation, current pricing, a one-time no-card 14-day Besties trial, Google sign-in, paid-through cancellation access, and capability limits without breaking Phase 01–07 behavior or historical Xendit reconciliation.

**Architecture:** Preserve the existing Phase 07 provider and first-party billing boundaries. Add a stable commercial layer above historical offer identities, resolve paid/trial/free application access independently from raw Xendit status, inject capability checks into workspace write flows instead of coupling workspace directly to Xendit, and use Better Auth's Google social provider plus the existing guest-claim endpoint for OAuth transitions.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Better Auth 1.6.x, Drizzle ORM + Cloudflare D1, Xendit recurring subscriptions, Tailwind CSS v4 + shadcn primitives, Vitest, Cloudflare Vitest plugin, Playwright, Wrangler/vinext, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-30-found-calc-phase-07a-commercial-trial-google-auth-design.md`

## Global Constraints

- Start from branch `phase-07a-commercial-auth-amendment`, originally branched from completed Phase 07 `main` commit `8f19b1e13d20b0d896f65ecb6b5cedaa807b98b4`.
- Do not edit historical migrations `0001` through `0004`; Phase 07A starts with additive migration `0005_phase07a_commercial_auth_amendment.sql`.
- `@found-calc/engine` remains the only calculator arithmetic owner; do not add formula truth to billing/auth/workspace.
- `@found-calc/rules` remains the rule/version/effective-date authority.
- Keep public calculators and primary results free and usable without authentication.
- Preserve Phase 04 guest-state claim behavior through `/api/guest/claim` for both email/password and Google auth.
- Preserve historical Phase 07 offer/provider identities and webhook ordering/idempotency protections.
- Never authorize paid capability from browser checkout-return state.
- Public plan names are exactly `Friends`, `Besties`, `Family`.
- Current public prices are Friends Rp0; Besties Rp24.900/month or Rp199.000/year; Family Rp59.000/month or Rp499.000/year.
- Friends maximum Saved Calculations is 5; excess existing user-owned data is never deleted.
- Besties trial is exactly 14 × 24 hours, one-time, user-initiated, server-time authoritative, no card, no Xendit subscription.
- Normal cancellation disables future renewal but preserves already-paid entitlement until authoritative `paidThroughAt`/`accessUntil`.
- Widget and Portfolio are entitlement/availability contracts only in Phase 07A; do not build a rushed full widget or Portfolio runtime.
- ID/EN copy, keyboard accessibility, focus visibility, mobile no-overflow, privacy, and Rp0 fixed-infrastructure target remain required.
- Use Context7 at implementation time to re-check Better Auth Google provider APIs for the installed Better Auth version before editing auth configuration.
- Use TDD: failing test → confirm failure → minimal implementation → green → refactor → commit.

---

## File Structure Map

### Commercial and entitlement domain

- Modify `apps/web/src/lib/billing/contracts.ts` — preserve existing billing contracts and add commercial access/trial types.
- Create `apps/web/src/lib/billing/commercial.ts` — stable internal tier mapping, public names, limits, current-vs-legacy offer metadata, capability snapshot derivation.
- Modify `apps/web/src/lib/billing/plans.ts` — parse current and legacy offers without losing Phase 07 history compatibility.
- Modify `apps/web/src/lib/billing/entitlements.ts` — resolve effective paid access, trial access, Friends fallback, limits and capability keys.
- Create `apps/web/src/lib/billing/commercial.test.ts` — commercial mapping/limits/current-offer tests.
- Expand `apps/web/src/lib/billing/plans.test.ts` and `entitlements.test.ts` — regression and precedence tests.

### D1 and repositories

- Create `apps/web/migrations/0005_phase07a_commercial_auth_amendment.sql` — trial table and `paid_through_at` additive billing column/indexes.
- Modify `apps/web/src/lib/persistence/schema.ts` — Drizzle mapping for the additive fields/table.
- Modify `apps/web/src/lib/billing/repository.ts` — trial lifecycle, paid-through persistence, historical-paid detection.
- Expand Cloudflare/D1 repository tests in the existing billing test location(s).

### Billing HTTP

- Create `apps/web/src/lib/billing/trial-http.ts` — authenticated trial activation handler isolated from the already-large Phase 07 billing HTTP file.
- Create `apps/web/src/lib/billing/trial-http.test.ts` — trial API behavior.
- Modify `apps/web/src/lib/billing/http.ts` — status payload effective access, cancellation paid-through behavior, current-offer checkout validation.
- Modify `apps/web/src/lib/billing/route-services.ts` — expose trial/commercial repository dependencies.
- Create `apps/web/src/app/api/billing/trial/route.ts` — `POST` Besties trial activation.
- Keep existing checkout/status/subscription/webhook route paths stable.

### Auth

- Modify `apps/web/src/lib/auth/server.ts` — Google social provider config from server-only env.
- Modify `apps/web/src/components/auth/auth-panel.tsx` — `Continue with Google`, post-OAuth guest claim and safe return.
- Create `apps/web/src/lib/auth/redirect.ts` and `redirect.test.ts` — same-origin/locale-safe callback target validation.
- Modify `apps/web/src/app/[locale]/(public)/auth/page.tsx` only if query/return context must be passed to `AuthPanel`.
- Modify `apps/web/.dev.vars.example` and generated Worker env typing source as required — placeholders only, never secrets.

### Workspace capability enforcement

- Modify `apps/web/src/lib/workspace/http.ts` — consume a narrow injected capability authorizer for create/save operations.
- Modify `apps/web/src/lib/workspace/repository.ts` — count user-owned calculations and active Goal/Project records as needed.
- Modify `apps/web/src/lib/workspace/route-services.ts` — compose commercial capability resolver with the existing workspace service boundary.
- Expand `apps/web/src/lib/workspace/*.test.ts` — Friends limits and paid/trial bypass tests.

### UI

- Create `apps/web/src/app/[locale]/(public)/pricing/page.tsx` — public Pricing entry.
- Create `apps/web/src/components/billing/pricing-panel.tsx` — Friends/Besties/Family cards, trial CTA, feature comparison, Widget/Portfolio availability labels.
- Modify `apps/web/src/components/billing/billing-panel.tsx` — current tier/trial/cancellation paid-through messaging and new public names.
- Modify `apps/web/src/app/[locale]/(workspace)/workspace/billing/page.tsx` — remove Phase-number UI language and use production copy.

### Verification/docs

- Create `scripts/verify-phase-07a.mjs` — call `verify:phase07` first, then Phase 07A-specific gates.
- Modify root `package.json` — add `verify:phase07a`.
- Add/modify `.github/workflows/phase-07a-verification.yml` and later baseline-artifact workflow only when implementation is complete.
- Create `docs/verification/phase-07a-verification.md` at closure.
- Update `BASELINE.md` and `PHASE_HANDOFF.md` only after all gates pass.

---

### Task 1: Baseline Lock and Commercial Domain Contract

**Files:**
- Create: `apps/web/src/lib/billing/commercial.ts`
- Create: `apps/web/src/lib/billing/commercial.test.ts`
- Modify: `apps/web/src/lib/billing/contracts.ts`

**Interfaces:**
- Produces `type CommercialTier = "friends" | "besties" | "family"`.
- Produces `type InternalPaidTier = "pro" | "business"` for historical compatibility.
- Produces `publicPlanName(tier: CommercialTier): "Friends" | "Besties" | "Family"`.
- Produces `commercialLimitsFor(tier: CommercialTier): CommercialLimits`.
- Produces `internalPaidTierToCommercialTier(tier: InternalPaidTier): "besties" | "family"`.
- Later tasks consume these functions instead of comparing public display strings.

- [ ] **Step 1: Run the untouched Phase 07 verifier before implementation**

Run:

```bash
pnpm install --frozen-lockfile
pnpm verify:phase07
```

Expected: PASS. If it fails before Phase 07A code changes, stop and use `superpowers:systematic-debugging`; do not normalize a broken baseline.

- [ ] **Step 2: Write the failing commercial contract tests**

Create tests equivalent to:

```ts
import { describe, expect, it } from "vitest";
import {
  commercialLimitsFor,
  internalPaidTierToCommercialTier,
  publicPlanName,
} from "./commercial";

describe("Phase 07A commercial model", () => {
  it("uses the approved public names", () => {
    expect(publicPlanName("friends")).toBe("Friends");
    expect(publicPlanName("besties")).toBe("Besties");
    expect(publicPlanName("family")).toBe("Family");
  });

  it("keeps historical paid-family mapping separate from public naming", () => {
    expect(internalPaidTierToCommercialTier("pro")).toBe("besties");
    expect(internalPaidTierToCommercialTier("business")).toBe("family");
  });

  it("caps Friends persistence and distribution without deleting data", () => {
    expect(commercialLimitsFor("friends")).toMatchObject({
      savedCalculations: 5,
      activeGoals: 1,
      activeProjects: 1,
      widgetDomains: 1,
    });
  });

  it("keeps Besties and Family operationally distinct", () => {
    expect(commercialLimitsFor("besties").portfolioEnabled).toBe(false);
    expect(commercialLimitsFor("family").portfolioEnabled).toBe(true);
    expect(commercialLimitsFor("family").teamSeats).toBe(2);
  });
});
```

- [ ] **Step 3: Run the focused test and confirm failure**

Run:

```bash
pnpm --filter @found-calc/web test:unit -- apps/web/src/lib/billing/commercial.test.ts
```

Expected: FAIL because `commercial.ts` and its exports do not yet exist.

- [ ] **Step 4: Implement the minimal commercial layer**

Implement focused immutable constants/types. Do not import Xendit into this file. Use `null` for unlimited numerical limits rather than magic large numbers.

Required shape:

```ts
export type CommercialTier = "friends" | "besties" | "family";
export type InternalPaidTier = "pro" | "business";

export type CommercialLimits = {
  readonly savedCalculations: number | null;
  readonly activeGoals: number | null;
  readonly activeProjects: number | null;
  readonly widgetDomains: number;
  readonly teamSeats: number;
  readonly removeWidgetBranding: boolean;
  readonly whiteLabelWidgets: boolean;
  readonly portfolioEnabled: boolean;
};
```

Encode Friends = 5/1/1/1, Besties = unlimited/unlimited/unlimited/3, Family = unlimited/unlimited/unlimited/10 initially with 2 seats and Portfolio.

- [ ] **Step 5: Run tests and commit**

Run:

```bash
pnpm --filter @found-calc/web test:unit -- apps/web/src/lib/billing/commercial.test.ts
```

Expected: PASS.

Commit:

```bash
git add apps/web/src/lib/billing/contracts.ts apps/web/src/lib/billing/commercial.ts apps/web/src/lib/billing/commercial.test.ts
git commit -m "feat(billing): add Phase 07A commercial tier contract"
```

---

### Task 2: Version Current Offers Without Breaking Legacy Phase 07 Offers

**Files:**
- Modify: `apps/web/src/lib/billing/plans.ts`
- Modify: `apps/web/src/lib/billing/plans.test.ts`
- Modify later verifier fixture: `scripts/verify-phase-07a.mjs`

**Interfaces:**
- `getBillingPlan(plans, planId)` remains available.
- Add `getCurrentCheckoutPlans(plans)` returning only approved current offers.
- Add offer metadata that maps every legacy/current offer ID to stable internal paid tier `pro` or `business`.
- Historical IDs `pro-monthly`, `pro-annual`, `business-monthly`, `business-annual` remain parseable/reconcilable.

- [ ] **Step 1: Add failing tests for legacy + current offer coexistence**

Test explicit current IDs rather than mutating historical coordinates. Use:

```text
pro-monthly-2026a       → Besties → 24_900 → 1 month
pro-annual-2026a        → Besties → 199_000 → 12 months
business-monthly-2026a  → Family  → 59_000 → 1 month
business-annual-2026a   → Family  → 499_000 → 12 months
```

Keep the four existing Phase 07 IDs and old prices as legacy definitions accepted for reconciliation, but never returned by `getCurrentCheckoutPlans`.

Add assertions:

```ts
expect(getCurrentCheckoutPlans(plans).map((plan) => plan.id)).toEqual([
  "pro-monthly-2026a",
  "pro-annual-2026a",
  "business-monthly-2026a",
  "business-annual-2026a",
]);
expect(offerInternalTier("pro-monthly")).toBe("pro");
expect(offerInternalTier("pro-monthly-2026a")).toBe("pro");
```

- [ ] **Step 2: Run and confirm failure**

Run:

```bash
pnpm --filter @found-calc/web test:unit -- apps/web/src/lib/billing/plans.test.ts
```

Expected: FAIL on unknown current offer IDs/functions.

- [ ] **Step 3: Replace the single hard-coded V1 registry with explicit legacy/current registries**

Do not change legacy records in D1. Do not use display name as identity. Current display names are Besties/Family while legacy parser still accepts old Pro/Business display values for historical configuration if required by existing tests/reconciliation.

Ensure checkout code later receives only current offers.

- [ ] **Step 4: Add fail-closed tests**

Reject:

- current offer with wrong amount;
- current offer with wrong interval count;
- unknown offer ID;
- duplicate offer IDs;
- public display name mismatch for current offer;
- legacy offer accidentally included in current checkout list.

- [ ] **Step 5: Run focused billing tests and commit**

Run:

```bash
pnpm --filter @found-calc/web test:unit -- apps/web/src/lib/billing/plans.test.ts apps/web/src/lib/billing/contracts.test.ts
```

Commit:

```bash
git add apps/web/src/lib/billing/plans.ts apps/web/src/lib/billing/plans.test.ts
git commit -m "feat(billing): version current Friends Besties Family offers"
```

---

### Task 3: Additive D1 Trial and Paid-Through Schema

**Files:**
- Create: `apps/web/migrations/0005_phase07a_commercial_auth_amendment.sql`
- Modify: `apps/web/src/lib/persistence/schema.ts`
- Modify: Cloudflare/D1 migration tests used by Phase 07

**Interfaces:**
- Add `billing_subscription.paid_through_at INTEGER NULL`.
- Add first-party trial table `billing_trial` with one row per user/trial kind.
- Repository task consumes the Drizzle exports `billingTrials` and updated `billingSubscriptions.paidThroughAt`.

- [ ] **Step 1: Write a migration test that applies 0001→0005 to an existing Phase 07-shaped database**

Seed before 0005:

- one existing user;
- one active legacy `pro-monthly` subscription;
- one workspace goal/project/calculation;
- one rule version.

After applying 0005 assert all old rows remain and the new schema exists.

- [ ] **Step 2: Run migration test and confirm failure**

Expected: FAIL because migration 0005 does not exist.

- [ ] **Step 3: Create the additive SQL migration**

Use additive SQL equivalent to:

```sql
ALTER TABLE billing_subscription ADD COLUMN paid_through_at INTEGER;

CREATE TABLE IF NOT EXISTS billing_trial (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  trial_tier TEXT NOT NULL CHECK (trial_tier = 'besties'),
  started_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  converted_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  CHECK (ends_at > started_at)
);
CREATE INDEX IF NOT EXISTS billing_trial_ends_idx ON billing_trial(ends_at);
```

The user primary key provides one-time consumption. Do not add a delete-and-recreate migration.

- [ ] **Step 4: Mirror the schema in Drizzle**

Add `paidThroughAt` to `billingSubscriptions` and a focused `billingTrials` table export. Do not add the trial table to `authSchema`; it belongs to billing/persistence, not Better Auth.

- [ ] **Step 5: Run migration + typecheck and commit**

Run:

```bash
pnpm --filter @found-calc/web test:cloudflare
pnpm --filter @found-calc/web typecheck
```

Commit:

```bash
git add apps/web/migrations/0005_phase07a_commercial_auth_amendment.sql apps/web/src/lib/persistence/schema.ts apps/web/tests
 git commit -m "feat(billing): add Besties trial and paid-through schema"
```

---

### Task 4: Trial Repository and Eligibility Rules

**Files:**
- Modify: `apps/web/src/lib/billing/repository.ts`
- Add/modify: billing repository Cloudflare tests

**Interfaces:**
- Add `getTrialForUser(userId): Promise<BillingTrialRecord | null>`.
- Add `startBestiesTrial(userId, nowMs): Promise<{ started: boolean; trial: BillingTrialRecord }>` with an atomic insert / conflict-safe result.
- Add `hasHistoricalPaidSubscription(userId): Promise<boolean>`.
- Add `markTrialConverted(userId, nowMs): Promise<void>`.
- Trial record exposes `startedAt`, `endsAt`, `convertedAt`.

- [ ] **Step 1: Write failing D1 tests**

Cover:

- first start creates `endsAt = startedAt + 14 * 24 * 60 * 60 * 1000`;
- second start cannot reset/extend the row;
- concurrent duplicate attempts resolve to one persisted trial;
- historical paid user is ineligible;
- converted trial remains consumed permanently;
- database/server timestamp input is explicit and testable.

- [ ] **Step 2: Confirm failures**

Run the focused Cloudflare billing repository test file.

- [ ] **Step 3: Implement atomic repository behavior**

Use D1/Drizzle uniqueness on `user_id`; never implement one-time trial solely as `SELECT` followed by an unguarded insert. Return the persisted existing record on conflict so duplicate calls are deterministic.

- [ ] **Step 4: Run focused tests and commit**

Commit:

```bash
git add apps/web/src/lib/billing/repository.ts apps/web/tests
 git commit -m "feat(billing): persist one-time Besties trials"
```

---

### Task 5: Effective Entitlement Resolver — Paid, Cancelled-Paid-Through, Trial, Friends

**Files:**
- Modify: `apps/web/src/lib/billing/contracts.ts`
- Modify: `apps/web/src/lib/billing/entitlements.ts`
- Modify: `apps/web/src/lib/billing/entitlements.test.ts`

**Interfaces:**
- Replace the old `status === "active"`-only assumption with an input object that includes paid tier, subscription status, `paidThroughAt`, trial timestamps, and `now`.
- Preserve the existing `keys` snapshot for compatibility while adding `tier`, `source`, and `limits`.

Required result shape:

```ts
type EffectiveCommercialAccess = {
  readonly tier: "friends" | "besties" | "family";
  readonly source: "friends" | "trial" | "paid";
  readonly keys: readonly string[];
  readonly limits: CommercialLimits;
  readonly accessUntil: number | null;
};
```

- [ ] **Step 1: Write failing precedence tests**

Test:

1. active Family paid > active Besties trial;
2. active Besties paid > trial;
3. inactive-after-cancel Besties with `paidThroughAt > now` still resolves Besties/paid;
4. same record with `paidThroughAt <= now` resolves Friends;
5. active trial resolves Besties/trial;
6. expired trial resolves Friends;
7. pending checkout does not affect resolver;
8. Friends limit snapshot = 5 saves / 1 Goal / 1 Project / 1 widget domain.

- [ ] **Step 2: Confirm old resolver fails the paid-through and trial cases**

Run:

```bash
pnpm --filter @found-calc/web test:unit -- apps/web/src/lib/billing/entitlements.test.ts
```

- [ ] **Step 3: Implement the pure resolver**

Keep this function deterministic and free of database/network access. Pass `now` explicitly from callers/tests.

- [ ] **Step 4: Run tests and commit**

```bash
git add apps/web/src/lib/billing/contracts.ts apps/web/src/lib/billing/entitlements.ts apps/web/src/lib/billing/entitlements.test.ts
git commit -m "feat(billing): resolve paid trial and Friends access"
```

---

### Task 6: Besties Trial HTTP Endpoint and Billing Status Integration

**Files:**
- Create: `apps/web/src/lib/billing/trial-http.ts`
- Create: `apps/web/src/lib/billing/trial-http.test.ts`
- Create: `apps/web/src/app/api/billing/trial/route.ts`
- Modify: `apps/web/src/lib/billing/route-services.ts`
- Modify: `apps/web/src/lib/billing/http.ts`
- Modify: `apps/web/src/lib/billing/http.test.ts`

**Interfaces:**
- `POST /api/billing/trial` requires authenticated user, empty JSON body, eligible verified identity, and returns effective trial dates.
- It never calls Xendit.
- `GET /api/billing/status` retains existing Phase 07 fields and adds effective commercial access/trial information additively.

- [ ] **Step 1: Write failing trial HTTP tests**

Cases:

- anonymous → 401;
- malformed/non-empty body → 400;
- eligible authenticated user → 201 with `tier: "besties"`, source trial, server dates;
- duplicate activation → 409 or deterministic already-consumed response, but never extends end date;
- historical paid user → 409 `trial-not-eligible`;
- unverified local identity → 409 `trial-not-eligible`;
- Xendit mock call count remains zero.

- [ ] **Step 2: Implement trial handler with a narrow dependency interface**

Do not import global env or instantiate repository inside the pure handler. Follow existing Phase 07 `BillingHttpServices` testability style.

- [ ] **Step 3: Add the App Router route**

The route obtains configured services from the existing route-service composition and delegates to the pure handler.

- [ ] **Step 4: Expand billing status payload additively**

Example additive shape:

```json
{
  "billing": {
    "subscription": {},
    "entitlements": [],
    "commercial": {
      "tier": "besties",
      "source": "trial",
      "accessUntil": 0,
      "limits": {}
    },
    "trial": {
      "startedAt": 0,
      "endsAt": 0,
      "eligible": false
    }
  }
}
```

Do not remove Phase 07 response fields used by existing UI/tests.

- [ ] **Step 5: Run billing unit tests and commit**

```bash
pnpm --filter @found-calc/web test:unit -- apps/web/src/lib/billing/trial-http.test.ts apps/web/src/lib/billing/http.test.ts
```

Commit:

```bash
git add apps/web/src/lib/billing apps/web/src/app/api/billing/trial
git commit -m "feat(billing): add no-card Besties trial endpoint"
```

---

### Task 7: Preserve Paid Access Through Cancellation Period End

**Files:**
- Modify: `apps/web/src/lib/billing/repository.ts`
- Modify: `apps/web/src/lib/billing/http.ts`
- Modify: `apps/web/src/lib/billing/http.test.ts`
- Modify only as required: `apps/web/src/lib/xendit/webhooks.ts` and its tests

**Interfaces:**
- `markCancellationRequested` additionally freezes authoritative paid-through boundary from the current known cycle/renewal boundary.
- Webhook inactivation does not clear `paidThroughAt` for a user-requested cancellation.
- Entitlement resolver from Task 5 uses `paidThroughAt` after provider status becomes inactive.

- [ ] **Step 1: Add failing cancellation tests**

Required assertions:

```text
active Besties, nextCycleAt future
→ cancel request
→ Xendit deactivate called once
→ cancellationRequestedAt set
→ paidThroughAt set to authoritative current-period end
→ provider inactivation webhook arrives
→ effective access remains Besties before paidThroughAt
→ effective access becomes Friends at/after paidThroughAt
```

Also cover monthly, annual, duplicate cancel, delayed/duplicate webhook, cancellation near renewal, no automatic refund call, and re-subscribe after expiry.

- [ ] **Step 2: Confirm current Phase 07 behavior fails the entitlement-after-inactivation case**

- [ ] **Step 3: Implement repository/http changes without weakening webhook ordering**

Never derive paid-through from browser clock. Prefer already-reconciled `nextCycleAt`/cycle boundary. If authoritative paid-through cannot be determined, fail safely rather than inventing a period.

- [ ] **Step 4: Run all billing tests and commit**

```bash
pnpm --filter @found-calc/web test:unit -- apps/web/src/lib/billing
pnpm --filter @found-calc/web test:cloudflare
```

Commit:

```bash
git add apps/web/src/lib/billing apps/web/src/lib/xendit
git commit -m "fix(billing): preserve paid access after cancellation"
```

---

### Task 8: Google Sign-In Configuration Through Better Auth

**Files:**
- Modify: `apps/web/src/lib/auth/server.ts`
- Modify: `apps/web/.dev.vars.example`
- Modify generated/runtime Worker env typing source only as required by existing project convention
- Add auth configuration tests in the existing unit/foundation location

**Interfaces:**
- `FoundCalcAuthOptions` gains optional Google credentials or a focused provider config.
- Server env reads `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` only server-side.
- Existing email/password and admin plugin remain unchanged.

- [ ] **Step 1: Re-query Context7 for installed Better Auth 1.6.x Google docs**

Confirm at implementation time:

- `socialProviders.google` option names;
- callback URI semantics for current `baseURL` + `/api/auth/[...all]` mount;
- trusted-origin/account-linking guidance.

Record the relevant docs/version in the Phase 07A verification doc later.

- [ ] **Step 2: Write failing auth configuration tests**

Assert:

- no Google config when either credential is absent;
- Google provider config appears when both are supplied;
- email/password remains enabled;
- real secrets are never exposed to browser config.

- [ ] **Step 3: Implement Better Auth Google provider config**

Use a conditional object equivalent to:

```ts
socialProviders: options.google
  ? { google: { clientId: options.google.clientId, clientSecret: options.google.clientSecret } }
  : undefined
```

Do not hand-roll OAuth routes.

- [ ] **Step 4: Add environment placeholders**

Add only:

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

to `.dev.vars.example` with comments explaining server-only secrets and Google Console redirect setup. Never commit actual values.

- [ ] **Step 5: Typecheck/tests and commit**

```bash
pnpm --filter @found-calc/web test:unit
pnpm --filter @found-calc/web typecheck
```

Commit:

```bash
git add apps/web/src/lib/auth/server.ts apps/web/.dev.vars.example apps/web/src
 git commit -m "feat(auth): configure Google sign-in with Better Auth"
```

---

### Task 9: Google Auth UI, Safe Return URL, and Guest Draft Claim

**Files:**
- Create: `apps/web/src/lib/auth/redirect.ts`
- Create: `apps/web/src/lib/auth/redirect.test.ts`
- Modify: `apps/web/src/components/auth/auth-panel.tsx`
- Modify as necessary: `apps/web/src/app/[locale]/(public)/auth/page.tsx`
- Add Playwright coverage for Google callback/guest claim using an auth-provider stub or supported test seam; do not depend on live Google in CI.

**Interfaces:**
- `safeAuthReturnTo(value, locale): string` accepts only an internal locale-safe path.
- Google button calls `authClient.signIn.social({ provider: "google", callbackURL })`.
- OAuth callback returns to Found Calc auth transition state, runs the existing `/api/guest/claim`, then navigates to validated `returnTo`.

- [ ] **Step 1: Write redirect helper tests**

Accept examples:

```text
/id/calculators/reference.discount
/en/workspace
```

Reject/fallback examples:

```text
https://evil.example
//evil.example
javascript:alert(1)
/en/../api/private
```

Fallback should be `/${locale}/workspace` or the existing safe product landing path.

- [ ] **Step 2: Write failing AuthPanel tests / browser contract tests**

Cover:

- visible `Continue with Google` control;
- accessible name and keyboard activation;
- social sign-in uses provider `google`;
- callback URL stays same-origin and locale-aware;
- after social session exists, guest claim runs exactly as email/password flow;
- claim failure exposes retry rather than silently discarding guest state.

- [ ] **Step 3: Refactor shared authenticated transition instead of duplicating guest-claim logic**

Keep one `claimGuestDrafts()`/finish pathway for email and social transitions. For OAuth, use callback state/query + an effect guarded against repeated execution.

- [ ] **Step 4: Add non-live-Google Playwright path**

Test the Found Calc side of callback/session/claim with a controlled Better Auth/test seam. Live Google credentials must not be required in GitHub Actions.

- [ ] **Step 5: Run tests and commit**

```bash
pnpm --filter @found-calc/web test:unit -- apps/web/src/lib/auth/redirect.test.ts
pnpm --filter @found-calc/web test:e2e
```

Commit:

```bash
git add apps/web/src/lib/auth apps/web/src/components/auth apps/web/src/app/[locale]/\(public\)/auth apps/web/tests
git commit -m "feat(auth): preserve guest context through Google sign-in"
```

---

### Task 10: Enforce Friends Workspace Limits Through an Injected Capability Boundary

**Files:**
- Modify: `apps/web/src/lib/workspace/http.ts`
- Modify: `apps/web/src/lib/workspace/repository.ts`
- Modify: `apps/web/src/lib/workspace/route-services.ts`
- Modify: `apps/web/src/lib/workspace/http.test.ts`
- Modify/add: workspace Cloudflare repository tests

**Interfaces:**
- Add narrow `WorkspaceCapabilityAuthorizer`, for example:

```ts
export interface WorkspaceCapabilityAuthorizer {
  getLimits(userId: string, now?: Date): Promise<{
    savedCalculations: number | null;
    activeGoals: number | null;
    activeProjects: number | null;
  }>;
}
```

- Workspace HTTP consumes this interface; it must not import Xendit.
- Repository exposes count methods for user-owned calculations and active Goal/Project records.

- [ ] **Step 1: Write failing HTTP tests**

Friends:

- create active Goal #1 succeeds; #2 fails with capability-limit response;
- create active Project #1 succeeds; #2 fails;
- save calculation #1–5 succeeds; #6 fails;
- if historical count is already 20, all 20 remain readable and new save is blocked.

Besties trial/paid and Family:

- unlimited save/Goal/Project paths continue succeeding.

- [ ] **Step 2: Write failing repository count tests**

Count only the correct user's owned records and appropriate active status. Do not count another user's rows.

- [ ] **Step 3: Implement injected authorization**

Do capability check immediately before the write, then rely on repository transaction/serialized behavior as appropriate to prevent easy limit bypass under concurrent requests. If D1 transaction semantics require a different atomic pattern, document and test it rather than trusting UI counts.

- [ ] **Step 4: Preserve downgrade data**

Do not implement deletion. Limit creation/activation only. Existing read endpoints must continue returning user-owned records.

- [ ] **Step 5: Run full workspace tests and commit**

```bash
pnpm --filter @found-calc/web test:unit -- apps/web/src/lib/workspace
pnpm --filter @found-calc/web test:cloudflare
```

Commit:

```bash
git add apps/web/src/lib/workspace apps/web/tests
git commit -m "feat(workspace): enforce Friends persistence limits"
```

---

### Task 11: Pricing and Billing UI for Friends / Besties / Family

**Files:**
- Create: `apps/web/src/app/[locale]/(public)/pricing/page.tsx`
- Create: `apps/web/src/components/billing/pricing-panel.tsx`
- Modify: `apps/web/src/components/billing/billing-panel.tsx`
- Modify: `apps/web/src/app/[locale]/(workspace)/workspace/billing/page.tsx`
- Add/modify Playwright accessibility/mobile coverage

**Interfaces:**
- Pricing panel uses public commercial constants, never provider secret config.
- Trial CTA calls `POST /api/billing/trial` when authenticated; if anonymous, route through auth while preserving return target.
- Checkout uses current offer IDs only.

- [ ] **Step 1: Write browser assertions before UI implementation**

For both ID and EN verify:

- Friends / Besties / Family visible;
- Friends says Rp0 and 5 Saved Calculations;
- Besties shows Rp24.900 monthly and Rp199.000 annual;
- Family shows Rp59.000 monthly and Rp499.000 annual;
- Besties trial CTA says 14 days and does not request card details;
- `Calculate / Plan / Operate` hierarchy is present;
- Friends widget attribution contract, Besties 3-domain contract, Family 10+/white-label contract are described as availability/entitlement, not falsely active runtime;
- Family Portfolio is labeled as a Family differentiator with runtime availability state where needed;
- cancellation copy explains paid-through access and data retention;
- 390px viewport has no horizontal overflow;
- keyboard/focus order is usable.

- [ ] **Step 2: Confirm tests fail because pricing route/UI do not exist**

- [ ] **Step 3: Implement restrained production UI**

Use Found Calc semantic tokens, Space Grotesk, existing Button/card primitives, and no generic neon/AI SaaS treatment. Annual may be visually emphasized, but monthly remains explicit and selectable.

- [ ] **Step 4: Update BillingPanel status language**

Display public plan name based on commercial tier, trial dates when trial source is active, and `Cancels on <date>`/paid-through messaging rather than exposing raw provider status as the primary user label.

- [ ] **Step 5: Run Playwright + unit tests and commit**

```bash
pnpm --filter @found-calc/web test:e2e
pnpm --filter @found-calc/web test:unit
```

Commit:

```bash
git add apps/web/src/app apps/web/src/components/billing apps/web/tests
git commit -m "feat(pricing): present Friends Besties and Family"
```

---

### Task 12: Phase 07A Verification Gate

**Files:**
- Create: `scripts/verify-phase-07a.mjs`
- Modify: `package.json`
- Create: `.github/workflows/phase-07a-verification.yml`

**Interfaces:**
- `pnpm verify:phase07a` must run the complete existing `verify:phase07` gate before Phase 07A-specific checks.

- [ ] **Step 1: Add the root script**

Add:

```json
"verify:phase07a": "node scripts/verify-phase-07a.mjs"
```

without removing existing phase scripts.

- [ ] **Step 2: Implement fail-fast verifier**

The first step must be:

```text
pnpm verify:phase07
```

Then Phase 07A-specific steps must include at minimum:

```text
commercial/billing/auth/workspace unit tests
Cloudflare D1 tests
lint
typecheck
Playwright
Next build
vinext check
vinext build
```

Set deterministic synthetic current + legacy billing-plan configuration and non-secret Google test placeholders where tests need provider configuration. Do not use real provider credentials.

- [ ] **Step 3: Add GitHub Actions workflow**

Mirror Phase 07's reliable Node/pnpm/Cloudflare setup rather than inventing a new CI stack. Ensure secrets are not required for deterministic tests.

- [ ] **Step 4: Run locally / through available execution environment**

Run:

```bash
pnpm verify:phase07a
```

Expected: PASS including Phase 01–07 inherited regression.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/verify-phase-07a.mjs .github/workflows/phase-07a-verification.yml
git commit -m "ci(phase07a): add amendment regression gate"
```

---

### Task 13: Documentation, Closure, PR, and Portable Handoff

**Files:**
- Create: `docs/verification/phase-07a-verification.md`
- Update: `BASELINE.md`
- Update: `PHASE_HANDOFF.md`
- Create: `.github/workflows/phase-07a-baseline-artifact.yml`
- Do not modify implementation after final verification except closure metadata; if code changes, rerun verification.

**Interfaces:**
- Canonical portable artifact name: `found-calc-phase-07a-commercial-auth-amendment.zip`.
- Next recommended implementation phase: `Phase 07B — Widget Platform Foundation`.

- [ ] **Step 1: Run the complete final verification with fresh evidence**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test:engine
pnpm test:rules
pnpm test:catalog
pnpm verify:phase07
pnpm verify:phase07a
pnpm build
pnpm --filter @found-calc/web vinext:check
pnpm --filter @found-calc/web build:vinext
```

Record exact commands/results and current commit SHA.

- [ ] **Step 2: Write verification record**

Include evidence for:

- legacy Phase 07 offer reconciliation;
- current prices;
- trial one-time/no-Xendit behavior;
- Google configuration and non-live CI strategy;
- guest claim after Google auth;
- Friends 5-save limit and no-deletion downgrade behavior;
- cancellation paid-through access;
- migrations 0001→0005;
- ID/EN/accessibility/mobile;
- complete Phase 01–07 regression.

- [ ] **Step 3: Update baseline/handoff without erasing Phase 07 provenance**

`BASELINE.md` must say last canonical completed phase is Phase 07A only after all gates pass. Preserve the Phase 07 merge/provenance history. `PHASE_HANDOFF.md` should point to Phase 07B Widget Platform Foundation before Phase 08 unless a later explicit decision defers 07B.

- [ ] **Step 4: Add canonical artifact workflow**

Follow the existing Phase 07 artifact pattern:

- `git archive` exact merged SHA;
- generate `SHA256SUMS`;
- verify ZIP integrity/extraction;
- include required source/docs/migrations/tests;
- exclude secrets, local state, `node_modules`, `.next`.

- [ ] **Step 5: Use `superpowers:verification-before-completion`**

Do not claim completion based on prior runs. Inspect fresh output.

- [ ] **Step 6: Use `superpowers:requesting-code-review`**

Review the final diff specifically for accidental Phase 01–06 changes, public/internal plan-name confusion, raw Xendit status being used as entitlement, trial reactivation loopholes, OAuth open redirects/account-linking weakening, and destructive downgrade behavior.

- [ ] **Step 7: Open PR only after verification is green**

Suggested PR title:

```text
Phase 07A — Commercial, Trial & Google Auth Amendment
```

PR body must state that Phase 07 was already completed and this is an additive amendment preserving Phase 01–07 regression contracts.

- [ ] **Step 8: Merge only after required checks pass**

After merge, verify the artifact workflow and exact merged provenance. Do not start Phase 07B or Phase 08 in the same implementation chat.

---

## Plan Self-Review

### Spec coverage

- Friends/Besties/Family naming and pricing → Tasks 1, 2, 11.
- Legacy Phase 07 compatibility → Tasks 1, 2, 7, 12.
- Besties 14-day trial → Tasks 3–6, 11.
- Google Better Auth → Tasks 8–9.
- Guest-state preservation → Task 9.
- Friends 5 Saved / 1 Goal / 1 Project → Task 10.
- Cancellation paid-through behavior → Tasks 3, 5, 7.
- Widget entitlement contract / no rushed runtime → Tasks 1, 11.
- Family Portfolio entitlement / availability separation → Tasks 1, 11.
- Additive migration → Task 3.
- Regression and canonical handoff → Tasks 12–13.

### Type consistency

- `CommercialTier` is defined once in Task 1 and reused by later tasks.
- Historical internal paid families remain `pro`/`business`; public names are never provider identity.
- `CommercialLimits` is the single structured limit snapshot consumed by entitlement and workspace authorization.
- `paidThroughAt` is the single application paid-period boundary named consistently across schema/repository/resolver/UI.

### Scope

The plan intentionally does not build Widget Platform runtime or Portfolio runtime. Those remain Phase 07B / later product work. No Phase 08 calculator catalog work is included.

## Execution Handoff

Implementation must occur in a new Found Calc project chat, per the established phase workflow. The execution chat must first read this plan and its spec, inspect current branch/main state, then use `superpowers:using-git-worktrees` before implementation and `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to execute task-by-task.
