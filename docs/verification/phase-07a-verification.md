# Found Calc Phase 07A Verification

**Project:** Found Calc  
**Phase:** 07A — Commercial, Trial & Google Auth Amendment  
**Status:** CLOSURE CANDIDATE; merge requires fresh exact closure-head green verification and built-Worker smoke  
**Verification date:** 2026-08-30  
**Canonical Phase 07 predecessor:** `8f19b1e13d20b0d896f65ecb6b5cedaa807b98b4`

## Verification boundary

The authoritative PR gate is `.github/workflows/phase-07a-verification.yml`. It applies migrations `0001` through additive `0005`, runs `pnpm verify:phase07a`, and independently builds/smoke-tests the vinext Worker with synthetic non-production billing and Google configuration.

`pnpm verify:phase07a` is a complete Phase 07 regression superset. Its first command is `pnpm verify:phase07`, followed by Phase 07A foundation contracts, web unit tests, Cloudflare/D1 integration tests, lint, TypeScript, Playwright, Next production build, vinext compatibility check, and vinext production build.

Because the inherited Phase 07→01 chain performs multiple framework builds, the Phase 07A verifier clears inherited `apps/web/.next` state before its own typecheck. This fixes contamination by stale generated route types while retaining `.next/types/**/*.ts` in the normal TypeScript project and still running a fresh Next production build afterward.

## Final production/runtime candidate evidence

Exact implementation/runtime candidate before closure-metadata-only changes:

- source SHA: `724ade5f3d113083a7fb2f5003fd85bd95a05cb8`
- PR GitHub Actions run: `33315058897`
- full Phase 07A verification job: `99266830569` — **SUCCESS**
- built vinext Worker smoke job: `99266830657` — **SUCCESS**

This run follows the final review correction that makes the authenticated public Besties pricing CTA start the trial directly through the first-party trial endpoint while anonymous visitors still route through auth with a preserved billing return target.

Review TDD evidence for that correction:

- RED SHA: `dbfddfe3c17ed79249aa8fad13ddd54d93e642ad`
- RED run: `33305792286`
- full job: `99242016010` — **FAILURE**, intentionally at the new pricing contract because direct authenticated trial activation was not yet implemented;
- RED foundation result before fail-fast stop: 103 passed / 1 failed;
- RED Worker smoke job: `99242016165` — **SUCCESS**;
- GREEN SHA: `724ade5f3d113083a7fb2f5003fd85bd95a05cb8` with both jobs green as listed above.

Earlier runtime candidate `17df93d1912ae83b0232df105b98d4f23f60e9eb` also passed run `33305168440` with full verification job `99240298799` and Worker smoke `99240298877`; the later pricing correction supersedes it as final production/runtime evidence.

## Commercial compatibility and current offers

Phase 07A preserves historical provider/internal identities:

- `pro-monthly`
- `pro-annual`
- `business-monthly`
- `business-annual`

and adds versioned current checkout offers:

- `pro-monthly-2026a` — Besties Rp24.900/month
- `pro-annual-2026a` — Besties Rp199.000/year
- `business-monthly-2026a` — Family Rp59.000/month
- `business-annual-2026a` — Family Rp499.000/year

New checkout/status UI exposes current offers while provider reconciliation continues accepting the exact historical/current configuration contract. Public Friends/Besties/Family labels never replace provider identity.

## Trial verification

The Besties trial contract is verified across pure/unit, HTTP, D1, status, and browser boundaries:

- manual opt-in only;
- exactly `14 × 24 × 60 × 60 × 1000` milliseconds from server-authoritative time;
- one persisted row per user;
- duplicate/concurrent activation cannot reset or extend the trial;
- historical paid subscription makes the account ineligible;
- converted/consumed trial remains consumed;
- trial activation does not call Xendit and does not require a card;
- pending checkout does not extend trial access;
- active trial resolves Besties access; expiry falls back to Friends without deleting user data;
- authenticated public pricing CTA calls `POST /api/billing/trial` directly; anonymous CTA preserves an auth return target to workspace billing.

## Effective-access precedence

Pure resolver and integration tests verify:

```text
Family paid
→ Besties paid
→ active Besties trial
→ Friends
```

Provider status is not treated as the sole entitlement truth. `inactive` with future authoritative `paidThroughAt` can remain paid-effective; pending/past-due state does not fabricate paid capability. Ordinary capability reads use first-party D1 state and do not call Xendit.

## Cancellation paid-through verification

Coverage includes monthly/annual boundaries, duplicate cancellation, unavailable/expired billing-period boundary, provider inactivation, delayed/duplicate webhook behavior, and paid-through expiry.

The application requires a safe future reconciled `nextCycleAt` before provider deactivation, freezes that boundary into `paid_through_at`, and returns `billing-period-unavailable` rather than inventing a period. Provider `inactive` does not remove already-paid access before the frozen boundary. Cancellation stops renewal; no automatic refund or data deletion path is introduced.

## Google / Better Auth verification

Google is configured through Better Auth using server-only `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Current verification intentionally does not contact live Google: the browser test validates the visible/focusable Google entry and then uses a controlled same-origin authenticated session to exercise the post-social callback transition deterministically.

Verified behavior:

- existing email/password, D1/Drizzle, admin plugin, and `toNextJsHandler` route remain intact;
- Google provider is enabled only when both credentials are nonblank;
- trusted origin is derived only from a valid HTTP(S) Better Auth base URL;
- no `NEXT_PUBLIC_*` Google secret/client configuration is introduced;
- no `allowDifferentEmails: true` account-linking weakening is enabled;
- callback remains Better Auth-managed `/api/auth/callback/google`;
- return target rejects external/protocol-relative/traversal/encoded-separator/control/backslash/wrong-locale inputs;
- after authentication, `/api/guest/claim` runs before navigation;
- guest claim failure remains on auth and exposes retry rather than discarding draft state;
- calculator query/hash context is preserved through the validated return target.

## Friends persistence limits and downgrade safety

The production capability authorizer resolves limits from first-party billing/trial state only:

- Friends: 5 Saved Calculations, 1 active Goal, 1 active Project;
- Besties trial/paid and Family: unlimited for those three persistence coordinates.

Guarded single-statement D1 mutations prevent the normal concurrent-create bypass for capped Saved Calculations and active Goal/Project creation/reactivation. Existing records can still be read and updated. Downgrade/trial expiry never deletes data. Guest claim deliberately remains on the unrestricted claim path so authenticating never discards pre-auth calculator state.

The existing Phase 04 `calculator_state` schema supports the three current canonical calculator IDs and has a uniqueness constraint per owner/calculator. Therefore the real Friends limit of 5 is currently non-binding with only three calculators. Integration tests inject a smaller cap of 2 across the real calculator IDs to prove the enforcement mechanism without modifying historical migration/schema solely to fabricate additional calculators.

## Pricing, ID/EN, mobile and accessibility

Browser/foundation coverage verifies:

- exact ID hero: `Semua kalkulator tetap gratis. Upgrade ketika Anda membutuhkan lebih.`
- exact EN hero: `Calculate for free. Upgrade when you need more.`
- Friends / Besties / Family and Calculate / Plan / Operate hierarchy;
- approved monthly/annual prices;
- 14-day no-card manual trial language;
- Friends save limit;
- widget entitlement differences;
- Widget Platform and Family Portfolio are explicitly described as entitlement/availability contracts where runtime is not yet implemented;
- cancellation paid-through and data-retention reassurance;
- keyboard-focusable CTA;
- 390px no-horizontal-overflow coverage;
- authenticated Besties CTA direct trial activation and anonymous auth-return flow.

## Migration verification

CI resets local D1 and applies in order:

1. `0001_phase04_auth_and_calculator_state.sql`
2. `0002_phase05_rule_platform_admin.sql`
3. `0003_phase06_workspace.sql`
4. `0004_phase07_billing.sql`
5. `0005_phase07a_commercial_auth_amendment.sql`

Phase 07A modifies only migration 0005. It adds `billing_subscription.paid_through_at` and one-time `billing_trial` state; historical migrations remain immutable.

## Framework/runtime documentation used

Implementation-sensitive behavior was checked against current documentation during Phase 07A:

- Better Auth `/better-auth/better-auth/v1.6.23`: Google `socialProviders.google`, Better Auth callback handling, `signIn.social({ provider, callbackURL })`, and default account-linking behavior;
- Next.js `/vercel/next.js/v16.2.9`: App Router `searchParams` Promise behavior and typed `Route` usage for validated dynamic navigation;
- Playwright `/microsoft/playwright/v1.58.2`: browser-associated same-origin request/cookie behavior used for deterministic callback coverage;
- current Cloudflare Workers/D1 documentation: prepared/guarded statements, D1 mutation metadata, and local persistence/migration behavior.

## Final command/gate contract

The closure acceptance set is represented by the repository scripts/workflow and includes the requested command families:

```text
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

`verify:phase07a` itself runs the inherited Phase 07→01 regression plus Phase 07A-specific foundation/unit/D1/lint/typecheck/Playwright/Next/vinext coverage. The GitHub workflow independently repeats built-Worker smoke after a vinext build.

## Closure and portable artifact

The closure workflow packages exact merged `GITHUB_SHA` as `found-calc-phase-07a-commercial-auth-amendment.zip`, writes `SHA256SUMS`, checks extraction/required files, rejects generated/local secret-bearing state, and records exact source commit/tree/archive checksum in `ARTIFACT_VERIFICATION.txt`.

Historical Phase 07 artifact provenance remains pinned to canonical SHA `8f19b1e13d20b0d896f65ecb6b5cedaa807b98b4`; its workflow is manual-only so later source cannot be republished under the Phase 07 artifact name.

Final closure-head PR run, merge SHA, post-merge artifact run/artifact ID, and checksum are external GitHub execution evidence verified after their respective operations rather than hardcoded into this pre-merge source document.
