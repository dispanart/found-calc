# Found Calc Phase 07B Verification

**Project:** Found Calc  
**Phase:** 07B — Widget Platform Foundation  
**Status:** CLOSED — exact-head verification, security checks, merge, built-Worker smoke, and post-merge canonical artifact verification complete  
**Verification date:** 2026-09-01  
**Canonical predecessor:** Phase 07A merge SHA `d54344e8e207a6a03c1f68d2f7ac16e6e4d77a44`

## Verification boundary

The authoritative PR gate is `.github/workflows/phase-07b-verification.yml`. `pnpm verify:phase07b` is a strict superset whose first gate is `pnpm verify:phase07a`, followed by Phase 07B foundation/unit/Cloudflare coverage, lint, TypeScript, browser regression, repeated widget runtime/accessibility browser coverage, Next build, vinext compatibility/build, and Worker smoke.

Phase 07B adds only migration `0006_phase07b_widget_platform.sql`; migrations `0001` through `0005` remain canonical and immutable.

## Pre-closure exact-head evidence

Implementation head `fd350a2e366825675967282c5b321ad5eb0f7bff` was re-inspected before closure. GitHub Actions run `33410382343` had an initial attempt in which only the Phase 07B verification job failed while Worker build/smoke isolation passed. A rerun on the **same SHA** completed the Phase 07B verification job and Worker build/smoke successfully.

Because the initial verification failure was not reproducible on the identical source SHA and the available historical log did not establish a deterministic product defect, it is recorded as a non-reproduced CI failure rather than silently labelled a code bug or flake. Closure does not rely on that rerun: a fresh full gate on the exact final closure head was required after all closure/security corrections.

## Historical verification contract correction

Fresh verification later exposed two inherited historical assertions that coupled completed Phase 07 and Phase 07A provenance to the mutable current `BASELINE.md`/handoff state. That assumption becomes false whenever a legitimate successor phase advances the current baseline. The regression was corrected narrowly in the historical foundation contract tests so Phase 07 and Phase 07A closure provenance is anchored in their immutable verification/artifact records rather than requiring the active baseline to remain on an older phase.

The correction was test-only and did not change Phase 01–07B runtime behavior.

## Security-review correction

GitGuardian reported a Generic Password false positive on direct reads of the WHATWG `URL.password` property in widget origin validation. The value was not a committed credential; the code was rejecting URL userinfo. The closure correction preserves credential/userinfo rejection while detecting userinfo in the URL authority before WHATWG parsing, avoiding direct credential-bearing property access. Foundation and widget-domain tests protect both the security behavior and scanner-compatible source boundary.

No secret-scanning failure was ignored to merge. The exact final Phase 07B head completed clean security checks.

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

The exact final closure head passed the repository contract, including:

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

## Final closure execution evidence

The final Phase 07B implementation head was:

`8f83df05e6356b06cff989785a9269ef2c3dfbe3`

Fresh GitHub Actions Phase 07B Verification run `33466830033` completed successfully on that exact head. Both authoritative jobs were green:

- `Verify Phase 07B widget platform and inherited boundaries` — SUCCESS;
- `Smoke-test built vinext Worker Phase 07B embed isolation` — SUCCESS.

PR #15 then merged to `main` as:

`a879f75200cf2c9f25283954d5c85d2aa0f7f8c9`

The first post-merge Phase 07B Canonical Baseline workflow run was `33468004716`, and it completed successfully. GitHub Actions artifact ID `9785529661` contained:

- `found-calc-phase-07b-widget-platform-foundation.zip`;
- `SHA256SUMS`;
- `ARTIFACT_VERIFICATION.txt`.

For that feature-merge artifact, provenance was:

```text
source_commit=a879f75200cf2c9f25283954d5c85d2aa0f7f8c9
source_tree=1a58a74a21475637a0c9b8e147f5a7bc17f799f2
archive_provenance=git-archive-exact-github-sha
archive_sha256=a0116ba71aaa5709994cd713fe2b5a8e3caf92f9c7f6c337aadc6aa170f244bc
zip_integrity=PASS
required_files=35
extraction_verification=PASS
secret_file_check=PASS
```

Independent `sha256sum -c SHA256SUMS` verification returned `found-calc-phase-07b-widget-platform-foundation.zip: OK`.

This closure record itself is intentionally committed after that evidence exists. Because `.github/workflows/phase-07b-baseline-artifact.yml` packages the exact `main` `GITHUB_SHA`, merging this closure-only documentation amendment must trigger one final canonical repack. That final closure-record artifact execution is external GitHub evidence and does not create a self-referential source-edit/checksum loop.

## Closure and portable artifact

`.github/workflows/phase-07b-baseline-artifact.yml` packages the exact canonical `main` `GITHUB_SHA` as `found-calc-phase-07b-widget-platform-foundation.zip`, writes `SHA256SUMS`, verifies ZIP integrity/extraction/required files, rejects generated/local secret-bearing state, and records source commit/tree/archive checksum in `ARTIFACT_VERIFICATION.txt`.

Phase 07B is CLOSED only with a successful final artifact run for the canonical closure-record `main` SHA. Phase 08 must start from that latest verified closure artifact, not from an older Phase 07A or pre-closure Phase 07B archive.