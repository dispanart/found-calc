# Found Calc Phase 04 — Persistence, Auth & Guest Preservation

**Project:** Found Calc  
**Phase state:** COMPLETE  
**Last canonical completed phase:** Phase 04 — Persistence, Auth & Guest Preservation  
**Next phase:** Phase 05 — exact approved title/scope must be resolved from the canonical Phase Workflow before implementation  
**Completion date:** 2026-08-29

## Canonical artifact

`found-calc-phase-04-persistence-auth-guest-preservation.zip`

GitHub `main` is the collaborative canonical repository. The Phase 04 post-merge baseline workflow packages the exact merged closure tree with `git archive`, writes `SHA256SUMS`, verifies extraction and required files, and records the exact source commit/tree in `ARTIFACT_VERIFICATION.txt`. The ZIP is the portable recovery/handoff copy for the next phase chat.

## Completed deliverables

Phase 04 adds durable draft persistence and authentication without moving calculation truth out of the local deterministic runtime:

- the existing Cloudflare D1 `DB` binding now has a checked-in migration for Better Auth core tables (`user`, `session`, `account`, `verification`) and a deliberately narrow `calculator_state` table;
- `calculator_state` persists at most one latest validated canonical input draft per owner/calculator and stores no localized number strings, rendered results, passwords, tokens, telemetry, billing data, or formula output;
- Drizzle ORM provides typed read/upsert/delete/list/guest-claim repository operations while `@found-calc/engine` remains formula truth and `@found-calc/rules` remains rule-resolution truth;
- unauthenticated persisted state uses a random opaque `found_calc_guest` HttpOnly, SameSite=Lax, Path=/ cookie created only on a guest persistence mutation;
- Better Auth 1.6.29 provides D1-backed email/password sign-up, sign-in, sign-out, and session retrieval; OAuth, email delivery, organizations, roles, passkeys/2FA, billing plugins, and production secret provisioning remain out of scope;
- first-party state routes provide GET/PUT/DELETE for the three reference calculator drafts plus POST guest claim, with strict calculator/version/state validation, a 16 KiB boundary, stable generic error codes, and no server-side calculation;
- browser `localStorage` preserves unsaved in-progress UI strings across reload and ID/EN locale navigation using namespaced/schema-versioned keys, with no auth/session token stored there and no automatic network persistence on keystroke;
- all three reference calculators expose explicit Save draft, Load saved, and Delete saved controls only around validated canonical state while calculation execution remains local;
- persisted canonical numeric values are mapped back to locale display strings on load without becoming engine truth;
- successful account creation/sign-in claims guest drafts idempotently; claim failure does not roll back a valid authenticated session and remains retryable;
- `/{locale}/auth` provides accessible ID/EN email/password account UI and the header exposes account navigation without blocking public calculators;
- `/{locale}/workspace` is an auth-aware summary of the three reference draft states, not a Projects/history system;
- Phase 04 browser verification runs through vinext + Cloudflare Vite/workerd with the real `cloudflare:workers` binding while canonical Next/Turbopack retains a non-executing Node build stub only for `next build`;
- `verify:phase04` is a fail-fast superset of Phase 04 contracts/tests plus complete Phase 03, Phase 02, and Phase 01 regression gates.

## Verification status

Detailed evidence is recorded in `docs/verification/phase-04-verification.md`.

The verified final implementation snapshot before closure is:

- source SHA: `5073c3c97667775adc13708ca5507eb809895ebf`;
- implementation merge commit: `4cc9fe3c84ea56a0caf587754547da0a59a772e5`;
- GitHub Actions run: `33199332188`;
- job: `98944559520`;
- result: **SUCCESS**.

That run completed the Phase 04 gate, all inherited Phase 03/02/01 gates, Next.js production build, vinext compatibility/build, local D1 migration, guest save→claim→load/delete browser flow, and built Worker HTTP smoke. The closure PR receives a separate fresh full Phase 04 run before merge; the canonical ZIP workflow then records the exact merged closure SHA/tree dynamically.

## Stable architecture boundaries

### Engine truth

`@found-calc/engine` remains the only owner of deterministic formula truth. Persistence/auth code may validate canonical syntax/version/shape but must not calculate totals, discounts, margins, scenarios, rates, recommendations, or rule outcomes.

### Rule truth

`@found-calc/rules` remains the immutable effective-date/version resolver. Persisted synthetic-rule state contains only canonical input/date context; provenance is resolved again through the rules boundary when calculating.

### Catalog ownership

`@found-calc/catalog` continues to own stable calculator identity, slugs, localized discovery/trust copy, category metadata, and relationships. It does not own auth, persistence, billing, or formulas.

### Product runtime

`apps/web` owns locale presentation parsing/formatting, accessible calculator interaction, first-party auth/session integration, local unsaved draft preservation, and explicit persistence controls. Reference calculations remain local and deterministic and still have no server calculation API.

### Persistence/auth boundary

D1 contains Better Auth records plus validated canonical calculator draft inputs only. Guest ownership is first-party and opaque. Better Auth owns credentials/session behavior; no auth/session token is placed in localStorage.

### Next/vinext runtime boundary

Canonical `next build` aliases `cloudflare:workers` to a non-executing build stub because Node build-time evaluation has no Worker bindings. vinext explicitly overrides that Next config and uses native Cloudflare Vite/workerd bindings so D1/auth routes execute against the real Worker environment.

## Phase 04 persistence contracts

Supported persisted calculator identities remain exactly:

1. `reference.discount`
2. `reference.business-margin`
3. `reference.synthetic-rule`

The API rejects unsupported IDs/versions, unknown properties, invalid canonical decimals/dates, excessive discount arrays, and payloads over 16 KiB. Guest-to-user claim is idempotent; newer state wins and retry cannot replace a newer user draft with stale guest state.

## Accessibility, trust, and privacy contract

- launch locales remain Indonesian (`id`) and English (`en`);
- Phase 03 field-error/result accessibility behavior remains regression-covered;
- persistence announcements are polite without taking over the calculation result status region;
- local drafts survive locale navigation without silently transmitting raw input;
- save/load/delete are explicit first-party actions and the UI states that calculation remains local;
- the guest cookie is HttpOnly and unavailable to client JavaScript;
- malformed local/persisted state never overwrites valid in-progress input;
- no device fingerprinting, third-party identifier, telemetry, or raw-input logging was introduced;
- source review found no server formula duplication, browser auth-token storage, committed production secret, or Phase 05+ feature implementation.

## Known platform notes

- `apps/web/wrangler.jsonc` retains the inherited all-zero local-only D1 UUID. It is for local/test identity only and is not a deployable production database.
- `vinext check` reports **90% compatible with 0 issues**. Partial notes remain `next/font/google` CDN loading and the documented App Router `reactStrictMode` caveat.
- Cloudflare Vitest can emit a pre-build static-analysis warning for the generated vinext entry while the runtime suites and built Worker smoke still pass.
- GitHub Actions may emit Node 20 deprecation warnings for current `actions/checkout@v4` / `actions/setup-node@v4` internals even though the project job explicitly uses Node 22.
- one signed-out 390px workspace Playwright scenario hit a transient vinext `Network connection lost` on the final implementation run and passed on retry; the persistence/claim scenario passed normally and the overall verification job was green.
- Phase 04 deliberately clears generated `.next` artifacts before inherited regression gates so canonical Next and vinext type/build outputs do not contaminate one another.

## Explicitly deferred beyond Phase 04

Phase 04 does not authorize or implement:

- remote D1 creation/migration, production Cloudflare deployment, DNS, or secret mutation;
- Xendit/payment/subscription/entitlement/invoice/webhook flows;
- production tax/legal/marketplace/health/payroll/fiqh/regulatory rule packs;
- production-scale catalog/SEO publishing or Admin publishing tools;
- Goals, Projects, named calculation history, sharing, collaboration, exports, or server-side calculation replay;
- analytics, telemetry, AI explanations, OAuth providers, email verification/reset delivery, 2FA, or passkeys.

## Continuity rule

Start **Phase 05** in a **new chat inside the same Found Calc project** and attach `found-calc-phase-04-persistence-auth-guest-preservation.zip`. Also provide the canonical Phase Workflow if it is not already available in the new chat/project file context. Before planning or implementation, resolve the exact approved Phase 05 title and scope from that canonical workflow; do not infer Phase 05 work from deferred items or pull later-phase scope forward.
