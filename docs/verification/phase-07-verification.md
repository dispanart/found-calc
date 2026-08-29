# Found Calc Phase 07 Verification

**Project:** Found Calc  
**Phase:** 07 — Billing, Entitlements & Xendit  
**Status:** CLOSURE CANDIDATE; merge requires fresh exact-head green verification and built-Worker smoke  
**Verification date:** 2026-08-29

## Verification boundary

The Phase 07 merge gate is `.github/workflows/phase-07-verification.yml`. It applies the complete `0001` through `0004` D1 migration chain, runs `pnpm verify:phase07`, and independently builds/smoke-tests the vinext Worker with synthetic non-production billing configuration.

`verify:phase07` is intentionally a Phase 06 superset. It runs dependency-free contracts, rule checks, web unit tests, Cloudflare/D1 tests, lint, TypeScript, Playwright, Next.js and vinext builds, then the full inherited `verify:phase06` regression gate.

## Verified implementation milestone

A pre-closure implementation milestone was green before final review hardening:

- SHA: `4b0a50efbe8411bb16b35ab88fcab00fd7b1cfce`
- GitHub Actions run: `33263359788`
- full verification job: `99129009378` — **SUCCESS**
- built Worker smoke job: `99129009441` — **SUCCESS**

Final review subsequently identified and corrected two additional reliability boundaries described below. Those changes must receive their own fresh exact-head green Phase 07 run before merge; the earlier milestone is historical evidence, not authorization to merge a later head.

## Security and trust contracts under verification

- Xendit API credentials and webhook token remain server-only.
- Approved V1 commercial coordinates are pinned: Free Rp0; Pro Rp25.000/month and Rp250.000/year; Business Rp75.000/month and Rp750.000/year.
- Billing status and entitlement resolution read first-party state only and do not query Xendit.
- Browser checkout return state cannot activate entitlement.
- Webhooks authenticate with `x-callback-token` before payload mutation, validate commercial coordinates, normalize supported provider fields, and apply through an idempotent D1 inbox.
- Duplicate and stale provider events cannot regress newer or terminal first-party subscription state.
- Upgrade/downgrade stages a first-party target and promotes target capabilities only after matching authoritative successful-cycle reconciliation; retry/failed events do not grant target capabilities.
- Cancellation selects provider identity from authenticated D1 state, never from browser input, and preserves local access until provider inactivation is confirmed.
- Public calculator arithmetic and Phase 04–06 persistence/rule/workspace boundaries remain unchanged.

## Coverage added in Phase 07

- strict canonical commercial-plan validation and pure entitlement contracts;
- monthly + annual cadence coverage, with annual encoded as `MONTH` + `intervalCount: 12`;
- D1 migration/repository tests for checkout correlation, user isolation, webhook dedupe, stale-event protection, pending plan changes, authoritative promotion, and cancellation timestamps;
- Xendit hosted subscription session, recurring plan update/deactivation adapter, and recurring webhook normalization tests;
- HTTP boundary tests for authentication, body limits, first-party commercial validation, provider failure normalization, no-store responses, plan change, cancellation, duplicate/delayed webhook behavior, and checkout-return non-authority;
- explicit regression tests for ambiguous provider plan-update outcomes;
- ID/EN billing client/UI contracts plus 390px Playwright coverage;
- built-Worker smoke for Worker startup, signed-out billing authorization, callback-token rejection, Better Auth signup/cookie flow, authenticated plan/status reads, and the full `0001` → `0004` migration chain.

## Provider plan-update ambiguity hardening

Final review found a distributed-state ambiguity in upgrade/downgrade. The old sequence staged `pendingPlanId`, sent a PATCH to the Xendit recurring plan, and cleared the pending target on every thrown provider error. A transport reset, timeout, HTTP 408, or provider 5xx cannot prove that the PATCH was not accepted; clearing the target in that case could make the subsequent authoritative successful-cycle webhook fail commercial validation because first-party state no longer recognized the new amount.

The hardened adapter classifies provider mutation outcomes:

- local validation failure and ordinary provider 4xx are definite rejection and may clear the staged target;
- transport/timeout, HTTP 408, provider 5xx, or malformed success response are ambiguous and preserve `pendingPlanId`;
- authoritative webhook reconciliation remains the only path that promotes the pending target and its capabilities.

Regression tests are `apps/web/src/lib/xendit/client-ambiguity.test.ts` and `apps/web/src/lib/billing/plan-change-ambiguity.test.ts`.

## Worker smoke false-positive/false-negative hardening

An earlier workflow placed a signup assertion directly in a `curl ... | grep -Fq '"user"'` pipeline while `set -euo pipefail` was active. `grep -q` can exit as soon as it finds a match and close the pipe; `curl` can then receive a write failure and exit `23`, making the workflow red although the HTTP request succeeded. The corrected smoke stores responses first and checks status/body separately.

A later exact-head run then repeatedly exposed a separate local-runtime issue after successful Worker startup, migrations, anonymous authorization, webhook rejection, and signup: Miniflare returned HTTP 500 with the exact internal body `Error: Network connection lost.` while proxying the authenticated status request. This signature originates from the local Wrangler/Miniflare runtime rather than a Found Calc billing error response.

The final smoke harness therefore:

1. uses named checkpoints: `worker-startup`, `anonymous-status`, `invalid-webhook`, `auth-signup`, and `authenticated-status`;
2. emits sanitized GitHub diagnostics and redacts auth/provider secrets, cookies, and password-like material;
3. retries at most three times with a two-second delay only when HTTP status is exactly 500 **and** the response body contains the exact local Miniflare signature `Error: Network connection lost.`;
4. does not retry arbitrary 500s or Found Calc application error payloads;
5. keeps signup non-retried because it is a mutating operation;
6. runs as a dedicated parallel CI job so deployment-like failures surface early without weakening the full verification gate.

The bounded retry is a CI/local-runtime tolerance, not production application retry behavior.

## Current tooling verification

Context7 was used against current `/cloudflare/workers-sdk` documentation. Current Wrangler supports `wrangler dev --persist-to <directory>` for custom local persistence; D1 local migration tooling likewise supports `--local --persist-to`, and local development variables may override configured bindings. Phase 07 therefore retains the supported Wrangler local-runtime/D1 model rather than introducing a custom deployment workaround.

## Canonical closure contract

`.github/workflows/phase-07-baseline-artifact.yml` packages the exact merged `GITHUB_SHA` as `found-calc-phase-07-billing-entitlements-xendit.zip`, writes `SHA256SUMS`, extracts and checks required Phase 07 files including ambiguity regressions and Worker-smoke contracts, rejects generated/dependency directories, records source commit/tree identity in `ARTIFACT_VERIFICATION.txt`, and uploads the verified portable baseline.

Final PR number, merge SHA, exact final green run/jobs, post-merge artifact run, artifact ID, and checksum are external GitHub execution evidence and are verified after merge rather than hardcoded into this pre-merge source document.