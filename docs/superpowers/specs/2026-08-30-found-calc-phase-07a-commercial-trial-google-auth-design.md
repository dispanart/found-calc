# Found Calc Phase 07A — Commercial, Trial & Google Auth Amendment Design

**Status:** Design candidate for user review  
**Date:** 2026-08-30  
**Base:** completed Phase 07 on `main` at `8f19b1e13d20b0d896f65ecb6b5cedaa807b98b4`  
**Branch:** `phase-07a-commercial-auth-amendment`

## 1. Purpose

Phase 07 is already complete and merged. Phase 07A is an additive amendment that updates Found Calc commercial presentation and entitlement behavior without rewriting Phase 01–07 foundations.

Phase 07A introduces:

- public plan names **Friends**, **Besties**, **Family**;
- new current Besties and Family prices;
- a one-time 14-day Besties trial with no card and no Xendit subscription;
- Google sign-in through the existing Better Auth stack;
- Friends persistence limits, including maximum 5 Saved Calculations;
- cancellation semantics that preserve already-paid access through the paid-through date;
- commercial entitlement contracts for the Widget Platform;
- Family-only Portfolio entitlement as the primary product distinction from Besties;
- compatibility rules so existing Phase 07 `pro-*` and `business-*` provider/database identities remain reconcilable.

This amendment MUST preserve Phase 01–06 deterministic calculation, rule, persistence, guest-migration, Goal, Project, Profile, Workspace, Admin, and security contracts.

## 2. Non-Goals

Phase 07A does NOT:

- redesign `@found-calc/engine`;
- duplicate formula truth in billing/auth code;
- change `@found-calc/rules` version/effective-date/publication semantics;
- rewrite Phase 04 guest-state preservation;
- rewrite Goal/Project/Profile data models;
- build the full Widget Platform runtime;
- build the full Family Portfolio runtime;
- build Phase 08 catalog calculators;
- replace Xendit;
- replace email/password authentication;
- edit historical SQL migrations 0001–0004;
- rewrite historical provider plan identities.

## 3. Existing Baseline That Must Remain Intact

### 3.1 Phase 02 calculation truth

`@found-calc/engine` remains the only owner of calculator arithmetic. Billing, trial, auth, pricing, widget, Portfolio, and entitlement code may consume capability state but may never own or reinterpret formula truth.

### 3.2 Phase 04 auth and guest context

Found Calc remains **Calculate first. Account later.** Google authentication MUST use the same guest-to-user preservation path as email/password. Authentication method must not determine whether a calculation can be migrated or saved.

### 3.3 Phase 05 rule truth

`@found-calc/rules` remains authoritative for immutable version/effective-date/publication semantics. Commercial tiers must not override regulatory, marketplace, fiqh, or dynamic-data truth.

### 3.4 Phase 06 workspace truth

Goals, Projects, Profiles, checkpoints, provenance, and reusable context remain first-party user data. Downgrades and trial expiry may restrict capabilities but MUST NOT delete user-owned data.

### 3.5 Phase 07 billing truth

First-party D1 billing state remains the application authorization/entitlement truth. Xendit remains the payment/subscription processor. Checkout return URLs remain informational and cannot grant paid capability. Provider webhooks remain authoritative for paid lifecycle transitions. Existing idempotency, ordering, stale-event protection, provider-identity validation, and pending-plan-change safeguards remain required.

## 4. Public Commercial Model

| Public tier | Positioning | Price |
| --- | --- | --- |
| **Friends** | Calculate | Rp0 |
| **Besties** | Plan | Rp24.900/month or Rp199.000/year |
| **Family** | Operate | Rp59.000/month or Rp499.000/year |

Approved spelling and capitalization:

- `Friends`
- `Besties`
- `Family`

`Besties` is intentionally informal brand language and is not treated as a typo.

### 4.1 Pricing principles

- all public calculators and primary results remain available to Friends;
- paid value is continuity, depth, workflow, distribution, and operating scale;
- annual plans may be visually encouraged while monthly remains easy to choose;
- no calculator-result login wall;
- no hidden automatic trial conversion;
- no dark-pattern cancellation;
- launch pricing is displayed in IDR.

## 5. Internal Commercial Compatibility

Public tier naming MUST be separated from provider/database commercial identity.

Existing Phase 07 code and historical data use offer identifiers such as:

- `pro-monthly`
- `pro-annual`
- `business-monthly`
- `business-annual`

These identities MUST NOT be globally renamed.

The architecture separates:

1. **internal tier family** — stable capability identity;
2. **offer identity** — a specific current or legacy purchasable coordinate;
3. **public display name** — Friends/Besties/Family.

Conceptual compatibility mapping:

```text
free/base     → Friends
pro           → Besties
business      → Family
```

Historical provider references remain untouched. New pricing SHOULD be represented as a versioned/current offer set or another model that keeps legacy offers readable and reconcilable.

Required behavior:

- legacy Phase 07 subscriptions resolve to the correct capability family;
- legacy webhook events remain processable;
- old Xendit plan IDs remain valid provider identities;
- new checkout presents only current approved prices;
- display names are never used as provider identity;
- historical records are not rewritten because marketing names changed.

## 6. Friends Capability Contract

Friends remains a complete calculation product.

Friends includes:

- all public calculators;
- full primary result;
- normal breakdown;
- interpretation;
- methodology/source visibility;
- basic scenarios;
- basic deterministic recommendations;
- Bahasa Indonesia + English;
- History for 30 days;
- maximum **5 Saved Calculations**;
- 1 active Goal;
- 1 active Project;
- basic Profile/default capability;
- widget entitlement for 1 verified domain;
- mandatory `Powered by Found Calc` attribution on Friends widgets.

### 6.1 Saved Calculation limit

The 5 Saved Calculations limit MUST be enforced by a server/domain authority, not only by UI.

Expected behavior:

- saves 1–5 succeed;
- save 6 is rejected cleanly under Friends entitlement;
- UI explains the limit in ID/EN;
- users already owning more than 5 Saved Calculations retain all records;
- excess records remain readable;
- new saves remain blocked until count is below 5 or Besties/Family entitlement applies;
- downgrade/trial expiry never automatically deletes saved records.

## 7. Besties Capability Contract

Besties represents **Plan**: individual decision continuity and deeper analysis.

Besties includes Friends plus:

- unlimited Saved Calculations;
- full History;
- unlimited Goals;
- unlimited personal Projects;
- saved scenarios;
- advanced multi-scenario comparison;
- advanced what-if and sensitivity analysis;
- advanced deterministic recommendations;
- recommendation impact ranking;
- connected-calculation insights;
- rule-change comparison;
- PDF/CSV export where supported;
- fair-use advanced AI explanation if/when AI capability is available;
- widgets on up to 3 verified domains;
- optional removal of Found Calc widget attribution;
- widget theme customization;
- standard widget analytics.

Besties does NOT include Family operating capabilities such as Portfolio, bulk SKU operations, team, multi-store portfolio management, or full white-label scale.

## 8. Family Capability Contract

Family represents **Operate**: managing many products, channels, campaigns, clients, or team members.

Family includes Besties plus:

- Portfolio capability;
- bulk SKU analysis;
- CSV import for supported business workflows;
- multi-marketplace portfolio analysis;
- multi-store/business context;
- campaign/promo portfolio analysis;
- team capability, initially 2 seats;
- higher business-scale usage limits;
- widgets on 10+ verified domains;
- white-label widget capability;
- bulk widget management;
- advanced widget analytics/events;
- business event/integration capability.

### 8.1 Portfolio as the primary differentiator

Besties helps a user analyze one calculation/Goal/Project deeply. Family adds aggregated operating views across many entities.

Initial Portfolio archetypes may include:

- SKU Portfolio;
- Marketplace Portfolio;
- Campaign Portfolio;
- Client Portfolio;
- Creator Campaign Portfolio.

Phase 07A may encode entitlement/availability contracts only. It MUST NOT advertise a full Portfolio runtime as usable if the runtime has not been implemented.

## 9. Besties 14-Day Trial

### 9.1 User promise

ID: `Coba Besties gratis 14 hari`  
EN: `Try Besties free for 14 days`

The trial is:

- exactly 14 × 24 hours from server-side activation;
- no payment card required;
- no Xendit checkout required;
- no Xendit subscription created;
- manually activated by an authenticated user;
- not automatically consumed at account creation;
- available once per first-party user account;
- available to an eligible user with verified identity;
- not renewable by logout/login or switching auth method;
- unavailable again after consumption;
- unavailable as a new introductory trial to a user with historical paid subscription usage.

### 9.2 Trial persistence

Create an additive migration beginning with:

`apps/web/migrations/0005_phase07a_commercial_auth_amendment.sql`

Store enough first-party data to resolve and audit trial entitlement. At minimum:

- user ID;
- trial tier/kind;
- started timestamp;
- ending timestamp;
- consumption state;
- paid-conversion timestamp when applicable.

Correctness MUST NOT depend on browser time or local storage.

### 9.3 Entitlement precedence

Entitlement precedence is based on **effective application access**, not raw Xendit status:

```text
effective Family paid access
>
effective Besties paid access
>
active Besties trial
>
Friends
```

**Effective paid access** includes either:

- a currently active paid subscription; or
- a subscription cancelled/deactivated at the provider but still within its first-party authoritative `paid_through_at` / `access_until` period.

Therefore `provider status = inactive` does NOT by itself mean paid entitlement is gone.

A pending checkout does not override an active trial. A successful authoritative paid-provider reconciliation promotes the user to the confirmed paid tier.

If trial expires while checkout remains pending:

- trial expires normally;
- user falls back to Friends;
- paid capability appears only after authoritative provider confirmation.

Trial correctness MUST NOT require cron. The resolver derives active trial state from authoritative server timestamps.

### 9.4 Trial expiry and user data

Trial expiry never deletes:

- Saved Calculations;
- Goals;
- Projects;
- Profiles;
- widget configuration.

If the user exceeds Friends limits after trial expiry, excess data remains owned/readable while creation/activation limits are applied.

Example: 20 Saved Calculations created during Besties trial remain readable; additional saves are blocked after expiry while the user is over the Friends limit.

## 10. Google Authentication

### 10.1 Authentication architecture

Google sign-in MUST use existing Better Auth rather than custom OAuth.

Server configuration uses Better Auth `socialProviders.google` with server-only:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Existing configuration remains:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_ADMIN_USER_IDS`

Real OAuth credentials are never committed.

### 10.2 Schema compatibility

The existing Better Auth `account` table already supports provider identity through `provider_id` and `account_id`. Phase 07A uses that model rather than introducing a second custom social-account table unless current Better Auth migration requirements explicitly require an additive schema change.

### 10.3 UI

Authentication UI adds:

`Continue with Google`

Email/password remains available. Copy is localized ID/EN and follows existing Found Calc accessibility/design contracts.

### 10.4 Account-linking security

Phase 07A uses Better Auth-supported account-linking behavior and does not weaken verification safety solely to reduce friction.

Required cases:

- new Google user;
- returning Google user;
- existing verified email/password user with same Google email;
- existing unverified local account with same Google email;
- denied/cancelled consent;
- invalid state/callback;
- locale-preserving callback.

Implicit linking safeguards, verified-email requirements, and trusted-provider behavior follow installed/current Better Auth guidance unless an explicit security review approves change.

## 11. Google Auth and Guest Context Preservation

Google sign-in MUST preserve Phase 04 guest-state behavior.

Required flow:

```text
Guest opens calculator
→ enters inputs
→ receives result
→ creates scenario/context
→ chooses Save
→ authentication page
→ Continue with Google
→ OAuth callback succeeds
→ return to originating calculator/workspace
→ guest context migrates to authenticated user
→ save completes
```

Preserve:

- calculator ID;
- calculator version;
- inputs;
- assumptions;
- scenario;
- resolved rule context;
- relevant navigation context.

Google authentication must not bypass or duplicate the existing guest-migration mechanism.

## 12. Cancellation and Paid-Through Access

Phase 07 already implements authenticated cancellation and Xendit plan deactivation. Phase 07A refines application entitlement semantics.

Approved behavior:

- cancel stops future renewal;
- cancel does not automatically refund;
- user retains already-paid capability through the authoritative paid-through/current-period-end timestamp;
- after paid-through, user falls back to Friends unless another entitlement source applies;
- Saved Calculations, Goals, Projects, Profiles, and other user-owned data remain intact.

### 12.1 Provider state is not entitlement state

Provider state and application access are distinct.

A provider plan becoming inactive because of normal user cancellation MUST NOT revoke paid access immediately if paid-through time remains.

First-party state must represent concepts equivalent to:

- `cancellation_requested_at`;
- `paid_through_at` / `access_until`.

The implementation plan may choose exact field names, but these semantics are fixed.

### 12.2 Paid-access resolution

A paid entitlement is effective when the tier is authoritative and the user remains inside the paid access window, even if future renewal is already disabled.

Conceptually:

```text
paid_access_effective =
  authoritative_paid_tier_exists
  AND
  now < paid_through_at
```

For non-cancelled active recurring subscriptions, the resolver may use authoritative current-cycle data according to Phase 07 provider reconciliation. For cancelled subscriptions, `paid_through_at` is the critical application boundary.

### 12.3 Cancellation edge cases

Test:

- monthly cancellation;
- annual cancellation;
- duplicate cancellation request;
- delayed inactivation webhook;
- duplicate webhook;
- cancellation near renewal;
- provider inactive while paid-through still future;
- paid entitlement removed after paid-through;
- cancellation never deletes user data;
- cancellation never automatically refunds;
- re-subscribe creates valid new provider lifecycle;
- stale terminal events cannot revive older access.

## 13. Pricing UX Contract

Pricing hierarchy:

```text
FRIENDS — Calculate — Rp0
BESTIES — Plan — Rp24.900/month · Rp199.000/year
FAMILY — Operate — Rp59.000/month · Rp499.000/year
```

Hero:

ID: `Semua kalkulator tetap gratis. Upgrade ketika Anda membutuhkan lebih.`  
EN: `Calculate for free. Upgrade when you need more.`

Pricing must explain:

- all calculators remain free;
- Friends maximum 5 Saved Calculations;
- Besties 14-day no-card trial;
- Besties planning/depth value;
- Family Portfolio/operating-scale value;
- widget distinctions;
- cancellation behavior;
- data retention after downgrade.

Besties may receive restrained `Most Popular` treatment. Annual may be emphasized, but monthly pricing remains visible and easy to select.

## 14. Widget Commercial Contract

Phase 07A establishes entitlement semantics. Full Widget Platform runtime is a later bounded phase.

### Friends

- embed entitlement;
- 1 verified domain;
- mandatory persistent footer attribution `Powered by Found Calc`;
- attribution never obstructs inputs/results.

### Besties

- up to 3 verified domains;
- optional attribution removal;
- theme customization;
- standard widget analytics.

### Family

- 10+ verified domains;
- white-label capability;
- bulk widget management;
- advanced analytics/events.

If runtime capability is not implemented yet, UI must not expose false production availability. Feature availability is separate from entitlement.

## 15. Migration Strategy

Historical migrations 0001–0004 remain immutable.

Phase 07A creates additive migration(s), beginning with:

`0005_phase07a_commercial_auth_amendment.sql`

Migration must be safe for databases containing:

- existing users/accounts;
- calculator state;
- Phase 05 rule/admin data;
- Phase 06 workspace data;
- Phase 07 billing customers/checkouts/subscriptions/webhook inbox entries;
- active, inactive, past-due, or pending historical subscriptions.

No destructive reset is acceptable. Historical Xendit provider references are not rewritten to adopt new marketing names.

## 16. Entitlement Architecture

The resolver supports independent entitlement sources while preserving first-party authority.

Resolution order:

```text
effective paid Family
→ effective paid Besties
→ active Besties trial
→ Friends baseline
```

Capability resolution continues to use capability keys rather than scattered public tier-name checks. Public display names never become authorization logic.

Example capability families:

```text
save.unlimited
history.full
goals.unlimited
projects.unlimited
scenario.advanced
recommendation.advanced
export.basic
widget.embed
widget.branding.remove
widget.white_label
portfolio.use
bulk_sku.use
team.use
```

Exact names are an implementation-plan decision.

## 17. Error and Failure Semantics

### Trial

- ineligible trial start returns stable application error;
- duplicate start cannot create overlapping trials;
- storage failure cannot pretend activation succeeded.

### Google auth

- OAuth cancellation returns safely to auth UI;
- provider failure does not lose guest calculator context;
- callback/state failures are human-readable and do not leak secrets;
- locale/intended return path are preserved safely.

### Billing

Existing Phase 07 fail-safe provider ambiguity behavior remains. Network/provider ambiguity cannot fabricate success or definite failure when a provider mutation may have succeeded.

### Commercial configuration

Invalid commercial configuration fails closed for paid checkout rather than silently charging an unintended offer.

## 18. Testing Contract

Implementation follows TDD.

### 18.1 Commercial compatibility

Prove:

- Friends/Besties/Family display mapping;
- exact current prices;
- legacy `pro-*` / `business-*` offers remain reconcilable;
- current offer selection excludes superseded offers from new checkout;
- invalid commercial configuration fails closed.

### 18.2 Friends limits

Prove:

- saves 1–5 allowed;
- save 6 denied for Friends;
- excess historical records preserved;
- Besties trial/paid and Family bypass Friends save limit;
- trial expiry restores Friends enforcement without deleting data.

### 18.3 Trial

Prove:

- eligible start;
- exact 14-day server-authoritative window;
- one-time use;
- duplicate start protection;
- no Xendit network call to activate trial;
- expiry;
- trial→Besties paid;
- trial→Family paid;
- pending checkout does not extend trial;
- prior paid subscriber ineligibility.

### 18.4 Google auth

Cover:

- provider configuration;
- client social login initiation;
- callback;
- account-linking cases;
- denied/error path;
- ID/EN redirect behavior;
- guest context preservation.

### 18.5 Cancellation

Cover:

- cancellation idempotency;
- provider deactivation;
- inactive-provider-but-paid-through access;
- delayed/duplicate webhook;
- expiry to Friends;
- no refund side effect;
- re-subscribe lifecycle.

### 18.6 Cross-phase regression

`verify:phase07a` MUST include/run the complete existing Phase 07 regression gate before Phase 07A-specific checks. Phase 07A cannot be complete while Phase 01–07 regression is red.

## 19. Security and Privacy

- Google client secret is server-only;
- Xendit secrets remain server-only;
- auth/session/provider tokens are never logged into portable artifacts;
- no trial device fingerprinting is required;
- trial eligibility is first-party-account based;
- Better Auth account-linking safety is preserved;
- browser never supplies authoritative Xendit provider identity;
- pricing display names never become authorization trust input;
- raw calculator inputs remain outside billing/trial analytics by default;
- downgrade does not silently delete user content.

## 20. Accessibility and Localization

All new UI supports ID and EN.

Required:

- keyboard-operable Google sign-in;
- visible focus;
- clear trial status/expiry copy;
- clear pricing interval selection;
- accessible cancellation status;
- non-color-only Friends/Besties/Family distinctions;
- no mobile overflow at existing supported widths;
- no dark patterns obscuring monthly pricing, cancellation, or trial expiry.

## 21. Operational and Cost Constraints

Phase 07A preserves the fixed-infrastructure target of approximately Rp0 while within provider free-tier limits, excluding domain and payment transaction fees.

The Besties trial must not require Xendit, paid email delivery, server-side AI, or additional paid infrastructure for correctness. Google OAuth must not introduce a paid authentication platform dependency.

## 22. Documentation and Handoff

Phase 07A completion updates:

- `BASELINE.md` without deleting Phase 07 provenance;
- `PHASE_HANDOFF.md`;
- Phase 07A verification document;
- Google OAuth setup documentation;
- trial lifecycle documentation;
- pricing/entitlement matrix;
- cancellation paid-through semantics;
- widget entitlement contract.

Recommended next bounded phase before Phase 08:

**Phase 07B — Widget Platform Foundation**

Phase 07B builds one reusable embed architecture before catalog-scale production so widget support is inherited by calculators rather than implemented calculator-by-calculator.

## 23. Portable Baseline

At Phase 07A completion generate:

`found-calc-phase-07a-commercial-auth-amendment.zip`

Include complete source, lockfile, migrations, tests, docs, `BASELINE.md`, `PHASE_HANDOFF.md`, verification evidence, and checksums.

Exclude secrets, `.env`, `.dev.vars`, `node_modules`, local Wrangler state, build caches, Google credentials, Xendit credentials, and production identifiers.

## 24. Definition of Done

Phase 07A is complete only when:

- public names Friends/Besties/Family are implemented consistently;
- Friends save limit is 5 and server-enforced;
- new prices are active for new checkout;
- legacy Phase 07 commercial records remain reconcilable;
- Besties 14-day no-card trial is one-time/server-authoritative;
- Google login works through Better Auth;
- email/password login still works;
- Google auth preserves Phase 04 guest context;
- cancellation preserves paid capability through paid-through date even when provider renewal is already inactive;
- widget entitlement contract exists without false runtime claims;
- Family Portfolio contract exists without false runtime claims;
- migrations are additive and historical migrations unchanged;
- Phase 01–07 regression remains green;
- Cloudflare/vinext build remains valid;
- no secrets are committed;
- documentation/handoff are updated;
- portable baseline is generated and verified.

## 25. Explicit Decision Ledger

1. Phase 07 remains historically complete; Phase 07A is additive.
2. Public tier names are Friends, Besties, Family.
3. Positioning is Calculate, Plan, Operate.
4. Friends is Rp0.
5. Besties is Rp24.900/month and Rp199.000/year.
6. Family is Rp59.000/month and Rp499.000/year.
7. Friends maximum Saved Calculations is 5.
8. Besties has a one-time 14-day no-card trial.
9. Trial does not create a Xendit subscription.
10. Google sign-in uses Better Auth and preserves email/password.
11. Google auth preserves guest calculator context.
12. Provider/database IDs are not globally renamed to marketing names.
13. Cancellation stops renewal but preserves paid access through paid-through date.
14. Provider `inactive` does not by itself revoke access before paid-through.
15. Cancellation does not automatically refund or delete user data.
16. Friends widgets require `Powered by Found Calc` attribution.
17. Besties widgets may remove attribution and customize appearance.
18. Family widgets support white-label/scale entitlement.
19. Portfolio is a Family-only operating-scale differentiator.
20. Full Widget Platform runtime is recommended as Phase 07B before Phase 08.
21. Phase 08 catalog production is not pulled into Phase 07A.

## 26. Review Gate

This design must be reviewed by the user before implementation planning.

After approval, the only next Superpowers skill is `writing-plans`, which will create a detailed Phase 07A implementation plan against the current repository paths and exact existing Phase 07 contracts.
