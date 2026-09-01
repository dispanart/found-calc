# Found Calc Phase 07B — Widget Platform Foundation

**Project:** Found Calc  
**Phase state:** CLOSED — exact-head verification, merge, and post-merge artifact verification complete  
**Last canonical completed phase:** Phase 07B — Widget Platform Foundation  
**Canonical predecessor:** Phase 07A merge SHA `d54344e8e207a6a03c1f68d2f7ac16e6e4d77a44`  
**Phase 07B feature merge SHA:** `a879f75200cf2c9f25283954d5c85d2aa0f7f8c9`  
**Next phase:** Phase 08 — Frozen V1 Catalog Production  
**Closure date:** 2026-09-01

## Canonical artifact

`found-calc-phase-07b-widget-platform-foundation.zip`

GitHub `main` remains the collaborative canonical repository. `.github/workflows/phase-07b-baseline-artifact.yml` archives the exact closure-record `GITHUB_SHA` with `git archive`, writes `SHA256SUMS`, verifies ZIP integrity/extraction/required files, rejects generated or local secret-bearing state, and records source commit/tree/checksum provenance in `ARTIFACT_VERIFICATION.txt`.

Phase 07A provenance remains canonical at predecessor merge SHA `d54344e8e207a6a03c1f68d2f7ac16e6e4d77a44` with `found-calc-phase-07a-commercial-auth-amendment.zip`. Historical Phase 01–07A architecture, migrations, provider identities, deterministic truth, auth/persistence, workspace, billing, trial, cancellation paid-through, and Google guest-claim behavior remain preserved.

## Phase 07B boundary

Phase 07B adds a hosted-iframe Widget Platform Foundation for the existing Discount, Business Margin/Profit, and synthetic rule-aware reference calculators. It does not add new calculator formulas and does not duplicate engine or rule truth.

Stable invariant:

```text
same calculator truth, different delivery surface
```

`@found-calc/engine` remains deterministic calculation truth. `@found-calc/rules` remains rule/version truth. First-party D1 remains application authorization/configuration truth.

## Widget commercial contract

### Friends

- 1 effective verified domain;
- mandatory persistent `Powered by Found Calc` attribution;
- server/domain enforcement, not UI-only enforcement;
- downgrade never deletes owned widget/domain configuration.

### Besties

- up to 3 effective verified domains;
- attribution removal where entitlement permits;
- bounded theme/customization contract;
- standard aggregate widget analytics.

### Family

- current Phase 07B server-authoritative limit: 10 effective verified domains;
- white-label/no-attribution entitlement;
- advanced aggregate analytics entitlement boundary.

Family Portfolio runtime, bulk developer platform, public headless Calculation API, SDK, CMS plugins, Web Components, arbitrary customer JavaScript/CSS/HTML, widget authentication, and payment checkout inside widgets are **not** Phase 07B runtime scope.

## Domain and embed security contract

Production customer origins are HTTPS only. Non-default production ports, credentials/userinfo, malformed origins, path/query/fragment-bearing origins, production localhost/loopback, and unauthorized domains are rejected.

Exact subdomains are independent except the explicit apex/`www` pair rule. Production verification is DNS TXT. Development verification is restricted to configured loopback origins (`localhost`, `127.0.0.1`, `::1`) and configured ports.

The public widget key is browser-visible, opaque, rotatable, revocable, and generated with cryptographic entropy; it is not treated as a secret.

Embed security is defense in depth:

- `apps/web/src/proxy.ts` isolates the embed origin and emits route-specific framing policy;
- direct/unresolved embed access is deny-framed by default;
- authorized embeds receive dynamic CSP `frame-ancestors` for the effective verified parent origin;
- the embed runtime independently re-resolves widget/domain/entitlement authorization;
- unavailable/unauthorized states do not disclose sensitive configuration details.

## Loader and messaging contract

`apps/web/public/embed.js` is a small dependency-free host loader. It creates the hosted iframe for an opaque public widget key and does not embed calculation truth.

The public message protocol is child→parent only:

```text
foundcalc:ready
foundcalc:resize
```

There are no calculator-input messages, result messages, parent commands, arbitrary execution messages, or widget-side auth messages. Parent messaging uses exact target origins rather than wildcard target origins.

## Shared calculator surface

Public calculator routes and hosted widgets render through the shared calculator surface/renderer registry so the three Phase 07B reference calculators keep one interaction/calculation path. Widget state is memory-only: widgets do not expose Saved Calculation, workspace/project controls, local drafts, or Better Auth dependency.

ID/EN content, trust/source labels, warnings, provenance, keyboard/focus behavior, and responsive/reflow behavior remain preserved.

## Persistence and downgrade

Migration `0006_phase07b_widget_platform.sql` is additive. Migrations `0001`–`0005` remain immutable.

Widget/domain/configuration ownership survives downgrade. When entitlement shrinks, deterministic effective-domain selection restricts active capability while preserving stored rows/configuration for later restoration or user management. No downgrade path deletes user configuration merely because a plan changed.

## Analytics and privacy

Widget analytics are first-party aggregate operational/product events only. They do not store raw calculator input values or expose a headless calculation-results feed. Analytics capability follows the effective commercial tier.

## Verification

Authoritative Phase 07B evidence is recorded in `docs/verification/phase-07b-verification.md`.

The final Phase 07B PR head `8f83df05e6356b06cff989785a9269ef2c3dfbe3` passed fresh full verification in GitHub Actions run `33466830033`, including inherited Phase 07A verification and built-Worker smoke, before merge. The feature merge landed on `main` as `a879f75200cf2c9f25283954d5c85d2aa0f7f8c9`, and the post-merge baseline artifact workflow completed successfully before this closure record was finalized.

`pnpm verify:phase07b` starts with the complete `pnpm verify:phase07a` regression chain, then runs Phase 07B foundation/unit/Cloudflare gates, lint, typecheck, browser regression, deterministic repeated widget runtime/accessibility browser tests, Next build, vinext compatibility/build, and Worker smoke.

## Preserved security and trust boundaries

- Phase 01–07A deterministic engine/rules/auth/persistence/workspace/billing behavior is not reopened;
- checkout redirects never grant entitlement;
- first-party D1 remains ordinary entitlement/access authority;
- Google and payment credentials remain server-only;
- raw sensitive calculator values are not added to widget analytics;
- no secrets/local state/generated dependency directories are included in canonical artifacts;
- ID/EN, accessibility, privacy/trust, mobile responsiveness, and the Rp0 fixed-infrastructure target (excluding domain/payment transaction fees) remain preserved.

## Next phase

Phase 07B is CLOSED. Phase 08 — Frozen V1 Catalog Production may begin only in a **new chat** from the latest verified `found-calc-phase-07b-widget-platform-foundation.zip`. Phase 08 is not implemented in the Phase 07B closure chat.