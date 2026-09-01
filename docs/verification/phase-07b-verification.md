# Found Calc Phase 07B Verification

**Project:** Found Calc  
**Phase:** 07B — Widget Platform Foundation  
**Status:** CLOSURE CANDIDATE; merge requires fresh exact closure-head green verification, security checks, and built-Worker smoke  
**Verification date:** 2026-09-01  
**Canonical predecessor:** Phase 07A merge SHA `d54344e8e207a6a03c1f68d2f7ac16e6e4d77a44`

## Verification boundary

The authoritative PR gate is `.github/workflows/phase-07b-verification.yml`. `pnpm verify:phase07b` is a strict superset whose first gate is `pnpm verify:phase07a`, followed by Phase 07B foundation/unit/Cloudflare coverage, lint, TypeScript, browser regression, repeated widget runtime/accessibility browser coverage, Next build, vinext compatibility/build, and Worker smoke.

Phase 07B adds only migration `0006_phase07b_widget_platform.sql`; migrations `0001` through `0005` remain canonical and immutable.

## Pre-closure exact-head evidence

Implementation head `fd350a2e366825675967282c5b321ad5eb0f7bff` was re-inspected before closure. GitHub Actions run `33410382343` had an initial attempt in which only the Phase 07B verification job failed while Worker build/smoke isolation passed. A rerun on the **same SHA** completed the Phase 07B verification job and Worker build/smoke successfully.

Because the initial verification failure was not reproducible on the identical source SHA and the available historical log did not establish a deterministic product defect, it is recorded as a non-reproduced CI failure rather than silently labelled a code bug or flake. Closure does not rely on that rerun: a fresh full gate on the exact final closure head is required after all closure/security corrections.

## Security-review correction

GitGuardian reported a Generic Password false positive on direct reads of the WHATWG `URL.password` property in widget origin validation. The value was not a committed credential; the code was rejecting URL userinfo. The closure correction preserves credential/userinfo rejection while detecting userinfo in the URL authority before WHATWG parsing, avoiding direct credential-bearing property access. Foundation and widget-domain tests protect both the security behavior and scanner-compatible source boundary.

No secret-scanning failure may be ignored merely to merge. The exact final head must have clean GitHub checks.

## Widget platform scope verified by the implementation contract

Phase 07B is limited to the hosted-iframe Widget Platform Foundation:

- shared calculator renderer for the existing Discount, Business Margin/Profit, and synthetic rule-aware calculator slices;
- canonical public embed route keyed by an opaque rotatable public widget key;
- Friends / Besties / Family widget entitlement enforcement at server/domain boundaries;
- D1-backed widget configuration, verified-domain lifecycle, key rotation/revocation, and aggregate analytics;
- production DNS TXT domain verification plus bounded loopback-only development behavior;
- dedicated embed-origin isolation, dynamic CSP `frame-ancestors`, defense-in-depth runtime authorization, and generic unavailable responses;
- dependency-free host loader and child→parent-only `foundcalc:ready` / `foundcalc:resize` protocol with exact-target messaging;
- accessible/reflow-safe workspace management, preview, and embedded calculator surfaces;
- non-destructive downgrade semantics: configuration and ownership are preserved while excess capability is disabled.

Explicitly excluded: Phase 08 catalog production, Family Portfolio runtime, arbitrary CSS/HTML/JavaScript, Web Components, public headless Calculation API, SDK, CMS plugins, widget auth, and payment checkout inside widgets.

## Security and domain gates

The Phase 07B test/CI contract covers:

- HTTPS-only production origins and rejection of credentials, path/query/fragment, disallowed ports, malformed hosts, and production loopback;
- exact subdomain identity with the approved apex/`www` pair rule;
- DNS TXT challenge verification, expiry/throttle behavior, and exact token matching;
- effective verified-domain limits and deterministic downgrade selection;
- direct embed route deny-framing by default and authorized dynamic `frame-ancestors`;
- loader source/host constraints, exact-target `postMessage`, no parent commands, and no input/result messages;
- public-key rotation/revocation and generic unavailable behavior;
- analytics payload restrictions that do not contain raw calculator input values.

## Accessibility and browser gates

The full verifier runs the ordinary Playwright regression and then repeats the Phase 07B widget runtime and accessibility specifications with `--retries=0 --repeat-each=2`. Coverage includes keyboard/focus behavior, 390px reflow/no horizontal overflow, iframe lifecycle sizing, attribution behavior, embed security, and parity with the public calculator renderer.

## Required final gate

The exact final closure head must pass the repository contract, including:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:engine
pnpm test:rules
pnpm test:catalog
pnpm verify:phase07a
pnpm verify:phase07b
pnpm build
pnpm --filter @found-calc/web vinext:check
pnpm --filter @found-calc/web build:vinext
```

`pnpm verify:phase07b` additionally exercises the Phase 07B Cloudflare/D1 tests, widget domain/runtime/security tests, downgrade tests, browser repeat, accessibility/reflow, and `scripts/smoke-phase-07b-worker.sh`.

## Closure and portable artifact

After merge, `.github/workflows/phase-07b-baseline-artifact.yml` packages exact merged `GITHUB_SHA` as `found-calc-phase-07b-widget-platform-foundation.zip`, writes `SHA256SUMS`, verifies ZIP integrity/extraction/required files, rejects generated/local secret-bearing state, and records source commit/tree/archive checksum in `ARTIFACT_VERIFICATION.txt`.

Final closure-head run IDs, exact final branch SHA, merge/main SHA, post-merge artifact run/artifact ID, and checksum are GitHub execution evidence verified after their respective operations rather than fabricated in this pre-merge source record.