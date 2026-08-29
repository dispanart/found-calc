# Found Calc Phase 07A — Commercial, Trial & Google Auth Amendment Design

**Status:** Approved design candidate for user review  
**Date:** 2026-08-30  
**Base:** completed Phase 07 on `main` at `8f19b1e13d20b0d896f65ecb6b5cedaa807b98b4`  
**Branch:** `phase-07a-commercial-auth-amendment`

## 1. Purpose

Phase 07 is already complete and merged. Phase 07A is an additive amendment that updates Found Calc commercial presentation and entitlement behavior without rewriting Phase 01–07 foundations.

Phase 07A introduces:

- new public plan names: **Friends**, **Besties**, **Family**;
- new current prices for Besties and Family;
- a one-time 14-day Besties trial with no card and no Xendit subscription;
- Google sign-in through the existing Better Auth stack;
- explicit Friends persistence limits, including maximum 5 Saved Calculations;
- cancellation semantics that preserve already-paid access through the paid-through date;
- commercial entitlement contracts for the Widget Platform;
- Family-only Portfolio entitlement as the primary product distinction from Besties;
- compatibility rules so existing Phase 07 `pro-*` and `business-*` provider/database identities remain reconcilable.

This amendment MUST preserve Phase 01–06 deterministic calculation, rule, persistence, guest-migration, Goal, Project, Profile, Workspace, Admin, and security contracts.

## 2. Non-Goals

Phase 07A does NOT:

- redesign `@found-calc/engine`;
- move or duplicate calculation formulas into billing/auth code;
- change `@found-calc/rules` truth, rule versioning, publication, or effective-date semantics;
- rewrite Phase 04 guest-state preservation;
- rewrite Goal/Project/Profile data models;
- build the full Widget Platform runtime;
- build full Family Portfolio runtime;
- build Phase 08 catalog calculators;
- introduce a new payment processor;
- replace email/password authentication;
- change historical SQL migrations 0001–0004;
- silently rewrite historical Xendit subscription identities.

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

First-party D1 billing state remains the application authorization/entitlement source. Xendit remains the payment/subscription processor. Checkout return URLs remain informational and cannot grant entitlement. Provider webhooks remain authoritative for paid lifecycle transitions. Existing idempotency, ordering, stale-event protection, provider-identity validation, and pending-plan-change safeguards remain required.

## 4. Public Commercial Model

The public plan names are:

| Public tier | Positioning | Price |
| --- | --- | --- |
| **Friends** | Calculate | Rp0 |
| **Besties** | Plan | Rp24.900/month or Rp199.000/year |
| **Family** | Operate | Rp59.000/month or Rp499.000/year |

Approved spelling and capitalization:

- `Friends`
- `Besties`
- `Family`

`Besties` is intentionally informal brand language. It is not treated as a typo.

### 4.1 Pricing principles

- all public calculators and primary calculation results remain available to Friends;
- paid value is continuity, depth, workflow, distribution, and operating scale;
- annual plans may be visually encouraged but monthly remains easy to select;
- no calculator result login wall;
- no dark-pattern cancellation or hidden automatic trial conversion;
- prices displayed in IDR for Indonesia launch.

## 5. Internal Commercial Compatibility

Public tier naming MUST be separated from provider/database commercial identity.

Existing Phase 07 code and historical data use offer identifiers such as:

- `pro-monthly`
- `pro-annual`
- `business-monthly`
- `business-annual`

These identities MUST NOT be globally renamed.

The system should model at least three concepts independently:

1. **commercial family/internal tier** — stable capability identity;
2. **offer identity** — specific current or legacy purchasable commercial coordinate;
3. **public display name** — Friends/Besties/Family copy.

A compatibility mapping can conceptually be:

```text
free/base     → Friends
pro           → Besties
business      → Family
```

Historical provider references remain untouched. New pricing SHOULD be represented as a new/versioned active-offer set or another design that keeps legacy offers readable and reconcilable.

### 5.1 Required compatibility behavior

- legacy Phase 07 subscription records still resolve to the correct entitlement family;
- legacy webhook events remain processable;
- old Xendit plan IDs remain valid provider identities;
- new checkout presents only current approved prices;
- display names are never used as provider identity;
- historical records are not rewritten simply because product marketing names changed.

## 6. Friends Capability Contract

Friends is the free tier and remains a complete calculation product.

Friends includes:

- all public calculators;
- full primary result;
- normal breakdown;
- interpretation;
- methodology and source visibility;
- basic scenarios;
- basic deterministic recommendations;
- Bahasa Indonesia + English;
- History for 30 days;
- maximum **5 Saved Calculations**;
- 1 active Goal;
- 1 active Project;
- basic Profile/default capability;
- calculator widget entitlement for 1 verified domain;
- mandatory `Powered by Found Calc` attribution on Friends widgets.

### 6.1 Saved Calculation limit

The 5 Saved Calculations limit MUST be enforced by a server/domain authority, not only by UI.

Expected behavior:

- saves 1–5 succeed;
- save 6 is rejected cleanly while Friends entitlement is effective;
- UI explains the limit in ID/EN;
- a user who already owns more than 5 Saved Calculations because of prior paid/trial usage keeps those records;
- existing records remain readable;
- new saves remain blocked until count is below the Friends limit or user gains Besties/Family entitlement;
- downgrade/trial expiry never deletes saved records automatically.

## 7. Besties Capability Contract

Besties represents **Plan**: individual decision continuity and deeper analysis.

Besties includes all Friends capability plus:

- unlimited Saved Calculations;
- full History;
- unlimited Goals;
- unlimited personal Projects;
- saved scenarios;
- advanced multi-scenario comparison;
- advanced what-if analysis;
- sensitivity analysis;
- advanced deterministic recommendations;
- recommendation impact ranking;
- connected-calculation insights;
- rule-change comparison;
- PDF/CSV export where supported;
- fair-use advanced AI explanation if/when AI capability is available;
- widget use on up to 3 verified domains;
- optional removal of Found Calc widget attribution;
- widget theme customization;
- standard widget analytics.

Besties does NOT include Family operating capabilities such as bulk SKU operations, Portfolio, team, multi-store portfolio management, or full white-label scale.

## 8. Family Capability Contract

Family represents **Operate**: managing many products, channels, campaigns, clients, or team members.

Family includes all Besties capability plus:

- Portfolio capability;
- bulk SKU analysis;
- CSV import for supported business workflows;
- multi-marketplace portfolio analysis;
- multi-store/business context;
- campaign/promo portfolio analysis;
- team capability, initially 2 seats;
- higher business-scale usage limits;
- widget use on 10+ verified domains;
- white-label widget capability;
- bulk widget management;
- advanced widget analytics/events;
- business event/integration capability.

### 8.1 Portfolio as the primary differentiator

Besties helps a user analyze one calculation/Goal/Project deeply.

Family adds aggregated operating views across many entities.

Initial Portfolio archetypes may include:

- SKU Portfolio;
- Marketplace Portfolio;
- Campaign Portfolio;
- Client Portfolio;
- Creator Campaign Portfolio.

The Phase 07A implementation may encode entitlement and availability contracts only. It MUST NOT advertise a full Portfolio runtime as usable if the runtime has not yet been implemented.

## 9. Besties 14-Day Trial

### 9.1 User promise

ID: `Coba Besties gratis 14 hari`  
EN: `Try Besties free for 14 days`

The trial is:

- exactly 14 × 24 hours from server-side activation time;
- no payment card required;
- no Xendit checkout required;
- no Xendit subscription created;
- manually activated by the authenticated user;
- not automatically consumed at account creation;
- available once per first-party user account;
- available to an eligible user with a verified identity;
- not renewable by logout/login or changing authentication method;
- not available again after trial consumption;
- not available as a new introductory trial to users with historical paid subscription usage.

### 9.2 Trial persistence

A new additive migration, expected as:

`apps/web/migrations/0005_phase07a_commercial_auth_amendment.sql`

must store enough first-party information to establish trial entitlement deterministically and auditably.

At minimum:

- user ID;
- tier/trial kind;
- started timestamp;
- ending timestamp;
- consumption state;
- paid-conversion timestamp if conversion occurs.

Correctness MUST NOT depend on browser time or local storage.

### 9.3 Entitlement precedence

Effective entitlement precedence is:

```text
active Family paid entitlement
>
active Besties paid entitlement
>
active Besties trial
>
Friends
```

A pending Xendit checkout does not override active trial entitlement.

A successful authoritative paid-provider reconciliation promotes the user to the confirmed paid tier.

If trial expires while checkout remains pending:

- the trial expires normally;
- the user falls back to Friends;
- paid capability appears only after authoritative provider confirmation.

Trial correctness MUST NOT require cron. The resolver derives active trial state from server timestamps. Cleanup/materialization jobs may exist later but are not the authority.

### 9.4 Trial expiry and user data

Trial expiry never deletes:

- Saved Calculations;
- Goals;
- Projects;
- Profiles;
- widget configuration.

If the user exceeds Friends limits after trial expiry, excess data remains owned and readable while creation/activation limits are applied.

Example: 20 Saved Calculations created during Besties trial remain readable; additional saves are blocked after expiry while the user is over the Friends limit.

## 10. Google Authentication

### 10.1 Authentication architecture

Google sign-in MUST use existing Better Auth rather than a custom OAuth implementation.

Server configuration uses Better Auth `socialProviders.google` with server-only:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Existing configuration remains:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `BETTER_AUTH_ADMIN_USER_IDS`

Real OAuth credentials are never committed.

### 10.2 Existing schema compatibility

The existing Better Auth `account` table already supports provider identity via `provider_id` and `account_id`; Phase 07A should use that schema rather than introducing a parallel custom social-account table unless current Better Auth migration requirements explicitly demand an additive schema change.

### 10.3 User interface

Authentication UI adds:

- `Continue with Google`

Email/password remains available.

Google login copy is localized ID/EN and follows existing Found Calc design/accessibility contracts.

### 10.4 Account-linking security

Phase 07A must use Better Auth's supported account-linking behavior and must not weaken safety solely for conversion convenience.

Required cases:

- new Google user;
- returning Google user;
- existing verified email/password user signing in with Google using the same email;
- existing unverified local user with the same Google email;
- denied/cancelled Google consent;
- invalid state/callback;
- locale-preserving callback.

Implicit linking safeguards, verified-email requirements, and trusted-provider behavior should follow the installed/current Better Auth guidance unless an explicit security review approves a change.

## 11. Google Auth and Guest Context Preservation

Google sign-in must preserve Phase 04 guest-state behavior.

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

The flow must preserve:

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

Approved user behavior:

- cancel stops future renewal;
- cancel does not automatically refund;
- user retains already-paid capability through the paid-through/current-period-end timestamp;
- after paid-through, user falls back to Friends unless another entitlement source applies;
- Saved Calculations, Goals, Projects, Profiles, and other user-owned data remain intact.

### 12.1 Separate provider state from entitlement state

Provider state and application access must remain distinct.

A provider plan becoming inactive because of user cancellation MUST NOT necessarily revoke paid access immediately.

First-party state should represent a concept equivalent to:

- `cancellation_requested_at`;
- `access_until` / `paid_through_at`.

Exact field names are an implementation-plan decision, but the semantic boundary is fixed.

### 12.2 Cancellation edge cases

Must support and test:

- monthly cancellation;
- annual cancellation;
- duplicate cancellation request;
- delayed inactivation webhook;
- duplicate webhook;
- cancellation near renewal;
- paid-through entitlement retained after provider inactivation;
- entitlement removed after paid-through;
- cancellation never deletes user data;
- cancellation never creates an automatic refund;
- re-subscribe creates a valid new provider lifecycle;
- stale terminal events cannot revive older access.

## 13. Pricing UX Contract

Pricing page hierarchy:

```text
FRIENDS — Calculate — Rp0
BESTIES — Plan — Rp24.900/month · Rp199.000/year
FAMILY — Operate — Rp59.000/month · Rp499.000/year
```

Hero:

ID: `Semua kalkulator tetap gratis. Upgrade ketika Anda membutuhkan lebih.`  
EN: `Calculate for free. Upgrade when you need more.`

The pricing experience must explain:

- all calculators remain free;
- Friends maximum 5 Saved Calculations;
- Besties 14-day no-card trial;
- Besties focuses on planning/depth;
- Family focuses on Portfolio/operating scale;
- widget differences;
- cancellation behavior;
- user data is retained after downgrade.

Besties may receive restrained `Most Popular` treatment. Annual may be selected by default or emphasized, but monthly pricing remains visible and easily selectable.

## 14. Widget Commercial Contract

Phase 07A establishes entitlement semantics; full Widget Platform runtime is a later bounded phase.

### Friends

- embed entitlement;
- 1 verified domain;
- mandatory persistent footer attribution: `Powered by Found Calc`;
- attribution must not obstruct input/result content.

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

If runtime capability is not yet implemented, UI must not expose false production availability. Use feature availability state separate from entitlement.

## 15. Migration Strategy

Historical migrations 0001–0004 remain immutable.

Phase 07A creates only additive migration(s), starting with:

`0005_phase07a_commercial_auth_amendment.sql`

Migration must be safe for databases containing:

- existing users and social-capable account rows;
- calculator state;
- Phase 05 rule/admin data;
- Phase 06 workspace data;
- Phase 07 billing customers/checkouts/subscriptions/webhook inbox entries;
- active, inactive, past-due, or pending historical subscriptions.

No destructive reset is acceptable.

No historical Xendit provider reference is rewritten merely to adopt Friends/Besties/Family branding.

## 16. Entitlement Architecture

The entitlement resolver must support independent entitlement sources while preserving first-party authority.

Conceptual resolution:

```text
paid Family
paid Besties
Besties trial
Friends baseline
```

Capability resolution should continue to use capability keys rather than scattered tier-name checks.

Public display names should not become authorization logic.

Examples of capability families:

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

Exact key names are implementation-plan decisions, but authorization must remain capability-oriented.

## 17. Error and Failure Semantics

### Trial

- invalid/ineligible trial start returns a stable application error;
- duplicate start cannot create multiple overlapping trials;
- storage failure does not pretend trial activation succeeded.

### Google auth

- OAuth cancellation returns user safely to auth UI;
- OAuth provider failure does not lose guest calculator context;
- callback/state failures are human-readable and do not leak provider secrets;
- locale and intended return path are preserved safely.

### Billing

Existing fail-safe provider ambiguity behavior remains. Network/provider ambiguity must not fabricate success or definite failure when the provider request may have succeeded.

### Entitlements

If commercial configuration is invalid, paid checkout should fail closed rather than silently using an incorrect price/tier mapping.

## 18. Testing Contract

Implementation follows TDD.

### 18.1 Commercial compatibility

Tests prove:

- Friends/Besties/Family display mapping;
- exact current Besties/Family prices;
- legacy `pro-*` / `business-*` Phase 07 offers remain reconcilable;
- current offer selection excludes superseded offers from new checkout;
- invalid commercial configuration fails closed.

### 18.2 Friends limits

Tests prove:

- saves 1–5 allowed;
- save 6 denied for Friends;
- excess historical records preserved;
- Besties trial/paid and Family bypass Friends save limit;
- trial expiry restores Friends enforcement without deleting data.

### 18.3 Trial

Tests prove:

- eligible start;
- exactly 14-day server-authoritative window;
- one-time use;
- duplicate start protection;
- no Xendit network call to activate trial;
- expiry;
- trial→Besties paid;
- trial→Family paid;
- pending checkout does not extend trial;
- prior paid subscriber trial ineligibility.

### 18.4 Google auth

Tests cover:

- provider configuration;
- client social login initiation;
- callback;
- account-linking cases;
- denied consent/error path;
- ID/EN redirect behavior;
- guest context preservation.

### 18.5 Cancellation

Tests cover:

- cancellation request idempotency;
- provider deactivation;
- paid-through preservation;
- delayed/duplicate webhook;
- expiry to Friends;
- no refund side effect;
- re-subscribe lifecycle.

### 18.6 Cross-phase regression

`verify:phase07a` MUST run or include the complete existing Phase 07 regression gate before Phase 07A-specific checks.

Phase 07A cannot be declared complete if Phase 01–07 regression is red.

## 19. Security and Privacy

- Google client secret is server-only;
- Xendit secrets remain server-only;
- auth/session/provider tokens are never logged into portable artifacts;
- no trial device fingerprinting is required;
- trial eligibility is first-party account based;
- account linking follows Better Auth security defaults unless explicitly reviewed;
- browser never supplies authoritative Xendit provider identity;
- pricing display names never become authorization trust input;
- raw calculator inputs remain outside billing/trial analytics by default;
- downgrade does not silently delete user content.

## 20. Accessibility and Localization

All new UI supports ID and EN.

Required:

- keyboard-operable Google sign-in button;
- visible focus;
- clear trial status and expiry copy;
- clear pricing interval selection;
- accessible cancellation status;
- non-color-only distinction between Friends/Besties/Family;
- no mobile overflow at existing supported widths;
- no dark patterns that obscure monthly pricing, cancellation, or trial expiry.

## 21. Operational and Cost Constraints

Phase 07A must preserve the fixed-infrastructure target of approximately Rp0 while within Cloudflare and other provider free-tier limits, excluding domain and payment transaction fees.

The Besties trial must not require Xendit, paid email delivery, server-side AI, or additional paid infrastructure to function correctly.

Google OAuth itself must not introduce a paid authentication platform dependency.

## 22. Documentation and Handoff

Phase 07A completion updates:

- `BASELINE.md` without deleting Phase 07 provenance;
- `PHASE_HANDOFF.md`;
- Phase 07A verification document;
- Better Auth Google setup documentation;
- trial lifecycle documentation;
- pricing/entitlement matrix;
- cancellation paid-through semantics;
- widget entitlement contract.

Recommended next bounded phase before Phase 08:

**Phase 07B — Widget Platform Foundation**

Its purpose is to build one reusable embed architecture before catalog-scale Phase 08 production so widget support is inherited by calculators rather than bolted on one calculator at a time.

## 23. Portable Baseline

At Phase 07A completion, generate:

`found-calc-phase-07a-commercial-auth-amendment.zip`

Include complete source, lockfile, migrations, tests, docs, `BASELINE.md`, `PHASE_HANDOFF.md`, verification evidence, and checksums.

Exclude secrets, `.env`, `.dev.vars`, `node_modules`, local Wrangler state, build caches, Google credentials, Xendit credentials, and production identifiers.

## 24. Definition of Done

Phase 07A is complete only when all are true:

- public names Friends/Besties/Family are implemented consistently;
- Friends save limit is 5 and is enforced server-side;
- new prices are active for new checkout;
- legacy Phase 07 commercial records remain reconcilable;
- Besties 14-day no-card trial works and is one-time/server-authoritative;
- Google login works through Better Auth;
- email/password login still works;
- Google auth preserves Phase 04 guest context;
- cancellation retains paid entitlement through paid-through date;
- widget entitlement contract exists without false runtime claims;
- Family Portfolio capability contract exists without false runtime claims;
- migrations are additive and historical migrations unchanged;
- Phase 01–07 regression remains green;
- Cloudflare/vinext build remains valid;
- no secrets are committed;
- documentation/handoff are updated;
- portable baseline artifact is generated and verified.

## 25. Explicit Decision Ledger

Approved decisions for this amendment:

1. Phase 07 stays historically complete; Phase 07A is an additive amendment.
2. Public tier names are Friends, Besties, Family.
3. Public positioning is Calculate, Plan, Operate.
4. Friends is Rp0.
5. Besties is Rp24.900/month and Rp199.000/year.
6. Family is Rp59.000/month and Rp499.000/year.
7. Friends allows maximum 5 Saved Calculations.
8. Besties receives a one-time 14-day no-card trial.
9. Trial does not create a Xendit subscription.
10. Google sign-in uses Better Auth and preserves email/password login.
11. Google authentication must preserve guest calculator context.
12. Provider/database IDs are not globally renamed to marketing names.
13. Cancellation stops renewal but preserves paid access through paid-through date.
14. Cancellation does not automatically refund or delete user data.
15. Friends widgets have mandatory `Powered by Found Calc` attribution.
16. Besties widgets may remove attribution and support customization.
17. Family widgets support white-label/scale entitlement.
18. Portfolio is a Family-only operating-scale differentiator.
19. Full Widget Platform runtime is recommended as Phase 07B before Phase 08.
20. Phase 08 catalog production is not pulled into Phase 07A.

## 26. Review Gate

This design must be reviewed by the user before implementation planning.

After approval, the only next Superpowers skill is `writing-plans`, which must create a detailed Phase 07A implementation plan against the current repository paths and exact existing Phase 07 contracts.
