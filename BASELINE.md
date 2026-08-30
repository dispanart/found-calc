# Found Calc Phase 07A — Commercial, Trial & Google Auth Amendment

**Project:** Found Calc  
**Phase state:** COMPLETE after merge + artifact verification  
**Last canonical completed phase:** Phase 07A — Commercial, Trial & Google Auth Amendment  
**Next phase:** Phase 07B — Widget Platform Foundation  
**Phase 07 canonical predecessor SHA:** `8f19b1e13d20b0d896f65ecb6b5cedaa807b98b4`  
**Completion date:** 2026-08-30

## Canonical artifact

`found-calc-phase-07a-commercial-auth-amendment.zip`

GitHub `main` remains the collaborative canonical repository. After Phase 07A merges, `.github/workflows/phase-07a-baseline-artifact.yml` archives the exact merged `GITHUB_SHA` with `git archive`, writes `SHA256SUMS`, verifies ZIP integrity/extraction/required files, rejects generated or local secret-bearing state, and records source commit/tree/checksum provenance in `ARTIFACT_VERIFICATION.txt`.

Historical Phase 07 provenance is preserved rather than rewritten. Phase 07 remains canonical at `8f19b1e13d20b0d896f65ecb6b5cedaa807b98b4` with portable artifact `found-calc-phase-07-billing-entitlements-xendit.zip`. Its artifact workflow is historical/manual-only and pinned to that SHA so later phases cannot accidentally publish newer source under the Phase 07 artifact name.

## Phase 07A amendment boundary

Phase 07A is additive. It does not reopen or replace Phase 01–07 deterministic engine, catalog, rules, auth/persistence, workspace, or Xendit authority boundaries. Migration `0005_phase07a_commercial_auth_amendment.sql` is additive; migrations 0001–0004 remain immutable.

Phase 07A adds:

- public plan names Friends / Besties / Family while preserving legacy provider/internal identities;
- current checkout offers and prices without breaking reconciliation of historical Phase 07 offers;
- one-time manual 14-day Besties trial with server-authoritative time and no Xendit/card requirement;
- paid-through entitlement preservation after cancellation;
- Google sign-in through Better Auth with safe same-origin return targets and guest draft claim continuity;
- Friends persistence limits for Saved Calculations, active Goals, and active Projects with no destructive downgrade;
- localized public pricing and commercial billing UX;
- Phase 07A verification + built Worker smoke as a complete Phase 07 regression superset.

## Commercial contract

### Friends — Calculate — Rp0

- all public calculators and primary results remain free;
- maximum 5 Saved Calculations;
- 30-day History;
- maximum 1 active Goal;
- maximum 1 active Project;
- widget entitlement contract: 1 verified domain with mandatory `Powered by Found Calc` attribution;
- data above Friends limits remains readable after downgrade/expiry; only new creation/reactivation above the limit is blocked.

### Besties — Plan

- Rp24.900/month;
- Rp199.000/year;
- unlimited plan access for Saved Calculations, History, Goals, and personal Projects;
- advanced scenario/comparison/sensitivity/deterministic recommendation capabilities where implemented;
- exports where supported by the relevant workflow;
- widget entitlement contract up to 3 verified domains with branding removal/customization/standard analytics;
- one manual 14-day introductory trial, once per account, no card, no Xendit subscription creation.

### Family — Operate

- Rp59.000/month;
- Rp499.000/year;
- Family/Portfolio entitlement and operating-scale capabilities;
- bulk SKU, CSV import, multi-marketplace/store/business and campaign portfolio entitlements;
- 2 seats in the current commercial contract;
- widget entitlement contract for 10+ domains, white-label, and advanced analytics/events.

Widget Platform and Portfolio runtime availability are distinct from entitlement. Phase 07A UI explicitly says those runtimes are not yet available rather than falsely advertising them as implemented.

## Stable internal/provider identities

Historical Xendit/provider IDs remain unchanged and reconcilable:

- `pro-monthly`
- `pro-annual`
- `business-monthly`
- `business-annual`

Current checkout offers are versioned additively:

- `pro-monthly-2026a` → Besties Rp24.900/month
- `pro-annual-2026a` → Besties Rp199.000/year
- `business-monthly-2026a` → Family Rp59.000/month
- `business-annual-2026a` → Family Rp499.000/year

Public tier names never become provider identity or scattered authorization checks.

## Trial and effective-access truth

The Besties trial is manually activated, lasts exactly `14 × 24h` from a server-authoritative timestamp, is available once per account, requires no card/Xendit call, cannot be restarted, and is unavailable to historical paid users. Pending checkout does not extend trial access.

Effective access precedence is:

```text
Family paid
→ Besties paid
→ active Besties trial
→ Friends
```

First-party D1 remains application entitlement truth. Ordinary access/capability reads do not query Xendit.

## Cancellation contract

Cancellation stops renewal; it is not an automatic refund and never deletes user data. Before provider deactivation is requested, the application requires an authoritative future billing-period boundary and freezes it into `paid_through_at`. Provider `inactive` therefore does not imply immediate loss of paid entitlement when `paid_through_at` is still in the future. Access returns to the next effective source at/after that boundary.

## Google / authentication contract

Google is configured only through Better Auth `socialProviders.google` using server-only `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Email/password, D1/Drizzle and admin behavior remain enabled. Cross-email account-linking weakening such as `allowDifferentEmails: true` is not enabled.

Auth return targets are validated as locale-scoped same-origin relative paths and reject protocol-relative, traversal, encoded path separators, control characters, backslashes, malformed encoding, and wrong-locale paths. The preserved flow is:

```text
guest calculator state
→ auth
→ Google/Better Auth callback
→ /api/guest/claim
→ validated originating context
```

Claim failure keeps the user at auth with an explicit retry rather than silently losing pre-auth state.

## Friends persistence enforcement

Commercial capability resolution reads first-party billing/trial state only. Friends limits are enforced at the mutation boundary with guarded single-statement D1 writes for Saved Calculations and active Goal/Project creation/reactivation. Existing records remain readable/updatable. Guest claim continues through the unrestricted claim path so authentication does not discard pre-auth drafts.

The current Phase 04 `calculator_state` schema has only the three canonical calculator IDs, so the production Friends limit of 5 Saved Calculations is presently non-binding for the current three calculators. Integration tests use a smaller injected cap across real calculator IDs to prove enforcement mechanics without mutating historical schema merely to fabricate extra calculators.

## Verification

Authoritative Phase 07A evidence is recorded in `docs/verification/phase-07a-verification.md`.

`pnpm verify:phase07a` first runs the complete `pnpm verify:phase07` regression gate, then Phase 07A foundation/unit/D1/lint/typecheck/Playwright/Next/vinext checks. The CI workflow also independently builds and smoke-tests the vinext Worker with synthetic non-production billing and Google configuration.

The verifier clears inherited `.next` generated state before the Phase 07A typecheck so nested predecessor builds cannot contaminate current generated route types. It does not exclude `.next/types` from TypeScript validation; the subsequent Next production build still validates generated route contracts.

## Preserved security and trust boundaries

- deterministic calculator arithmetic remains owned by `@found-calc/engine`;
- rule/version truth remains owned by `@found-calc/rules`;
- first-party D1 remains entitlement/authorization truth;
- Xendit remains payment/subscription processor, not ordinary entitlement-read authority;
- checkout return URLs never grant paid capability;
- provider credentials, Google secret, auth cookies, raw payment data, and production database identity are never committed or included in portable artifacts;
- downgrade/trial expiry/cancellation never deletes user-owned calculator/workspace data;
- ID/EN, keyboard/focus, mobile no-overflow, privacy/trust, and Rp0 fixed-infrastructure target excluding domain/payment transaction fees remain preserved.

## Next phase

The next implementation phase is **Phase 07B — Widget Platform Foundation**. It must start in a new chat from the exact post-merge `found-calc-phase-07a-commercial-auth-amendment.zip`.

Phase 07B must not silently pull Phase 08 Frozen V1 Catalog Production forward. Phase 08 remains deferred until the bounded Phase 07B work is completed or explicitly reprioritized under change control.
