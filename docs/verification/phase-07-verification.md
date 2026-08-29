# Found Calc Phase 07 Verification

**Project:** Found Calc  
**Phase:** 07 — Billing, Entitlements & Xendit  
**Status:** VERIFIED FOR CLOSURE; final merged identity is recorded by the canonical artifact workflow  
**Verification date:** 2026-08-29

## Verification boundary

The Phase 07 merge gate is `.github/workflows/phase-07-verification.yml`. It applies the complete `0001` through `0004` D1 migration chain, runs `pnpm verify:phase07`, and independently builds/smoke-tests the vinext Worker with synthetic non-production billing configuration.

`verify:phase07` is intentionally a Phase 06 superset. It runs dependency-free contracts, rule checks, web unit tests, Cloudflare/D1 tests, lint, TypeScript, Playwright, Next.js and vinext builds, then the full inherited `verify:phase06` regression gate.

## Fresh implementation-head evidence

Exact verified source before continuity closure:

- SHA: `4b0a50efbe8411bb16b35ab88fcab00fd7b1cfce`
- GitHub Actions run: `33263359788`
- full verification job: `99129009378` — **SUCCESS**
- built Worker smoke job: `99129009441` — **SUCCESS**

The full job completed `Run Phase 07 verification gate` successfully. The separate Worker job completed both `Build vinext Worker` and `Run deterministic Worker smoke` successfully. A new closure-head run is required after baseline/handoff/artifact metadata is committed; merge is forbidden unless that exact closure head is also green.

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
- ID/EN billing client/UI contracts plus 390px Playwright coverage;
- built-Worker smoke for Worker startup, signed-out billing authorization, callback-token rejection, Better Auth signup/cookie flow, authenticated plan/status reads, and the full `0001` → `0004` migration chain.

## Worker smoke false-negative diagnosis and regression prevention

An earlier workflow placed a signup assertion directly in a `curl ... | grep -Fq '"user"'` pipeline while `set -euo pipefail` was active. `grep -q` can exit as soon as it finds a match and close the pipe; `curl` can then receive a write failure and exit `23`, making the workflow red although the HTTP request succeeded.

The corrected smoke implementation:

1. stores each HTTP response before matching;
2. evaluates status code and body independently;
3. uses named checkpoints: `worker-startup`, `anonymous-status`, `invalid-webhook`, `auth-signup`, and `authenticated-status`;
4. emits GitHub error annotations only after sanitizing diagnostics;
5. redacts Better Auth secret, Xendit webhook token, cookies, password-like fields, and related credential material;
6. runs in a separate CI job so deployment-like failures surface early without weakening the full verification gate.

The exact implementation head above passed the corrected smoke.

## Current tooling verification

Context7 was used against current `/cloudflare/workers-sdk` documentation. The current Wrangler command definition supports `wrangler dev --persist-to <directory>` for custom local persistence; D1 local migration tooling likewise supports `--local --persist-to`. Current Wrangler development variable loading also supports `.dev.vars` / environment overrides of configured vars. Phase 07 therefore retains the supported Wrangler local-runtime model rather than introducing a custom D1/runtime workaround.

## Canonical closure contract

`.github/workflows/phase-07-baseline-artifact.yml` packages the exact merged `GITHUB_SHA` as `found-calc-phase-07-billing-entitlements-xendit.zip`, writes `SHA256SUMS`, extracts and checks required Phase 07 files, rejects generated/dependency directories, records source commit/tree identity in `ARTIFACT_VERIFICATION.txt`, and uploads the verified portable baseline.

Final PR number, merge SHA, post-merge artifact run, artifact ID, and checksum are external GitHub execution evidence and are verified after merge rather than hardcoded into this pre-merge source document.
