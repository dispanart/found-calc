# Found Calc Phase 07 Verification

**Project:** Found Calc  
**Phase:** 07 — Billing, Entitlements & Xendit  
**Status:** IMPLEMENTED; final closure-head CI and merge evidence pending  
**Verification date:** 2026-08-29

## Verification boundary

The Phase 07 merge gate is `.github/workflows/phase-07-verification.yml`. It applies the complete `0001` through `0004` D1 migration chain, runs `pnpm verify:phase07`, and smoke-tests the built vinext Worker with synthetic non-production billing configuration.

`verify:phase07` is intentionally a Phase 06 superset. It runs dependency-free contracts, rule checks, web unit tests, Cloudflare/D1 tests, lint, TypeScript, Playwright, Next.js and vinext builds, then the full inherited `verify:phase06` regression gate.

## Security and trust contracts under verification

- Xendit API credentials and webhook token remain server-only.
- Production commercial terms are not committed; CI uses a clearly synthetic plan fixture.
- Billing status and entitlement resolution read first-party state only and do not query Xendit.
- Browser checkout return state cannot activate entitlement.
- Webhooks authenticate with `x-callback-token` before body processing, validate amount/currency against the server plan, and apply through an idempotent D1 inbox.
- Duplicate and stale provider events cannot regress newer or terminal first-party subscription state.
- Cancellation selects the provider plan from authenticated D1 state, never from browser input, and preserves local access until provider inactivation is confirmed.
- Public calculator arithmetic and Phase 04–06 persistence/rule/workspace boundaries remain unchanged.

## Coverage added in Phase 07

- strict billing plan configuration and pure entitlement unit contracts;
- D1 migration/repository tests for checkout correlation, user isolation, webhook dedupe, stale-event protection, and cancellation timestamps;
- Xendit hosted subscription session/deactivation adapter tests and current recurring webhook normalization tests;
- HTTP boundary tests for authentication, body limits, first-party commercial validation, provider failure normalization, and no-store responses;
- ID/EN billing client/UI contracts plus 390 px Playwright coverage;
- built-Worker smoke for signed-out billing authorization, callback-token rejection, authenticated plan/status reads, and the full `0001` → `0004` migration chain.

Final GitHub Actions run IDs, exact verified head SHA, review findings, merge SHA, and canonical artifact verification are recorded during Phase 07 closure after the final head is green.
