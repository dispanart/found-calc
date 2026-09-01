# Found Calc — Phase Handoff

**Project:** Found Calc  
**Last canonical completed phase:** Phase 07B — Widget Platform Foundation  
**Current status:** CLOSURE CANDIDATE; canonical only after exact-head green merge + artifact verification  
**Canonical predecessor:** Phase 07A merge SHA `d54344e8e207a6a03c1f68d2f7ac16e6e4d77a44`  
**Next phase after closure:** Phase 08 — Frozen V1 Catalog Production

## Canonical starting artifact

After Phase 07B closure, start the next phase from:

`found-calc-phase-07b-widget-platform-foundation.zip`

The artifact is produced from the exact merged `main` SHA by `.github/workflows/phase-07b-baseline-artifact.yml`, with `SHA256SUMS` and `ARTIFACT_VERIFICATION.txt` recording integrity, extraction, source commit/tree, and archive provenance.

Do not use the old Phase 07A ZIP as the Phase 08 starting point once Phase 07B is canonical.

## Required reading order for the next phase

1. `BASELINE.md`
2. `PHASE_HANDOFF.md`
3. `docs/verification/phase-07b-verification.md`
4. `docs/verification/phase-07a-verification.md`
5. `docs/superpowers/specs/2026-08-31-found-calc-phase-07b-widget-platform-foundation-design.md`
6. `docs/superpowers/plans/2026-08-31-found-calc-phase-07b-widget-platform-foundation-implementation-plan.md`
7. approved Master Product & Architecture Design Spec
8. Tech Stack ADR
9. Design System Decision / accessibility-responsive contract
10. canonical Phase Workflow and exact next-phase acceptance criteria/exclusions

## Stable Phase 07B contracts to preserve

- `@found-calc/engine` remains the sole deterministic calculation truth; widgets do not copy formulas or rounding.
- `@found-calc/rules` remains rule/version truth; widgets do not fork rule payloads or resolution logic.
- Public calculators and widgets share the calculator surface/renderer path for the Phase 07B reference slices.
- Widget state is memory-only; no Saved Calculation/workspace/project controls or Better Auth dependency inside public widgets.
- Friends: 1 effective verified domain and mandatory persistent `Powered by Found Calc` attribution.
- Besties: up to 3 effective verified domains, bounded customization, optional attribution removal, standard aggregate analytics.
- Family: current server-authoritative limit 10 effective verified domains, white-label/no-attribution entitlement, advanced aggregate analytics boundary.
- Downgrade restricts capability while preserving ownership/configuration; it never deletes excess widget/domain data.
- Production domains are HTTPS-only, DNS-TXT verified, and exact-subdomain scoped except the explicit apex/`www` pair rule.
- Local development exceptions are limited to configured loopback hosts/ports.
- Public widget keys are opaque/rotatable/revocable identifiers, not secrets.
- Dynamic `frame-ancestors` and embed-origin isolation are enforced at the server boundary and rechecked by the runtime.
- Host protocol is child→parent only: `foundcalc:ready` and `foundcalc:resize`; no calculator input/result messages or parent commands.
- Widget analytics do not contain raw calculator input values.
- Migration `0006_phase07b_widget_platform.sql` is additive; migrations `0001`–`0005` remain immutable.

## Phase 01–07A contracts still authoritative

Preserve deterministic engine/rule truth, guest/local/auth state semantics, Goals/Projects/Profiles/Workspace authorization and privacy, Xendit webhook/idempotency/provider identity, Friends/Besties/Family commercial mapping, one-time 14-day Besties trial, cancellation paid-through access, Google Better Auth flow, safe localized auth-return targets, guest claim continuity, and non-destructive Friends persistence limits.

## Explicit scope guard

Phase 07B did **not** implement Phase 08 catalog production, Family Portfolio runtime, public headless Calculation API, SDK, CMS plugins, Web Components, arbitrary customer JavaScript/CSS/HTML, widget authentication, or widget payment checkout. Do not retroactively treat those as Phase 07B features.

## Starter prompt for the next phase

```text
@Superpowers @GitHub @Context7

Start the next approved Found Calc phase from the attached canonical `found-calc-phase-07b-widget-platform-foundation.zip`.

Before implementation:
1. Read BASELINE.md and PHASE_HANDOFF.md.
2. Read docs/verification/phase-07b-verification.md and the approved Phase 07B design/implementation plan.
3. Preserve Phase 01–07B deterministic truth, auth/persistence, workspace, billing, commercial, and Widget Platform security/runtime contracts.
4. Confirm the exact next-phase acceptance criteria and exclusions before implementation.
5. Do not reopen Phase 01–07B without a verified blocker under change control.
6. Use current framework/provider documentation and Superpowers TDD/systematic-debugging/verification-before-completion as required.
7. Preserve ID/EN, accessibility, privacy/trust, mobile responsiveness, and the Rp0 fixed-infrastructure target excluding domain/payment transaction fees.
```

## Change control

If a later phase conflicts with approved Phase 01–07B contracts, capture reproducible evidence, identify the smallest compatible amendment, and obtain approval before changing deterministic truth, persistence, security, authentication, billing, entitlement, widget-domain, framing, messaging, or data-retention boundaries.

Phase 08 must begin in a fresh chat only after the Phase 07B merge SHA and canonical artifact checksum are verified.